// Agents Module - Agent management

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

use crate::AppState;

// ============== Types ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInfo {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emoji: Option<String>,
    pub model: String,
    pub available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subagents: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub id: String,
    pub model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity: Option<AgentIdentity>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentIdentity {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emoji: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwitchAgentParams {
    pub agent_id: String,
}

// ============== Agent Manager ==============

pub struct AgentManager {
    pub agents: HashMap<String, AgentInfo>,
    pub current_agent: Option<String>,
}

impl Default for AgentManager {
    fn default() -> Self {
        let mut agents = HashMap::new();

        // Default agents
        agents.insert(
            "main".to_string(),
            AgentInfo {
                id: "main".to_string(),
                name: "Main Agent".to_string(),
                emoji: Some("🤖".to_string()),
                model: "infini/minimax-m2.5".to_string(),
                available: true,
                subagents: Some(vec!["codex".to_string(), "browser".to_string()]),
            },
        );

        agents.insert(
            "codex".to_string(),
            AgentInfo {
                id: "codex".to_string(),
                name: "Codex Agent".to_string(),
                emoji: Some("💻".to_string()),
                model: "infini/minimax-m2.5".to_string(),
                available: true,
                subagents: None,
            },
        );

        agents.insert(
            "browser".to_string(),
            AgentInfo {
                id: "browser".to_string(),
                name: "Browser Agent".to_string(),
                emoji: Some("🌐".to_string()),
                model: "infini/minimax-m2.5".to_string(),
                available: true,
                subagents: None,
            },
        );

        Self {
            agents,
            current_agent: Some("main".to_string()),
        }
    }
}

// ============== Commands ==============

#[tauri::command]
pub async fn list_agents(state: State<'_, AppState>) -> Result<Vec<AgentInfo>, String> {
    let agents = state.agents.read().await;
    let result: Vec<AgentInfo> = agents.agents.values().cloned().collect();
    Ok(result)
}

#[tauri::command]
pub async fn switch_agent(
    params: SwitchAgentParams,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut agents = state.agents.write().await;

    // Check if agent exists
    if !agents.agents.contains_key(&params.agent_id) {
        return Err(format!("Agent not found: {}", params.agent_id));
    }

    let previous_agent_id = agents.current_agent.clone().unwrap_or_default();

    // Switch agent
    agents.current_agent = Some(params.agent_id.clone());

    tracing::info!(
        "Switched agent from {} to {}",
        previous_agent_id,
        params.agent_id
    );

    Ok(serde_json::json!({
        "previousAgentId": previous_agent_id,
        "currentAgentId": params.agent_id
    }))
}

#[tauri::command]
pub async fn get_agent_config(
    agent_id: String,
    state: State<'_, AppState>,
) -> Result<AgentConfig, String> {
    let agents = state.agents.read().await;

    let agent_info = agents
        .agents
        .get(&agent_id)
        .ok_or_else(|| format!("Agent not found: {}", agent_id))?;

    let config = AgentConfig {
        id: agent_info.id.clone(),
        model: agent_info.model.clone(),
        identity: Some(AgentIdentity {
            name: Some(agent_info.name.clone()),
            emoji: agent_info.emoji.clone(),
        }),
        tools: None,
    };

    Ok(config)
}
