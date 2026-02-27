// Gateway Module - WebSocket client for OpenClaw Gateway

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use ed25519_dalek::{Signer, SigningKey};
use futures_util::{SinkExt, StreamExt};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};
use tokio::net::TcpStream;
use tokio::sync::{mpsc, oneshot, Mutex, RwLock};
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};
use uuid::Uuid;

use crate::AppState;

// ============== Gateway Profile Types ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayProfile {
    pub id: String,
    pub name: String,
    pub url: String,
    pub token: Option<String>,
    #[serde(default = "default_canvas_port")]
    pub canvas_port: u16,
    #[serde(default)]
    pub is_default: bool,
}

fn default_canvas_port() -> u16 {
    18793
}

impl Default for GatewayProfile {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: "Default Gateway".to_string(),
            url: "ws://127.0.0.1:18789".to_string(),
            token: None,
            canvas_port: 18793,
            is_default: true,
        }
    }
}

// ============== Config Storage ==============

fn get_config_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("openclaw")
        .join("clawstation")
}

fn get_profiles_path() -> PathBuf {
    get_config_dir().join("gateway_profiles.json")
}

fn load_profiles() -> Vec<GatewayProfile> {
    let path = get_profiles_path();
    if path.exists() {
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(profiles) = serde_json::from_str(&data) {
                return profiles;
            }
        }
    }
    // Return default profile if no config exists
    vec![GatewayProfile::default()]
}

fn save_profiles(profiles: &[GatewayProfile]) -> Result<(), String> {
    let path = get_profiles_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(profiles).map_err(|e| e.to_string())?;
    fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(())
}

// ============== Profile Commands ==============

#[tauri::command]
pub fn list_gateway_profiles() -> Vec<GatewayProfile> {
    load_profiles()
}

#[tauri::command]
pub fn add_gateway_profile(profile: GatewayProfile) -> Result<GatewayProfile, String> {
    let mut profiles = load_profiles();

    // If this is the first profile or marked as default, set as default
    let is_first = profiles.is_empty();
    let mut new_profile = profile;
    if new_profile.id.is_empty() {
        new_profile.id = Uuid::new_v4().to_string();
    }
    if is_first || new_profile.is_default {
        // Clear other defaults
        for p in &mut profiles {
            p.is_default = false;
        }
        new_profile.is_default = true;
    }

    profiles.push(new_profile.clone());
    save_profiles(&profiles)?;

    tracing::info!("Added gateway profile: {}", new_profile.name);
    Ok(new_profile)
}

#[tauri::command]
pub fn update_gateway_profile(profile: GatewayProfile) -> Result<GatewayProfile, String> {
    let mut profiles = load_profiles();

    if let Some(existing) = profiles.iter_mut().find(|p| p.id == profile.id) {
        *existing = profile.clone();

        // If marked as default, clear others
        if profile.is_default {
            for p in &mut profiles {
                if p.id != profile.id {
                    p.is_default = false;
                }
            }
        }

        save_profiles(&profiles)?;
        tracing::info!("Updated gateway profile: {}", profile.name);
        Ok(profile)
    } else {
        Err("Profile not found".to_string())
    }
}

#[tauri::command]
pub fn remove_gateway_profile(id: String) -> Result<(), String> {
    let mut profiles = load_profiles();
    let initial_len = profiles.len();
    profiles.retain(|p| p.id != id);

    if profiles.len() == initial_len {
        return Err("Profile not found".to_string());
    }

    // If we removed the default, make another one default
    if !profiles.iter().any(|p| p.is_default) {
        if let Some(first) = profiles.first_mut() {
            first.is_default = true;
        }
    }

    save_profiles(&profiles)?;
    tracing::info!("Removed gateway profile: {}", id);
    Ok(())
}

#[tauri::command]
pub fn set_default_gateway(id: String) -> Result<(), String> {
    let mut profiles = load_profiles();

    for p in &mut profiles {
        p.is_default = p.id == id;
    }

    save_profiles(&profiles)?;
    tracing::info!("Set default gateway profile: {}", id);
    Ok(())
}

#[tauri::command]
pub fn get_default_gateway_profile() -> Option<GatewayProfile> {
    let profiles = load_profiles();
    profiles.into_iter().find(|p| p.is_default)
}

// ============== Types ==============

const GATEWAY_PROTOCOL_VERSION: i32 = 3;
const GATEWAY_TICK_INTERVAL_MS: i32 = 15000;
const GATEWAY_HANDSHAKE_TIMEOUT_SECONDS: u64 = 10;
const GATEWAY_CHALLENGE_TIMEOUT_MILLIS: u64 = 3000;
const GATEWAY_CLIENT_ID: &str = "gateway-client";
const GATEWAY_CLIENT_MODE: &str = "ui";
const GATEWAY_CLIENT_DEVICE_FAMILY: &str = "desktop";
const DEVICE_IDENTITY_VERSION: u8 = 1;
const GATEWAY_ROLE: &str = "operator";
const GATEWAY_SCOPES: &[&str] = &["operator.read", "operator.write"];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayConfig {
    pub url: String,
    pub token: String,
    #[serde(default = "default_agent_id")]
    pub agent_id: String,
    #[serde(default = "default_canvas_port")]
    pub canvas_port: u16,
}

fn default_agent_id() -> String {
    "main".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GatewayStatus {
    pub connected: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_ping: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GatewayEvent {
    #[serde(rename = "connected")]
    Connected { payload: ConnectedPayload },
    #[serde(rename = "disconnected")]
    Disconnected { payload: DisconnectedPayload },
    #[serde(rename = "error")]
    Error { payload: ErrorPayload },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectedPayload {
    pub protocol: i32,
    pub policy: Policy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisconnectedPayload {
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPayload {
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Policy {
    #[serde(rename = "tickIntervalMs", default)]
    pub tick_interval_ms: i32,
}

// WebSocket message types for protocol
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WsMessage {
    #[serde(rename = "req")]
    Request {
        id: String,
        method: String,
        params: serde_json::Value,
    },
    #[serde(rename = "res")]
    Response {
        id: String,
        ok: bool,
        #[serde(default)]
        payload: serde_json::Value,
    },
    #[serde(rename = "event")]
    Event {
        event: String,
        #[serde(default)]
        payload: serde_json::Value,
    },
}

// Internal gateway state
#[derive(Default)]
pub struct GatewayState {
    pub config: Option<GatewayConfig>,
    pub status: GatewayStatus,
    pub sender: Option<mpsc::Sender<WsMessage>>,
    pub shutdown_tx: Option<Arc<RwLock<Option<mpsc::Sender<()>>>>>,
}

type GatewayWsStream = WebSocketStream<MaybeTlsStream<TcpStream>>;
type GatewayWsRead = futures_util::stream::SplitStream<GatewayWsStream>;
type GatewayWsWrite = futures_util::stream::SplitSink<GatewayWsStream, Message>;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredDeviceIdentity {
    version: u8,
    device_id: String,
    public_key: String,
    private_key: String,
    created_at_ms: u64,
}

#[derive(Debug, Clone)]
struct DeviceIdentity {
    device_id: String,
    public_key: String,
    signing_key: SigningKey,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn encode_base64_url(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

fn decode_base64_url_to_array<const N: usize>(value: &str) -> Result<[u8; N], String> {
    let decoded = URL_SAFE_NO_PAD
        .decode(value)
        .map_err(|e| format!("Invalid base64url identity data: {}", e))?;
    decoded
        .try_into()
        .map_err(|_| format!("Invalid identity byte length, expected {}", N))
}

fn derive_device_id(public_key_raw: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(public_key_raw);
    format!("{:x}", hasher.finalize())
}

fn generate_device_identity() -> DeviceIdentity {
    let mut rng = OsRng;
    let signing_key = SigningKey::generate(&mut rng);
    let public_key = encode_base64_url(signing_key.verifying_key().to_bytes().as_ref());
    let device_id = derive_device_id(signing_key.verifying_key().to_bytes().as_ref());
    DeviceIdentity {
        device_id,
        public_key,
        signing_key,
    }
}

fn get_device_identity_path() -> PathBuf {
    get_config_dir().join("device_identity.json")
}

fn load_or_create_device_identity() -> Result<DeviceIdentity, String> {
    let path = get_device_identity_path();
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(stored) = serde_json::from_str::<StoredDeviceIdentity>(&raw) {
            if stored.version == DEVICE_IDENTITY_VERSION {
                if let (Ok(public_key_raw), Ok(private_key_raw)) = (
                    decode_base64_url_to_array::<32>(&stored.public_key),
                    decode_base64_url_to_array::<32>(&stored.private_key),
                ) {
                    let signing_key = SigningKey::from_bytes(&private_key_raw);
                    let derived_public_key_raw = signing_key.verifying_key().to_bytes();
                    let derived_device_id = derive_device_id(derived_public_key_raw.as_ref());
                    if derived_public_key_raw == public_key_raw
                        && derived_device_id == stored.device_id
                    {
                        return Ok(DeviceIdentity {
                            device_id: stored.device_id,
                            public_key: stored.public_key,
                            signing_key,
                        });
                    }
                }
                tracing::warn!("Stored device identity mismatch, regenerating identity");
            }
        }
    }

    let identity = generate_device_identity();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create identity dir: {}", e))?;
    }

    let stored = StoredDeviceIdentity {
        version: DEVICE_IDENTITY_VERSION,
        device_id: identity.device_id.clone(),
        public_key: identity.public_key.clone(),
        private_key: encode_base64_url(identity.signing_key.to_bytes().as_ref()),
        created_at_ms: now_ms(),
    };
    let serialized = serde_json::to_string_pretty(&stored)
        .map_err(|e| format!("Failed to serialize identity: {}", e))?;
    fs::write(&path, serialized).map_err(|e| format!("Failed to persist identity: {}", e))?;
    Ok(identity)
}

fn normalize_device_metadata_for_auth(value: &str) -> String {
    value
        .trim()
        .chars()
        .map(|c| {
            if c.is_ascii_uppercase() {
                c.to_ascii_lowercase()
            } else {
                c
            }
        })
        .collect::<String>()
}

struct DeviceAuthPayloadV3Params<'a> {
    device_id: &'a str,
    client_id: &'a str,
    client_mode: &'a str,
    role: &'a str,
    scopes: &'a [&'a str],
    signed_at_ms: u64,
    token: &'a str,
    nonce: &'a str,
    platform: &'a str,
    device_family: &'a str,
}

fn build_device_auth_payload_v3(params: DeviceAuthPayloadV3Params<'_>) -> String {
    let scopes_csv = params.scopes.join(",");
    let normalized_platform = normalize_device_metadata_for_auth(params.platform);
    let normalized_device_family = normalize_device_metadata_for_auth(params.device_family);
    [
        "v3".to_string(),
        params.device_id.to_string(),
        params.client_id.to_string(),
        params.client_mode.to_string(),
        params.role.to_string(),
        scopes_csv,
        params.signed_at_ms.to_string(),
        params.token.to_string(),
        params.nonce.to_string(),
        normalized_platform,
        normalized_device_family,
    ]
    .join("|")
}

fn build_signed_device_identity(
    identity: &DeviceIdentity,
    challenge_nonce: &str,
    token: &str,
) -> serde_json::Value {
    let signed_at = now_ms();
    let payload = build_device_auth_payload_v3(DeviceAuthPayloadV3Params {
        device_id: &identity.device_id,
        client_id: GATEWAY_CLIENT_ID,
        client_mode: GATEWAY_CLIENT_MODE,
        role: GATEWAY_ROLE,
        scopes: GATEWAY_SCOPES,
        signed_at_ms: signed_at,
        token,
        nonce: challenge_nonce,
        platform: std::env::consts::OS,
        device_family: GATEWAY_CLIENT_DEVICE_FAMILY,
    });
    let signature = identity.signing_key.sign(payload.as_bytes());
    serde_json::json!({
        "id": identity.device_id,
        "publicKey": identity.public_key,
        "signature": encode_base64_url(signature.to_bytes().as_ref()),
        "signedAt": signed_at,
        "nonce": challenge_nonce,
    })
}

fn parse_connect_challenge_nonce(ws_msg: &serde_json::Value) -> Option<String> {
    if ws_msg.get("type").and_then(|v| v.as_str()) != Some("event") {
        return None;
    }
    if ws_msg.get("event").and_then(|v| v.as_str()) != Some("connect.challenge") {
        return None;
    }
    ws_msg
        .pointer("/payload/nonce")
        .and_then(|v| v.as_str())
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

async fn wait_for_connect_challenge_nonce(
    read: &mut GatewayWsRead,
    write: &mut GatewayWsWrite,
) -> Result<Option<String>, String> {
    let wait_for_nonce = async {
        loop {
            match read.next().await {
                Some(Ok(Message::Text(text))) => {
                    if let Ok(ws_msg) = serde_json::from_str::<serde_json::Value>(&text) {
                        if let Some(nonce) = parse_connect_challenge_nonce(&ws_msg) {
                            return Ok(Some(nonce));
                        }
                    }
                }
                Some(Ok(Message::Ping(data))) => {
                    write
                        .send(Message::Pong(data))
                        .await
                        .map_err(|e| format!("Failed to respond to gateway ping: {}", e))?;
                }
                Some(Ok(Message::Close(_))) | None => {
                    return Err("Gateway closed connection before handshake".to_string());
                }
                Some(Err(e)) => {
                    return Err(format!("Failed while waiting gateway challenge: {}", e));
                }
                _ => {}
            }
        }
    };

    match tokio::time::timeout(
        std::time::Duration::from_millis(GATEWAY_CHALLENGE_TIMEOUT_MILLIS),
        wait_for_nonce,
    )
    .await
    {
        Ok(result) => result,
        Err(_) => Ok(None),
    }
}

fn build_connect_params(
    token: &str,
    challenge_nonce: Option<&str>,
) -> Result<serde_json::Value, String> {
    let mut params = serde_json::json!({
        "minProtocol": GATEWAY_PROTOCOL_VERSION,
        "maxProtocol": GATEWAY_PROTOCOL_VERSION,
        "client": {
            "id": GATEWAY_CLIENT_ID,
            "displayName": "clawstation",
            "version": env!("CARGO_PKG_VERSION"),
            "platform": std::env::consts::OS,
            "deviceFamily": GATEWAY_CLIENT_DEVICE_FAMILY,
            "mode": GATEWAY_CLIENT_MODE,
            "instanceId": Uuid::new_v4().to_string()
        },
        "role": GATEWAY_ROLE,
        "scopes": GATEWAY_SCOPES,
        "caps": [],
        "commands": [],
        "permissions": {},
        "locale": "en-US",
        "userAgent": format!("clawstation/{}", env!("CARGO_PKG_VERSION"))
    });

    if !token.trim().is_empty() {
        if let Some(obj) = params.as_object_mut() {
            obj.insert("auth".to_string(), serde_json::json!({ "token": token }));
        }
    }

    if let Some(nonce) = challenge_nonce {
        let trimmed_nonce = nonce.trim();
        if !trimmed_nonce.is_empty() {
            let identity = load_or_create_device_identity()?;
            if let Some(obj) = params.as_object_mut() {
                obj.insert(
                    "device".to_string(),
                    build_signed_device_identity(&identity, trimmed_nonce, token),
                );
            }
        }
    }

    Ok(params)
}

fn parse_connect_response(
    ws_msg: &serde_json::Value,
    connect_id: &str,
) -> Option<Result<ConnectedPayload, String>> {
    if ws_msg.get("type").and_then(|v| v.as_str()) != Some("res") {
        return None;
    }

    if ws_msg.get("id").and_then(|v| v.as_str()) != Some(connect_id) {
        return None;
    }

    let ok = ws_msg.get("ok").and_then(|v| v.as_bool()).unwrap_or(false);
    if !ok {
        let message = ws_msg
            .pointer("/error/message")
            .and_then(|v| v.as_str())
            .or_else(|| ws_msg.get("error").and_then(|v| v.as_str()))
            .unwrap_or("Gateway rejected connect request");
        return Some(Err(message.to_string()));
    }

    let protocol = ws_msg
        .pointer("/payload/protocol")
        .and_then(|v| v.as_i64())
        .unwrap_or(i64::from(GATEWAY_PROTOCOL_VERSION)) as i32;
    let tick_interval_ms = ws_msg
        .pointer("/payload/policy/tickIntervalMs")
        .and_then(|v| v.as_i64())
        .unwrap_or(i64::from(GATEWAY_TICK_INTERVAL_MS)) as i32;

    Some(Ok(ConnectedPayload {
        protocol,
        policy: Policy { tick_interval_ms },
    }))
}

async fn clear_gateway_runtime_state(
    state: &Arc<RwLock<GatewayState>>,
) -> Option<Arc<RwLock<Option<mpsc::Sender<()>>>>> {
    let mut gateway = state.write().await;
    gateway.status.connected = false;
    gateway.status.protocol = None;
    gateway.status.last_ping = None;
    gateway.config = None;
    gateway.status.url = None;
    gateway.status.agent_id = None;
    gateway.sender = None;
    gateway.shutdown_tx.take()
}

async fn send_shutdown_signal(shutdown_tx: Option<Arc<RwLock<Option<mpsc::Sender<()>>>>>) {
    if let Some(tx) = shutdown_tx {
        let mut guard = tx.write().await;
        if let Some(tx) = guard.take() {
            let _ = tx.send(()).await;
        }
    }
}

// ============== Commands ==============

#[tauri::command]
pub async fn connect(
    config: GatewayConfig,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    tracing::info!("Connecting to Gateway: {}", config.url);

    // Check if already connected
    {
        let gateway = state.gateway.read().await;
        if gateway.status.connected {
            return Err("Already connected to gateway".to_string());
        }
    }

    let url = config.url.clone();
    let token = config.token.clone();
    let agent_id = config.agent_id.clone();
    let _canvas_port = config.canvas_port;

    // Connect to WebSocket
    let (ws_stream, _) = connect_async(&url)
        .await
        .map_err(|e| format!("Failed to connect to gateway: {}", e))?;

    let (mut write, mut read) = ws_stream.split();

    // OpenClaw sends connect.challenge with a nonce immediately after WS open.
    // Use it to attach device identity/signature when required by gateway policy.
    let challenge_nonce = wait_for_connect_challenge_nonce(&mut read, &mut write).await?;
    if challenge_nonce.is_none() {
        tracing::warn!(
            "Gateway did not send connect.challenge before timeout; trying legacy connect"
        );
    }

    let connect_id = Uuid::new_v4().to_string();
    let connect_params = build_connect_params(&token, challenge_nonce.as_deref())?;
    let connect_req = serde_json::json!({
        "type": "req",
        "id": connect_id.clone(),
        "method": "connect",
        "params": connect_params
    });
    write
        .send(Message::Text(connect_req.to_string().into()))
        .await
        .map_err(|e| format!("Failed to send connect request: {}", e))?;

    // Create channels for communication
    let (tx, rx) = mpsc::channel::<WsMessage>(100);
    let (shutdown_tx, shutdown_rx) = mpsc::channel::<()>(1);
    let (connect_result_tx, connect_result_rx) =
        oneshot::channel::<Result<ConnectedPayload, String>>();

    // Update state
    {
        let mut gateway = state.gateway.write().await;
        gateway.config = Some(config.clone());
        gateway.status.connected = false;
        gateway.status.protocol = None;
        gateway.status.url = Some(url.clone());
        gateway.status.agent_id = Some(agent_id.clone());
        gateway.sender = Some(tx.clone());
        gateway.shutdown_tx = Some(Arc::new(RwLock::new(Some(shutdown_tx))));
    }

    // Wrap write in Arc<Mutex<>> so both tasks can access it
    let write = Arc::new(Mutex::new(write));
    let write_clone = write.clone();

    // Spawn task to handle outgoing messages
    tokio::spawn(async move {
        let write = write_clone;
        let mut rx = rx;
        let mut shutdown_rx = shutdown_rx;
        loop {
            tokio::select! {
                msg = rx.recv() => {
                    match msg {
                        Some(WsMessage::Request { id, method, params }) => {
                            let req = serde_json::json!({
                                "type": "req",
                                "id": id,
                                "method": method,
                                "params": params
                            });
                            let mut write = write.lock().await;
                            if let Err(e) = write.send(Message::Text(req.to_string().into())).await {
                                tracing::error!("Failed to send message: {}", e);
                                break;
                            }
                        }
                        Some(WsMessage::Response { .. }) | Some(WsMessage::Event { .. }) => {
                            // Response and Event are received, not sent - ignore
                        }
                        None => break,
                    }
                }
                _ = shutdown_rx.recv() => {
                    tracing::info!("Shutting down writer");
                    break;
                }
            }
        }
    });

    // Spawn task to handle incoming messages
    let app_clone = app.clone();
    let state_clone = state.gateway.clone();
    let connect_id_for_reader = connect_id.clone();
    tokio::spawn(async move {
        let write = write; // Arc<Mutex<>>
        let mut read = read;
        let mut connect_result_tx = Some(connect_result_tx);
        let mut handshake_ok = false;
        // Note: shutdown_rx was moved to the first task, reader will check status instead
        let mut heartbeat_interval = tokio::time::interval(std::time::Duration::from_secs(15));
        // tokio interval's first tick is immediate; consume it to avoid sending ping before handshake.
        heartbeat_interval.tick().await;

        loop {
            tokio::select! {
                msg = read.next() => {
                    match msg {
                        Some(Ok(Message::Text(text))) => {
                            if let Ok(ws_msg) = serde_json::from_str::<serde_json::Value>(&text) {
                                if let Some(result) = parse_connect_response(&ws_msg, &connect_id_for_reader) {
                                    match result {
                                        Ok(payload) => {
                                            handshake_ok = true;
                                            if let Some(tx) = connect_result_tx.take() {
                                                let _ = tx.send(Ok(payload));
                                            }
                                        }
                                        Err(error) => {
                                            if let Some(tx) = connect_result_tx.take() {
                                                let _ = tx.send(Err(error));
                                            }
                                            break;
                                        }
                                    }
                                }
                                handle_ws_message(&ws_msg, &app_clone, &state_clone).await;
                            }
                        }
                        Some(Ok(Message::Ping(data))) => {
                            let mut write = write.lock().await;
                            let _ = write.send(Message::Pong(data)).await;
                        }
                        Some(Ok(Message::Close(_))) => {
                            tracing::info!("Gateway closed connection");
                            break;
                        }
                        Some(Err(e)) => {
                            tracing::error!("WebSocket error: {}", e);
                            let _ = app_clone.emit("gateway", GatewayEvent::Error {
                                payload: ErrorPayload { message: e.to_string() }
                            });
                            break;
                        }
                        None => break,
                        _ => {}
                    }
                }
                _ = heartbeat_interval.tick() => {
                    if !handshake_ok {
                        continue;
                    }
                    // Send heartbeat
                    let ping = serde_json::json!({
                        "type": "req",
                        "id": Uuid::new_v4().to_string(),
                        "method": "system.ping",
                        "params": {}
                    });
                    let mut write = write.lock().await;
                    if let Err(e) = write.send(Message::Text(ping.to_string().into())).await {
                        tracing::error!("Failed to send ping: {}", e);
                        break;
                    }
                }
            }
        }

        if let Some(tx) = connect_result_tx.take() {
            let _ = tx.send(Err(
                "Connection closed before handshake completed".to_string()
            ));
        }

        // Cleanup on disconnect
        let shutdown_tx = clear_gateway_runtime_state(&state_clone).await;
        send_shutdown_signal(shutdown_tx).await;
        let _ = app_clone.emit(
            "gateway",
            GatewayEvent::Disconnected {
                payload: DisconnectedPayload {
                    reason: "Connection closed".to_string(),
                },
            },
        );
    });

    let connect_payload = match tokio::time::timeout(
        std::time::Duration::from_secs(GATEWAY_HANDSHAKE_TIMEOUT_SECONDS),
        connect_result_rx,
    )
    .await
    {
        Ok(Ok(Ok(payload))) => payload,
        Ok(Ok(Err(message))) => {
            let _ = app.emit(
                "gateway",
                GatewayEvent::Error {
                    payload: ErrorPayload {
                        message: message.clone(),
                    },
                },
            );
            return Err(format!("Gateway handshake failed: {}", message));
        }
        Ok(Err(_)) => {
            return Err("Gateway handshake channel unexpectedly closed".to_string());
        }
        Err(_) => {
            let shutdown_tx = clear_gateway_runtime_state(&state.gateway).await;
            send_shutdown_signal(shutdown_tx).await;
            return Err("Gateway handshake timed out".to_string());
        }
    };

    {
        let mut gateway = state.gateway.write().await;
        gateway.status.connected = true;
        gateway.status.protocol = Some(connect_payload.protocol);
    }

    // Emit connected event
    let _ = app.emit(
        "gateway",
        GatewayEvent::Connected {
            payload: connect_payload,
        },
    );

    tracing::info!("Gateway connection established");
    Ok(())
}

async fn handle_ws_message(
    msg: &serde_json::Value,
    app: &AppHandle,
    _state: &Arc<RwLock<GatewayState>>,
) {
    fn extract_text(value: &serde_json::Value) -> Option<String> {
        match value {
            serde_json::Value::String(s) => Some(s.clone()),
            serde_json::Value::Object(map) => {
                // Common shapes: { delta: "..." }, { text: "..." }, { message: ... }
                if let Some(s) = map.get("delta").and_then(|v| v.as_str()) {
                    return Some(s.to_string());
                }
                if let Some(s) = map.get("text").and_then(|v| v.as_str()) {
                    return Some(s.to_string());
                }
                if let Some(msg) = map.get("message") {
                    if let Some(s) = extract_text(msg) {
                        return Some(s);
                    }
                }

                // Message-like: { content: [{ type: "text", text: "..." }, ...] }
                if let Some(content) = map.get("content").and_then(|v| v.as_array()) {
                    let mut out = String::new();
                    for part in content {
                        if let Some("text") = part.get("type").and_then(|t| t.as_str()) {
                            if let Some(text) = part.get("text").and_then(|t| t.as_str()) {
                                out.push_str(text);
                            }
                        }
                    }
                    if !out.is_empty() {
                        return Some(out);
                    }
                }

                None
            }
            _ => None,
        }
    }

    if let Some(msg_type) = msg.get("type").and_then(|v| v.as_str()) {
        match msg_type {
            "res" => {
                // Handle response
                if let Some(ok) = msg.get("ok").and_then(|v| v.as_bool()) {
                    if ok {
                        tracing::debug!("Received OK response: {:?}", msg.get("id"));
                    } else {
                        tracing::warn!("Received error response: {:?}", msg.get("error"));
                    }
                }
            }
            "event" => {
                if let Some(event_name) = msg.get("event").and_then(|v| v.as_str()) {
                    tracing::debug!("Received event: {}", event_name);
                    let payload = msg
                        .get("payload")
                        .cloned()
                        .unwrap_or(serde_json::Value::Null);

                    // Translate OpenClaw operator events into a simpler AgentEvent shape
                    // that the frontend SessionStore already understands.
                    match event_name {
                        "session.started" => {
                            if let (Some(run_id), Some(session_key)) = (
                                payload.get("runId").and_then(|v| v.as_str()),
                                payload.get("sessionKey").and_then(|v| v.as_str()),
                            ) {
                                let _ = app.emit(
                                    "agent",
                                    serde_json::json!({
                                        "sessionKey": session_key,
                                        "runId": run_id,
                                        "type": "started",
                                        "payload": {}
                                    }),
                                );
                            }
                        }
                        "session.error" => {
                            if let (Some(run_id), Some(session_key)) = (
                                payload.get("runId").and_then(|v| v.as_str()),
                                payload.get("sessionKey").and_then(|v| v.as_str()),
                            ) {
                                let err = payload
                                    .get("errorMessage")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("Unknown error");
                                let _ = app.emit(
                                    "agent",
                                    serde_json::json!({
                                        "sessionKey": session_key,
                                        "runId": run_id,
                                        "type": "error",
                                        "payload": { "error": err }
                                    }),
                                );
                            }
                        }
                        "chat" => {
                            let run_id = payload.get("runId").and_then(|v| v.as_str());
                            let session_key = payload.get("sessionKey").and_then(|v| v.as_str());
                            let state = payload.get("state").and_then(|v| v.as_str()).unwrap_or("");
                            if let (Some(run_id), Some(session_key)) = (run_id, session_key) {
                                match state {
                                    "delta" => {
                                        if let Some(delta) =
                                            payload.get("message").and_then(extract_text)
                                        {
                                            let _ = app.emit(
                                                "agent",
                                                serde_json::json!({
                                                    "sessionKey": session_key,
                                                    "runId": run_id,
                                                    "type": "text",
                                                    "payload": { "delta": delta }
                                                }),
                                            );
                                        }
                                    }
                                    "final" => {
                                        let summary = payload
                                            .get("message")
                                            .and_then(extract_text)
                                            .or_else(|| {
                                                payload.get("message").map(|m| m.to_string())
                                            })
                                            .unwrap_or_default();
                                        let _ = app.emit(
                                            "agent",
                                            serde_json::json!({
                                                "sessionKey": session_key,
                                                "runId": run_id,
                                                "type": "completed",
                                                "payload": { "summary": summary }
                                            }),
                                        );
                                    }
                                    "error" | "aborted" => {
                                        let err = payload
                                            .get("errorMessage")
                                            .and_then(|v| v.as_str())
                                            .map(|s| s.to_string())
                                            .or_else(|| {
                                                payload.get("message").and_then(extract_text)
                                            })
                                            .unwrap_or_else(|| "Chat failed".to_string());
                                        let _ = app.emit(
                                            "agent",
                                            serde_json::json!({
                                                "sessionKey": session_key,
                                                "runId": run_id,
                                                "type": "error",
                                                "payload": { "error": err }
                                            }),
                                        );
                                    }
                                    _ => {}
                                }
                            }
                        }
                        "exec.approval.requested" => {
                            let _ = app.emit("approval", msg);
                        }
                        _ => {}
                    }
                }
            }
            _ => {}
        }
    }
}

#[tauri::command]
pub async fn disconnect(state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    tracing::info!("Disconnecting from Gateway");

    let shutdown_tx = clear_gateway_runtime_state(&state.gateway).await;
    send_shutdown_signal(shutdown_tx).await;

    let _ = app.emit(
        "gateway",
        GatewayEvent::Disconnected {
            payload: DisconnectedPayload {
                reason: "Disconnected by user".to_string(),
            },
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn get_status(state: State<'_, AppState>) -> Result<GatewayStatus, String> {
    let gateway = state.gateway.read().await;
    Ok(gateway.status.clone())
}

#[cfg(test)]
mod tests {
    use super::{
        build_connect_params, build_signed_device_identity, generate_device_identity,
        parse_connect_challenge_nonce, parse_connect_response,
    };
    use serde_json::json;

    #[test]
    fn build_connect_params_uses_gateway_client_enum_values() {
        let params = build_connect_params("token-123", None).expect("connect params should build");
        assert_eq!(
            params.pointer("/client/id").and_then(|v| v.as_str()),
            Some("gateway-client")
        );
        assert_eq!(
            params.pointer("/client/mode").and_then(|v| v.as_str()),
            Some("ui")
        );
        assert_eq!(
            params
                .pointer("/client/deviceFamily")
                .and_then(|v| v.as_str()),
            Some("desktop")
        );
        assert_eq!(
            params.pointer("/auth/token").and_then(|v| v.as_str()),
            Some("token-123")
        );
        assert!(params.get("device").is_none());
    }

    #[test]
    fn parse_connect_challenge_nonce_reads_nonce() {
        let msg = json!({
            "type": "event",
            "event": "connect.challenge",
            "payload": {
                "nonce": "nonce-abc",
                "ts": 123
            }
        });
        assert_eq!(
            parse_connect_challenge_nonce(&msg).as_deref(),
            Some("nonce-abc")
        );
    }

    #[test]
    fn build_signed_device_identity_uses_nonce_and_signature() {
        let identity = generate_device_identity();
        let device = build_signed_device_identity(&identity, "nonce-123", "token-123");

        assert_eq!(
            device.get("id").and_then(|v| v.as_str()),
            Some(identity.device_id.as_str())
        );
        assert_eq!(
            device.get("nonce").and_then(|v| v.as_str()),
            Some("nonce-123")
        );
        assert!(device
            .get("signature")
            .and_then(|v| v.as_str())
            .is_some_and(|v| !v.is_empty()));
        assert!(device
            .get("publicKey")
            .and_then(|v| v.as_str())
            .is_some_and(|v| !v.is_empty()));
    }

    #[test]
    fn build_connect_params_includes_device_identity_when_nonce_is_available() {
        let params =
            build_connect_params("", Some("nonce-xyz")).expect("connect params should build");
        assert_eq!(
            params.pointer("/device/nonce").and_then(|v| v.as_str()),
            Some("nonce-xyz")
        );
        assert!(params
            .pointer("/device/signature")
            .and_then(|v| v.as_str())
            .is_some_and(|v| !v.is_empty()));
    }

    #[test]
    fn parse_connect_response_reads_hello_payload() {
        let msg = json!({
            "type": "res",
            "id": "abc",
            "ok": true,
            "payload": {
                "protocol": 3,
                "policy": { "tickIntervalMs": 12000 }
            }
        });

        let parsed = parse_connect_response(&msg, "abc")
            .expect("response should match connect id")
            .expect("response should be ok");
        assert_eq!(parsed.protocol, 3);
        assert_eq!(parsed.policy.tick_interval_ms, 12000);
    }

    #[test]
    fn parse_connect_response_extracts_error_message() {
        let msg = json!({
            "type": "res",
            "id": "abc",
            "ok": false,
            "error": { "message": "invalid connect params" }
        });

        let err = parse_connect_response(&msg, "abc")
            .expect("response should match connect id")
            .expect_err("response should be error");
        assert!(err.contains("invalid connect params"));
    }
}
