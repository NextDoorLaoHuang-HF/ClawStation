// Files Module - File browsing and management

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, State};

use crate::AppState;

// ============== Types ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListWorkspaceParams {
    pub agent_id: String,
    #[serde(default)]
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadFileParams {
    pub agent_id: String,
    pub path: String,
    #[serde(default)]
    pub offset: Option<usize>,
    #[serde(default)]
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadImageParams {
    pub agent_id: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchDirectoryParams {
    pub agent_id: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileWatchEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub path: String,
    #[serde(default)]
    pub is_dir: bool,
}

// ============== File Manager ==============

#[derive(Default)]
pub struct FileManager {
    pub watchers: HashMap<String, WatcherHandle>,
}

pub struct WatcherHandle {
    #[allow(dead_code)]
    watcher: RecommendedWatcher,
    #[allow(dead_code)]
    agent_id: String,
}

// ============== Commands ==============

fn get_workspace_root(state: &State<'_, AppState>, agent_id: &str) -> PathBuf {
    let settings = state.settings.blocking_read();
    settings
        .workspace_dir
        .clone()
        .unwrap_or_else(|| get_default_workspace_dir(agent_id))
}

#[tauri::command]
pub async fn list_workspace(
    params: ListWorkspaceParams,
    state: State<'_, AppState>,
) -> Result<Vec<FileInfo>, String> {
    let workspace_root = get_workspace_root(&state, &params.agent_id);

    let base_path = if let Some(rel_path) = &params.path {
        workspace_root.join(rel_path)
    } else {
        workspace_root.clone()
    };

    tracing::debug!("Listing workspace: {:?}", base_path);

    // Read directory
    let mut entries = tokio::fs::read_dir(&base_path)
        .await
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut files = Vec::new();

    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let _path = entry.path();
        let metadata = entry.metadata().await.map_err(|e| e.to_string())?;

        let name = entry.file_name().to_string_lossy().to_string();
        let relative_path = params
            .path
            .as_ref()
            .map(|p| format!("{}/{}", p, name))
            .unwrap_or_else(|| name.clone());

        let file_info = FileInfo {
            name,
            path: relative_path,
            is_dir: metadata.is_dir(),
            size: if metadata.is_file() {
                Some(metadata.len())
            } else {
                None
            },
            modified: metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as i64),
            mime_type: None,
        };

        files.push(file_info);
    }

    // Sort: directories first, then by name
    files.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.cmp(&b.name),
    });

    Ok(files)
}

#[tauri::command]
pub async fn read_file(
    params: ReadFileParams,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let workspace_root = get_workspace_root(&state, &params.agent_id);
    let file_path = workspace_root.join(&params.path);

    tracing::debug!("Reading file: {:?}", file_path);

    // Check if file exists
    if !tokio::fs::metadata(&file_path)
        .await
        .map_err(|e| format!("File not found: {}", e))?
        .is_file()
    {
        return Err(format!("Not a file: {}", params.path));
    }

    // Read file content
    let content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Apply offset and limit if specified
    let lines: Vec<&str> = content.lines().collect();
    let offset = params.offset.unwrap_or(0);
    let limit = params.limit.unwrap_or(lines.len());

    let result: String = lines
        .into_iter()
        .skip(offset)
        .take(limit)
        .collect::<Vec<_>>()
        .join("\n");

    Ok(result)
}

#[tauri::command]
pub async fn read_image(
    params: ReadImageParams,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let workspace_root = get_workspace_root(&state, &params.agent_id);
    let file_path = workspace_root.join(&params.path);

    tracing::debug!("Reading image: {:?}", file_path);

    // Read image file
    let data = tokio::fs::read(&file_path)
        .await
        .map_err(|e| format!("Failed to read image: {}", e))?;

    // Get image dimensions (simplified - in real impl use image crate)
    let (width, height, mime_type) =
        get_image_info(&file_path)
            .await
            .unwrap_or((0, 0, "image/png".to_string()));

    Ok(serde_json::json!({
        "data": data,
        "width": width,
        "height": height,
        "mimeType": mime_type
    }))
}

#[tauri::command]
pub async fn watch_directory(
    params: WatchDirectoryParams,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let workspace_root = get_workspace_root(&state, &params.agent_id);
    let watch_path = workspace_root.join(&params.path);

    tracing::info!("Watching directory: {:?}", watch_path);

    let agent_id = params.agent_id.clone();
    let path_str = params.path.clone();
    let app_clone = app.clone();

    // Create watcher
    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        if let Ok(event) = res {
            let event_type = match event.kind {
                EventKind::Create(_) => "created",
                EventKind::Modify(_) => "modified",
                EventKind::Remove(_) => "deleted",
                _ => return,
            };

            for path in event.paths {
                let file_event = FileWatchEvent {
                    event_type: event_type.to_string(),
                    path: path.to_string_lossy().to_string(),
                    is_dir: path.is_dir(),
                };

                let _ = app_clone.emit("file-watch", file_event);
            }
        }
    })
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(&watch_path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch directory: {}", e))?;

    let watcher_key = format!("{}:{}", agent_id, path_str);

    let mut files = state.files.write().await;
    files.watchers.insert(
        watcher_key,
        WatcherHandle {
            watcher,
            agent_id,
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn unwatch_directory(
    params: WatchDirectoryParams,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let watcher_key = format!("{}:{}", params.agent_id, params.path);

    let mut files = state.files.write().await;

    if files.watchers.remove(&watcher_key).is_none() {
        return Err(format!("No watcher found for: {}", params.path));
    }

    tracing::info!("Stopped watching directory: {}", params.path);

    Ok(())
}

// ============== Helper Functions ==============

fn get_default_workspace_dir(agent_id: &str) -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("openclaw")
        .join("agents")
        .join(agent_id)
        .join("workspace")
}

async fn get_image_info(path: &Path) -> Option<(u32, u32, String)> {
    // Simplified - in real implementation use the image crate
    let extension = path.extension()?.to_str()?;

    let mime_type = match extension.to_lowercase().as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        _ => "application/octet-stream",
    };

    // Return placeholder dimensions - real impl would decode image
    Some((0, 0, mime_type.to_string()))
}
