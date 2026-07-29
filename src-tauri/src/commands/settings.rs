use std::sync::Mutex;

use serde_json::Value;
use tauri::State;

use crate::utils::CommandResult;
use crate::AppState;

#[tauri::command]
pub fn get_settings(state: State<'_, Mutex<AppState>>) -> CommandResult<Value> {
    tracing::debug!("→ get_settings");
    let app = state.lock().unwrap();
    let settings = app.store.get_settings();
    tracing::info!("← get_settings: loaded");
    CommandResult::ok(settings)
}

#[tauri::command]
pub fn save_settings(state: State<'_, Mutex<AppState>>, settings: Value) -> CommandResult {
    tracing::debug!("→ save_settings");
    let app = state.lock().unwrap();
    app.store.save_settings(settings, &app.defaults);
    tracing::info!("← save_settings: ok");
    CommandResult::ok_empty()
}
