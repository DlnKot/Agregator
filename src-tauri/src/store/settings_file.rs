use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde_json::Value;

use crate::models::{Connection, SettingsFileData};

/// Manages the single settings.json file on disk — the single source of truth.
/// On init, merges compiled-in defaults with the user's file.
pub struct SettingsFile {
    file_path: PathBuf,
    data: Mutex<SettingsFileData>,
}

impl SettingsFile {
    /// Load or create settings.json, merging with compiled-in defaults.
    pub fn new(file_path: PathBuf, defaults: &crate::models::DeploymentDefaults) -> Self {
        let data = if file_path.exists() {
            fs::read_to_string(&file_path)
                .ok()
                .and_then(|raw| serde_json::from_str::<SettingsFileData>(&raw).ok())
                .unwrap_or_else(|| Self::seed_from_defaults(defaults))
        } else {
            // Ensure parent dir exists
            if let Some(parent) = file_path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            Self::seed_from_defaults(defaults)
        };

        let s = Self {
            file_path,
            data: Mutex::new(data),
        };

        // Merge defaults if version mismatch
        s.merge_defaults(defaults);

        s
    }

    fn seed_from_defaults(defaults: &crate::models::DeploymentDefaults) -> SettingsFileData {
        SettingsFileData {
            defaults_version: defaults.version.clone(),
            settings: defaults.settings.clone(),
            connections: defaults
                .connections
                .iter()
                .map(|c| {
                    let mut c = c.clone();
                    if c.id.is_none() {
                        c.id = Some(uuid::Uuid::new_v4().to_string());
                    }
                    c
                })
                .collect(),
            recent_connections: vec![],
            user_modified_keys: vec![],
        }
    }

    /// Merge compiled-in defaults into user data when version differs.
    fn merge_defaults(&self, defaults: &crate::models::DeploymentDefaults) {
        let mut data = self.data.lock().unwrap();

        if data.defaults_version == defaults.version {
            return;
        }

        tracing::info!(
            "SettingsFile: merging defaults ({} → {})",
            data.defaults_version,
            defaults.version
        );

        // 1. Merge settings: start from defaults, overlay user values (unless force_update)
        let mut merged_settings = defaults.settings.clone();
        if let (Value::Object(defaults_obj), Value::Object(user_obj)) =
            (&defaults.settings, &data.settings)
        {
            for (key, user_val) in user_obj {
                if defaults.force_update_keys.contains(&format!("settings.{}", key)) {
                    // Force update — keep default
                    continue;
                }
                if data.user_modified_keys.contains(key) {
                    // User modified — keep user's value
                    if let Some(default_val) = defaults_obj.get(key) {
                        if user_val != default_val {
                            merged_settings
                                .as_object_mut()
                                .unwrap()
                                .insert(key.clone(), user_val.clone());
                        }
                    } else {
                        merged_settings
                            .as_object_mut()
                            .unwrap()
                            .insert(key.clone(), user_val.clone());
                    }
                } else {
                    // Not modified by user — keep user's value (may differ from default
                    // if set via other means, but generally same as default)
                    if user_val != defaults_obj.get(key).unwrap_or(&Value::Null) {
                        merged_settings
                            .as_object_mut()
                            .unwrap()
                            .insert(key.clone(), user_val.clone());
                    }
                }
            }
        }
        data.settings = merged_settings;

        // 2. Merge connections
        for def_conn in &defaults.connections {
            let exists = data.connections.iter().any(|c| {
                c.factory_id.is_some() && c.factory_id == def_conn.factory_id
            });
            if !exists {
                let mut new_conn = def_conn.clone();
                if new_conn.id.is_none() {
                    new_conn.id = Some(uuid::Uuid::new_v4().to_string());
                }
                data.connections.push(new_conn);
            }
        }

        data.defaults_version = defaults.version.clone();
        self.flush_inner(&data);
    }

    pub fn get_settings(&self) -> Value {
        let data = self.data.lock().unwrap();
        data.settings.clone()
    }

    pub fn save_settings(&self, new_settings: Value, defaults: &crate::models::DeploymentDefaults) {
        let mut data = self.data.lock().unwrap();

        // Track which top-level keys the user modified
        let mut modified = Vec::new();
        if let (Value::Object(new_obj), Value::Object(default_obj)) =
            (&new_settings, &defaults.settings)
        {
            for (key, new_val) in new_obj {
                let default_val = default_obj.get(key);
                let is_different = match default_val {
                    Some(dv) => new_val != dv,
                    None => true,
                };
                if is_different {
                    modified.push(key.clone());
                }
            }
        }
        data.user_modified_keys = modified;
        data.settings = new_settings;
        self.flush_inner(&data);
    }

    pub fn get_connections(&self) -> Vec<Connection> {
        let data = self.data.lock().unwrap();
        data.connections.clone()
    }

    pub fn save_connections(&self, connections: Vec<Connection>) {
        let mut data = self.data.lock().unwrap();
        data.connections = connections;
        self.flush_inner(&data);
    }

    pub fn get_recent_connections(&self) -> Vec<String> {
        let data = self.data.lock().unwrap();
        data.recent_connections.clone()
    }

    pub fn save_recent_connections(&self, recent: Vec<String>) {
        let mut data = self.data.lock().unwrap();
        data.recent_connections = recent;
        self.flush_inner(&data);
    }

    fn flush_inner(&self, data: &SettingsFileData) {
        if let Some(parent) = self.file_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(data) {
            let _ = fs::write(&self.file_path, json);
        }
    }
}

impl Drop for SettingsFile {
    fn drop(&mut self) {
        let data = self.data.lock().unwrap();
        self.flush_inner(&data);
    }
}
