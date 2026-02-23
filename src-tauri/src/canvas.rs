// Canvas Module - Canvas control and A2UI management

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State};

use crate::AppState;

// ============== Types ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasState {
    pub session_id: String,
    pub visible: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bounds: Option<Bounds>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasPresentParams {
    pub session_id: String,
    #[serde(default)]
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasNavigateParams {
    pub session_id: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasEvalParams {
    pub session_id: String,
    pub javascript: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasSnapshotParams {
    pub session_id: String,
    #[serde(default = "default_format")]
    pub format: String,
}

fn default_format() -> String {
    "png".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2UIPushParams {
    pub session_id: String,
    pub commands: Vec<A2UICommand>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum A2UICommand {
    BeginRendering {
        surface_id: String,
        root: String,
    },
    SurfaceUpdate {
        surface_id: String,
        components: Vec<Component>,
    },
    DataModelUpdate {
        surface_id: String,
        data: serde_json::Value,
    },
    DeleteSurface {
        surface_id: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Component {
    pub id: String,
    pub component: ComponentType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "component", rename_all = "PascalCase")]
pub enum ComponentType {
    Column {
        children: Children,
    },
    Text {
        text: TextContent,
        usage_hint: Option<String>,
    },
    Button {
        label: String,
        on_press: Option<String>,
    },
    Row {
        children: Children,
    },
    Image {
        source: ImageSource,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Children {
    #[serde(rename = "explicitList")]
    pub explicit_list: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextContent {
    #[serde(rename = "literalString")]
    pub literal_string: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageSource {
    pub url: String,
}

// ============== Canvas Manager ==============

#[derive(Default)]
pub struct CanvasManager {
    pub canvases: HashMap<String, CanvasState>,
}

// ============== Commands ==============

#[tauri::command]
pub async fn canvas_present(
    params: CanvasPresentParams,
    state: State<'_, AppState>,
) -> Result<CanvasState, String> {
    tracing::info!("Presenting canvas for session: {}", params.session_id);

    let canvas_state = CanvasState {
        session_id: params.session_id.clone(),
        visible: true,
        url: params.url.clone(),
        bounds: None,
    };

    // In a real implementation, this would create/show the canvas window
    // For now, we just track the state

    let mut canvas = state.canvas.write().await;
    canvas
        .canvases
        .insert(params.session_id.clone(), canvas_state.clone());

    Ok(canvas_state)
}

#[tauri::command]
pub async fn canvas_navigate(
    params: CanvasNavigateParams,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Navigating canvas {} to: {}", params.session_id, params.url);

    let mut canvas = state.canvas.write().await;

    // Check if canvas exists
    let canvas_state = canvas
        .canvases
        .get_mut(&params.session_id)
        .ok_or_else(|| format!("Canvas not found for session: {}", params.session_id))?;

    // Update URL
    canvas_state.url = Some(params.url);

    // In a real implementation, this would navigate the canvas webview
    Ok(())
}

#[tauri::command]
pub async fn canvas_eval(
    params: CanvasEvalParams,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    tracing::debug!(
        "Evaluating JS in canvas {}: {}",
        params.session_id,
        params.javascript
    );

    let canvas = state.canvas.read().await;

    // Check if canvas exists
    if !canvas.canvases.contains_key(&params.session_id) {
        return Err(format!(
            "Canvas not found for session: {}",
            params.session_id
        ));
    }

    // In a real implementation, this would execute JavaScript in the canvas webview
    // and return the result
    // For now, return null as a placeholder
    Ok(serde_json::Value::Null)
}

#[tauri::command]
pub async fn canvas_snapshot(
    params: CanvasSnapshotParams,
    state: State<'_, AppState>,
) -> Result<Vec<u8>, String> {
    tracing::debug!("Taking snapshot of canvas {}", params.session_id);

    let canvas = state.canvas.read().await;

    // Check if canvas exists
    if !canvas.canvases.contains_key(&params.session_id) {
        return Err(format!(
            "Canvas not found for session: {}",
            params.session_id
        ));
    }

    // In a real implementation, this would capture the canvas as an image
    // For now, return an empty byte array
    Ok(Vec::new())
}

#[tauri::command]
pub async fn a2ui_push(
    params: A2UIPushParams,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    tracing::debug!(
        "Pushing {} A2UI commands to canvas {}",
        params.commands.len(),
        params.session_id
    );

    let canvas = state.canvas.read().await;

    // Check if canvas exists
    if !canvas.canvases.contains_key(&params.session_id) {
        return Err(format!(
            "Canvas not found for session: {}",
            params.session_id
        ));
    }

    // Process each command
    for command in &params.commands {
        match command {
            A2UICommand::BeginRendering { surface_id, root } => {
                tracing::debug!("A2UI: BeginRendering {} -> {}", surface_id, root);
                let _ = app.emit(
                    "a2ui",
                    serde_json::json!({
                        "type": "beginRendering",
                        "surfaceId": surface_id,
                        "root": root
                    }),
                );
            }
            A2UICommand::SurfaceUpdate {
                surface_id,
                components,
            } => {
                tracing::debug!(
                    "A2UI: SurfaceUpdate {} ({} components)",
                    surface_id,
                    components.len()
                );
                let _ = app.emit(
                    "a2ui",
                    serde_json::json!({
                        "type": "surfaceUpdate",
                        "surfaceId": surface_id,
                        "components": components
                    }),
                );
            }
            A2UICommand::DataModelUpdate { surface_id, data } => {
                tracing::debug!("A2UI: DataModelUpdate {}", surface_id);
                let _ = app.emit(
                    "a2ui",
                    serde_json::json!({
                        "type": "dataModelUpdate",
                        "surfaceId": surface_id,
                        "data": data
                    }),
                );
            }
            A2UICommand::DeleteSurface { surface_id } => {
                tracing::debug!("A2UI: DeleteSurface {}", surface_id);
                let _ = app.emit(
                    "a2ui",
                    serde_json::json!({
                        "type": "deleteSurface",
                        "surfaceId": surface_id
                    }),
                );
            }
        }
    }

    Ok(())
}

// ============== Tests ==============

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_a2ui_begin_rendering() {
        let cmd = A2UICommand::BeginRendering {
            surface_id: "main".to_string(),
            root: "root".to_string(),
        };
        let json = serde_json::to_string(&cmd).unwrap();
        // With rename_all = "camelCase", surfaceId becomes surfaceId
        assert!(json.contains("beginRendering"));
    }

    #[test]
    fn test_a2ui_surface_update() {
        let cmd = A2UICommand::SurfaceUpdate {
            surface_id: "main".to_string(),
            components: vec![],
        };
        let json = serde_json::to_string(&cmd).unwrap();
        assert!(json.contains("surfaceUpdate"));
    }

    #[test]
    fn test_a2ui_data_model_update() {
        let cmd = A2UICommand::DataModelUpdate {
            surface_id: "main".to_string(),
            data: serde_json::json!({"name": "test"}),
        };
        let json = serde_json::to_string(&cmd).unwrap();
        assert!(json.contains("dataModelUpdate"));
    }

    #[test]
    fn test_a2ui_delete_surface() {
        let cmd = A2UICommand::DeleteSurface {
            surface_id: "main".to_string(),
        };
        let json = serde_json::to_string(&cmd).unwrap();
        assert!(json.contains("deleteSurface"));
    }

    #[test]
    fn test_component_types() {
        // Test Column
        let comp = ComponentType::Column {
            children: Children {
                explicit_list: vec!["child1".to_string()],
            },
        };
        let json = serde_json::to_string(&comp).unwrap();
        assert!(json.contains("Column"));

        // Test Button
        let comp = ComponentType::Button {
            label: "Click Me".to_string(),
            on_press: Some("handleClick".to_string()),
        };
        let json = serde_json::to_string(&comp).unwrap();
        assert!(json.contains("Button"));
        assert!(json.contains("Click Me"));

        // Test Image
        let comp = ComponentType::Image {
            source: ImageSource {
                url: "https://example.com/image.png".to_string(),
            },
        };
        let json = serde_json::to_string(&comp).unwrap();
        assert!(json.contains("Image"));
        assert!(json.contains("https://example.com/image.png"));
    }

    #[test]
    fn test_canvas_manager() {
        let manager = CanvasManager::default();
        assert!(manager.canvases.is_empty());

        let state = CanvasState {
            session_id: "test-session".to_string(),
            visible: true,
            url: Some("https://example.com".to_string()),
            bounds: Some(Bounds {
                x: 0.0,
                y: 0.0,
                width: 800.0,
                height: 600.0,
            }),
        };

        let mut manager = CanvasManager::default();
        manager
            .canvases
            .insert("test-session".to_string(), state.clone());

        assert_eq!(manager.canvases.len(), 1);
        assert!(manager.canvases.get("test-session").unwrap().visible);
    }

    #[test]
    fn test_bounds() {
        let bounds = Bounds {
            x: 100.0,
            y: 200.0,
            width: 800.0,
            height: 600.0,
        };

        let json = serde_json::to_string(&bounds).unwrap();
        assert!(json.contains("100"));
        assert!(json.contains("200"));
        assert!(json.contains("800"));
        assert!(json.contains("600"));
    }

    #[test]
    fn test_canvas_state() {
        let state = CanvasState {
            session_id: "test-1".to_string(),
            visible: true,
            url: Some("http://localhost".to_string()),
            bounds: None,
        };

        let json = serde_json::to_string(&state).unwrap();
        assert!(json.contains("test-1"));
        assert!(json.contains("true"));
    }
}
