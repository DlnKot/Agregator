use crate::utils::CommandResult;

#[tauri::command]
pub fn check_client_installed(client_type: String) -> CommandResult<bool> {
    tracing::warn!("⛔ UNIMPLEMENTED: check_client_installed({})", client_type);
    CommandResult::ok(false)
}

#[tauri::command]
pub fn check_distribution_downloaded(client_type: String) -> CommandResult<bool> {
    tracing::warn!("⛔ UNIMPLEMENTED: check_distribution_downloaded({})", client_type);
    CommandResult::ok(false)
}

#[tauri::command]
pub fn download_distribution(client_type: String) -> CommandResult<String> {
    tracing::warn!("⛔ UNIMPLEMENTED: download_distribution({})", client_type);
    CommandResult::err("Download not implemented")
}

#[tauri::command]
pub fn open_installer(file_path: String) -> CommandResult {
    tracing::warn!("⛔ UNIMPLEMENTED: open_installer({})", file_path);
    CommandResult::err("Installer not implemented")
}

#[tauri::command]
pub fn ensure_client_installed(client_type: String) -> CommandResult<bool> {
    tracing::warn!("⛔ UNIMPLEMENTED: ensure_client_installed({})", client_type);
    CommandResult::ok(false)
}
