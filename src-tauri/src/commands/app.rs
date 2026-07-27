use std::sync::Mutex;

use tauri::State;

use crate::utils::CommandResult;
use crate::AppState;

#[tauri::command]
pub fn get_version(state: State<'_, Mutex<AppState>>) -> CommandResult<String> {
    let app = state.lock().unwrap();
    let v = app.version.clone();
    tracing::debug!("→ get_version: {}", v);
    CommandResult::ok(v)
}

#[tauri::command]
pub fn get_platform() -> CommandResult<String> {
    let p = std::env::consts::OS.to_string();
    tracing::debug!("→ get_platform: {}", p);
    CommandResult::ok(p)
}

#[tauri::command]
pub fn open_external(url: String) -> CommandResult {
    tracing::debug!("→ open_external: {}", url);
    let result = match open::that(&url) {
        Ok(_) => {
            tracing::info!("← open_external: opened {}", url);
            CommandResult::ok_empty()
        }
        Err(e) => {
            tracing::error!("← open_external: FAILED — {} (url={})", e, url);
            CommandResult::err(format!("Failed to open URL: {}", e))
        }
    };
    result
}
