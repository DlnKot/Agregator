use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use serde_json::Value;

/// Simple JSON-file-backed store. Mirrors Electron's simpleStore.js.
pub struct SimpleStore {
    file_path: PathBuf,
    data: Mutex<HashMap<String, Value>>,
}

impl SimpleStore {
    pub fn new(file_path: PathBuf) -> Self {
        let data = if file_path.exists() {
            fs::read_to_string(&file_path)
                .ok()
                .and_then(|raw| serde_json::from_str(&raw).ok())
                .unwrap_or_default()
        } else {
            if let Some(parent) = file_path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            HashMap::new()
        };

        Self {
            file_path,
            data: Mutex::new(data),
        }
    }

    pub fn get(&self, key: &str) -> Value {
        let data = self.data.lock().unwrap();
        data.get(key).cloned().unwrap_or(Value::Null)
    }

    pub fn set(&self, key: &str, value: Value) {
        let mut data = self.data.lock().unwrap();
        data.insert(key.to_string(), value);
    }

    pub fn delete(&self, key: &str) {
        let mut data = self.data.lock().unwrap();
        data.remove(key);
    }

    pub fn has(&self, key: &str) -> bool {
        let data = self.data.lock().unwrap();
        data.contains_key(key)
    }

    pub fn flush(&self) {
        let data = self.data.lock().unwrap();
        if let Some(parent) = self.file_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(&*data) {
            let _ = fs::write(&self.file_path, json);
        }
    }

    pub fn keys(&self) -> Vec<String> {
        let data = self.data.lock().unwrap();
        data.keys().cloned().collect()
    }

    pub fn all(&self) -> HashMap<String, Value> {
        let data = self.data.lock().unwrap();
        data.clone()
    }
}

impl Drop for SimpleStore {
    fn drop(&mut self) {
        self.flush();
    }
}
