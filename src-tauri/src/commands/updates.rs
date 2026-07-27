use crate::utils::CommandResult;

#[tauri::command]
pub fn check_for_updates() -> CommandResult {
    tracing::debug!("→ check_for_updates");
    tracing::warn!("⛔ UNIMPLEMENTED: check_for_updates");
    CommandResult::ok_empty()
}

#[tauri::command]
pub fn download_update() -> CommandResult {
    tracing::debug!("→ download_update");
    tracing::warn!("⛔ UNIMPLEMENTED: download_update");
    CommandResult::err("Auto-update not implemented")
}

#[tauri::command]
pub fn install_update() -> CommandResult {
    tracing::debug!("→ install_update");
    tracing::warn!("⛔ UNIMPLEMENTED: install_update");
    CommandResult::err("Auto-update not implemented")
}

#[tauri::command]
pub fn get_update_status() -> CommandResult<String> {
    tracing::debug!("→ get_update_status: idle");
    CommandResult::ok("idle".to_string())
}
