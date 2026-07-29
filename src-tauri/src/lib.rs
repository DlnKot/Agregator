mod logger;
mod models;
mod store;
mod utils;
mod commands;

use std::path::PathBuf;
use std::sync::Mutex;

use directories::BaseDirs;

use models::*;
use store::settings_file::SettingsFile;

pub(crate) struct AppState {
    pub(crate) store: SettingsFile,
    pub(crate) defaults: DeploymentDefaults,
    pub(crate) version: String,
}

fn get_store_dir() -> PathBuf {
    if let Some(base) = BaseDirs::new() {
        base.data_dir().join("com.alfa.remoteclient")
    } else {
        PathBuf::from(".")
    }
}

pub(crate) fn load_deployment_defaults() -> DeploymentDefaults {
    include_str!("../../config/deployment-defaults.json")
        .parse::<serde_json::Value>()
        .ok()
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or(DeploymentDefaults {
            version: String::new(),
            force_update_keys: vec![],
            settings: serde_json::json!({}),
            connections: vec![],
        })
}

fn init_store(defaults: &DeploymentDefaults) -> SettingsFile {
    let dir = get_store_dir();
    std::fs::create_dir_all(&dir).ok();
    let path = dir.join("settings.json");

    SettingsFile::new(path, defaults)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _log_guard = logger::init_logging(get_store_dir().join("logs"));

    let defaults = load_deployment_defaults();
    let store = init_store(&defaults);
    let version = env!("CARGO_PKG_VERSION").to_string();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(AppState {
            store,
            defaults,
            version,
        }))
        .invoke_handler(tauri::generate_handler![
            commands::connections::get_connections,
            commands::connections::save_connection,
            commands::connections::delete_connection,
            commands::connections::reset_default_connections,
            commands::connections::get_recent_connections,
            commands::connections::push_recent_connection,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::app::get_version,
            commands::app::get_platform,
            commands::app::open_external,
            commands::launchers::launch_rdp,
            commands::launchers::launch_horizon,
            commands::launchers::launch_citrix,
            commands::launchers::launch_vpn,
            commands::launchers::vpn_status,
            commands::launchers::vpn_disconnect,
            commands::launchers::vpn_connect,
            commands::launchers::vpn_client_status,
            commands::launchers::vpn_cancel,
            commands::launchers::launch_rudesktop,
            commands::launchers::get_rudesktop_status,
            commands::launchers::launch_achat,
            commands::launchers::launch_tolk,
            commands::misc::open_rudesktop_download,
            commands::misc::open_achat_web,
            commands::misc::open_tolk_web,
            commands::network::network_ping,
            commands::network::network_geo,
            commands::misc::log_message,
            commands::misc::track_event,
            commands::misc::track_connection_launch,
            commands::misc::track_tab_view,
            commands::misc::track_network_check,
            commands::misc::track_help_view,
            commands::misc::track_error,
            commands::installer::check_client_installed,
            commands::installer::check_distribution_downloaded,
            commands::installer::download_distribution,
            commands::installer::open_installer,
            commands::installer::ensure_client_installed,
            commands::updates::check_for_updates,
            commands::updates::download_update,
            commands::updates::install_update,
            commands::updates::get_update_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
