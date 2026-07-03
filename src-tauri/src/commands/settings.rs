use std::sync::Mutex;

use tauri::State;

use crate::models::*;
use crate::utils::CommandResult;
use crate::AppState;

#[tauri::command]
pub fn get_settings(state: State<'_, Mutex<AppState>>) -> CommandResult<Settings> {
    tracing::debug!("→ get_settings");
    let app = state.lock().unwrap();
    let val = app.store.get("settings");
    let result = match serde_json::from_value::<Settings>(val) {
        Ok(s) => {
            tracing::info!("← get_settings: loaded");
            CommandResult::ok(s)
        }
        Err(_) => {
            tracing::warn!("← get_settings: corrupted, returning defaults");
            CommandResult::ok(Settings {
                user: None,
                network_check: None,
                updates: None,
                metrics_enabled: Some(false),
            })
        }
    };
    result
}

#[tauri::command]
pub fn save_settings(state: State<'_, Mutex<AppState>>, settings: Settings) -> CommandResult {
    tracing::debug!("→ save_settings");
    let app = state.lock().unwrap();
    app.store.set("settings", serde_json::to_value(&settings).unwrap_or_default());
    app.store.flush();
    tracing::info!("← save_settings: ok");
    CommandResult::ok_empty()
}
