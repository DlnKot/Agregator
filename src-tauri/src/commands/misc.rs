use crate::utils::CommandResult;

#[tauri::command]
pub fn open_rudesktop_download() -> CommandResult {
    tracing::debug!("→ open_rudesktop_download");
    match open::that("https://rudesktop.ru/download/") {
        Ok(_) => {
            tracing::info!("← open_rudesktop_download: ok");
            CommandResult::ok_empty()
        }
        Err(e) => {
            tracing::error!("← open_rudesktop_download: FAILED — {}", e);
            CommandResult::err(format!("Failed to open: {}", e))
        }
    }
}

#[tauri::command]
pub fn open_achat_web() -> CommandResult {
    tracing::debug!("→ open_achat_web");
    match open::that("https://achat.best/") {
        Ok(_) => {
            tracing::info!("← open_achat_web: ok");
            CommandResult::ok_empty()
        }
        Err(e) => {
            tracing::error!("← open_achat_web: FAILED — {}", e);
            CommandResult::err(format!("Failed to open: {}", e))
        }
    }
}

#[tauri::command]
pub fn open_tolk_web() -> CommandResult {
    tracing::debug!("→ open_tolk_web");
    match open::that("https://alfabank.ktalk.ru/") {
        Ok(_) => {
            tracing::info!("← open_tolk_web: ok");
            CommandResult::ok_empty()
        }
        Err(e) => {
            tracing::error!("← open_tolk_web: FAILED — {}", e);
            CommandResult::err(format!("Failed to open: {}", e))
        }
    }
}

#[tauri::command]
pub fn track_event(_type: String, _data: serde_json::Value) {
    tracing::debug!("→ track_event: type={}", _type);
}

#[tauri::command]
pub fn track_connection_launch(_type: String, _success: bool) {
    tracing::debug!("→ track_connection_launch: type={}, success={}", _type, _success);
}

#[tauri::command]
pub fn track_tab_view(_tab: String) {
    tracing::debug!("→ track_tab_view: tab={}", _tab);
}

#[tauri::command]
pub fn track_network_check() {
    tracing::debug!("→ track_network_check");
}

#[tauri::command]
pub fn track_help_view(_section: String) {
    tracing::debug!("→ track_help_view: section={}", _section);
}

#[tauri::command]
pub fn track_error(_error: String) {
    tracing::warn!("→ track_error: {}", _error);
}

#[tauri::command]
pub fn log_message(level: String, message: String) {
    match level.as_str() {
        "error" => tracing::error!("[renderer] {}", message),
        "warn" => tracing::warn!("[renderer] {}", message),
        "info" => tracing::info!("[renderer] {}", message),
        _ => tracing::debug!("[renderer] {}", message),
    }
}
