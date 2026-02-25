// Sessions Module - Session management for agent interactions

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::gateway::WsMessage;
use crate::AppState;

// ============== Types ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub key: String,
    pub agent_id: String,
    pub display_name: String,
    pub model: String,
    pub total_tokens: u32,
    pub context_tokens: u32,
    pub updated_at: i64,
    pub kind: SessionKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
pub enum SessionKind {
    #[default]
    Other,
    Main,
    Dm,
    Group,
    Cron,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: MessageRole,
    pub content: Vec<ContentPart>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
    System,
    ToolResult,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ContentPart {
    Text {
        text: String,
    },
    Image {
        image: String,
    },
    ToolCall {
        id: String,
        name: String,
        arguments: serde_json::Value,
    },
    ToolResult {
        tool_call_id: String,
        tool_name: String,
        content: Vec<ContentPart>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ListSessionsParams {
    #[serde(default)]
    pub agent_id: Option<String>,
    #[serde(default)]
    pub active_minutes: Option<i32>,
    #[serde(default)]
    pub limit: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetHistoryParams {
    pub session_key: String,
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub include_tools: bool,
}

fn default_limit() -> i32 {
    50
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageParams {
    pub session_key: String,
    pub message: String,
    #[serde(default)]
    pub attachments: Vec<Attachment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    #[serde(rename = "type")]
    pub attachment_type: String,
    #[serde(default)]
    pub path: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub data: Option<String>,
    #[serde(default)]
    pub mime_type: Option<String>,
    #[serde(default)]
    pub filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSessionParams {
    pub agent_id: String,
    #[serde(default)]
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnSubagentParams {
    pub task: String,
    pub agent_id: String,
    #[serde(default)]
    pub timeout_seconds: Option<i32>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub cleanup: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnSubagentResult {
    pub session_key: String,
    pub run_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbortResult {
    pub stopped: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbortSessionParams {
    pub session_key: String,
}

// ============== Session Manager ==============

pub struct SessionManager {
    pub sessions: HashMap<String, Session>,
    pub history: HashMap<String, Vec<Message>>,
    pub current_agent: Option<String>,
}

impl Default for SessionManager {
    fn default() -> Self {
        Self {
            sessions: HashMap::new(),
            history: HashMap::new(),
            current_agent: Some("main".to_string()),
        }
    }
}

// ============== Commands ==============

#[tauri::command]
pub async fn list_sessions(
    params: Option<ListSessionsParams>,
    state: State<'_, AppState>,
) -> Result<Vec<Session>, String> {
    let params = params.unwrap_or_default();
    let sessions = state.sessions.read().await;

    let mut result: Vec<Session> = sessions.sessions.values().cloned().collect();

    // Filter by agent_id
    if let Some(agent_id) = params.agent_id {
        result.retain(|s| s.agent_id == agent_id);
    }

    // Filter by active_minutes (simplified - in real implementation check updated_at)
    if let Some(_active_minutes) = params.active_minutes {
        // Filter sessions updated within the specified minutes
    }

    // Apply limit
    if let Some(limit) = params.limit {
        result.truncate(limit as usize);
    }

    Ok(result)
}

#[tauri::command]
pub async fn get_history(
    params: GetHistoryParams,
    state: State<'_, AppState>,
) -> Result<Vec<Message>, String> {
    let sessions = state.sessions.read().await;

    let history = sessions
        .history
        .get(&params.session_key)
        .cloned()
        .ok_or_else(|| format!("Session not found: {}", params.session_key))?;

    let mut result = history;

    // Apply limit
    if params.limit > 0 && (result.len() as i32) > params.limit {
        result = result.split_off(result.len() - (params.limit as usize));
    }

    // Filter tools if not requested
    if !params.include_tools {
        result.retain(|m| {
            m.role != MessageRole::ToolResult
                && !m
                    .content
                    .iter()
                    .any(|c| matches!(c, ContentPart::ToolCall { .. }))
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn send_message(
    params: SendMessageParams,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let agent_id = {
        let sessions = state.sessions.read().await;
        // Check if session exists
        let session = sessions
            .sessions
            .get(&params.session_key)
            .ok_or_else(|| format!("Session not found: {}", params.session_key))?;
        session.agent_id.clone()
    };

    // Add user message to history
    let timestamp = chrono::Utc::now().timestamp_millis();
    let message = Message {
        role: MessageRole::User,
        content: vec![ContentPart::Text {
            text: params.message.clone(),
        }],
        timestamp,
    };

    // Update session history
    let mut sessions_mgr = state.sessions.write().await;
    sessions_mgr
        .history
        .entry(params.session_key.clone())
        .or_insert_with(Vec::new)
        .push(message);

    // Forward to Gateway (OpenClaw operator RPC: op=chat)
    let sender = {
        let gateway = state.gateway.read().await;
        if !gateway.status.connected {
            return Err("Gateway not connected".to_string());
        }
        gateway
            .sender
            .clone()
            .ok_or_else(|| "Gateway sender not available".to_string())?
    };

    let req_id = Uuid::new_v4().to_string();
    let idempotency_key = Uuid::new_v4().to_string();

    let gw_params = serde_json::json!({
        "op": "chat",
        "message": params.message,
        "agentId": agent_id,
        "sessionKey": params.session_key,
        "idempotencyKey": idempotency_key,
        "deliver": true,
        "timeoutMs": 5 * 60 * 1000,
    });

    sender
        .send(WsMessage::Request {
            id: req_id,
            method: "chat".to_string(),
            params: gw_params,
        })
        .await
        .map_err(|e| format!("Failed to send to gateway: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn abort_session(
    params: AbortSessionParams,
    state: State<'_, AppState>,
) -> Result<AbortResult, String> {
    let session_key = params.session_key;
    let sessions = state.sessions.read().await;

    // Check if session exists
    if !sessions.sessions.contains_key(&session_key) {
        return Err(format!("Session not found: {}", session_key));
    }

    // In a real implementation, this would send an abort request to the Gateway
    // For now, return a success with stopped = 1 to indicate we attempted to stop

    Ok(AbortResult { stopped: 1 })
}

#[tauri::command]
pub async fn create_session(
    params: CreateSessionParams,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let session_key = Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now().timestamp_millis();

    let model = params.model.unwrap_or_else(|| "default".to_string());

    let session = Session {
        key: session_key.clone(),
        agent_id: params.agent_id.clone(),
        display_name: format!("Session-{}", &session_key[..8]),
        model,
        total_tokens: 0,
        context_tokens: 0,
        updated_at: timestamp,
        kind: SessionKind::Main,
        channel: None,
    };

    let mut sessions = state.sessions.write().await;
    sessions.sessions.insert(session_key.clone(), session);
    sessions.history.insert(session_key.clone(), Vec::new());

    Ok(serde_json::json!({ "sessionKey": session_key }))
}

#[tauri::command]
pub async fn spawn_subagent(
    params: SpawnSubagentParams,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<SpawnSubagentResult, String> {
    let session_key = Uuid::new_v4().to_string();
    let run_id = Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now().timestamp_millis();

    let model = params.model.unwrap_or_else(|| "default".to_string());

    // Create session for subagent
    let session = Session {
        key: session_key.clone(),
        agent_id: params.agent_id.clone(),
        display_name: format!("SubAgent-{}", &run_id[..8]),
        model,
        total_tokens: 0,
        context_tokens: 0,
        updated_at: timestamp,
        kind: SessionKind::Other,
        channel: None,
    };

    let mut sessions = state.sessions.write().await;
    sessions.sessions.insert(session_key.clone(), session);
    sessions.history.insert(session_key.clone(), Vec::new());

    // Emit started event
    let _ = app.emit(
        "subagent",
        serde_json::json!({
            "runId": run_id,
            "status": "accepted"
        }),
    );

    // In a real implementation, this would spawn a subagent task via the Gateway
    // and emit completion events when done

    Ok(SpawnSubagentResult {
        session_key,
        run_id,
        status: "accepted".to_string(),
    })
}
