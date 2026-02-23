// Gateway Module - WebSocket client for OpenClaw Gateway

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{mpsc, Mutex, RwLock};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use uuid::Uuid;

use crate::AppState;

// ============== Types ==============

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

fn default_canvas_port() -> u16 {
    18793
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

    let (write, read) = ws_stream.split();

    // Create channels for communication
    let (tx, rx) = mpsc::channel::<WsMessage>(100);
    let (shutdown_tx, shutdown_rx) = mpsc::channel::<()>(1);

    // Update state
    {
        let mut gateway = state.gateway.write().await;
        gateway.config = Some(config.clone());
        gateway.status.connected = true;
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
    tokio::spawn(async move {
        let write = write; // Arc<Mutex<>>
        let mut read = read;
        // Note: shutdown_rx was moved to the first task, reader will check status instead
        let mut heartbeat_interval = tokio::time::interval(std::time::Duration::from_secs(15));

        loop {
            tokio::select! {
                msg = read.next() => {
                    match msg {
                        Some(Ok(Message::Text(text))) => {
                            if let Ok(ws_msg) = serde_json::from_str::<serde_json::Value>(&text) {
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

        // Cleanup on disconnect
        let mut gateway = state_clone.write().await;
        gateway.status.connected = false;
        let _ = app_clone.emit(
            "gateway",
            GatewayEvent::Disconnected {
                payload: DisconnectedPayload {
                    reason: "Connection closed".to_string(),
                },
            },
        );
    });

    // Send connect request
    let connect_id = Uuid::new_v4().to_string();
    let connect_params = serde_json::json!({
        "minProtocol": 3,
        "maxProtocol": 3,
        "client": {
            "id": "clawstation",
            "version": env!("CARGO_PKG_VERSION"),
            "platform": std::env::consts::OS,
            "mode": "operator"
        },
        "role": "operator",
        "scopes": ["operator.read", "operator.write"],
        "caps": [],
        "commands": [],
        "permissions": {},
        "auth": { "token": token },
        "locale": "en-US",
        "userAgent": format!("clawstation/{}", env!("CARGO_PKG_VERSION")),
        "device": {
            "id": "clawstation-desktop",
            "publicKey": "",
            "signature": "",
            "signedAt": chrono::Utc::now().timestamp_millis(),
            "nonce": ""
        }
    });

    let connect_req = WsMessage::Request {
        id: connect_id,
        method: "connect".to_string(),
        params: connect_params,
    };

    tx.send(connect_req).await.map_err(|e| e.to_string())?;

    // Emit connected event
    let _ = app.emit(
        "gateway",
        GatewayEvent::Connected {
            payload: ConnectedPayload {
                protocol: 3,
                policy: Policy {
                    tick_interval_ms: 15000,
                },
            },
        },
    );

    tracing::info!("Gateway connection initiated");
    Ok(())
}

async fn handle_ws_message(
    msg: &serde_json::Value,
    app: &AppHandle,
    _state: &Arc<RwLock<GatewayState>>,
) {
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
                    // Handle specific events
                    match event_name {
                        "session.started" | "session.completed" | "session.error" => {
                            let _ = app.emit("agent", msg);
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

    let shutdown_tx = {
        let mut gateway = state.gateway.write().await;
        gateway.status.connected = false;
        gateway.config = None;
        gateway.status.url = None;
        gateway.status.agent_id = None;
        gateway.sender = None;
        gateway.shutdown_tx.take()
    };

    if let Some(tx) = shutdown_tx {
        let mut guard = tx.write().await;
        if let Some(tx) = guard.take() {
            let _ = tx.send(()).await;
        }
    }

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
