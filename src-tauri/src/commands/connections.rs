use std::sync::Mutex;

use serde_json::Value;
use tauri::State;

use crate::models::*;
use crate::utils::CommandResult;
use crate::AppState;

#[tauri::command]
pub fn get_connections(state: State<'_, Mutex<AppState>>) -> CommandResult<Vec<Connection>> {
    tracing::debug!("→ get_connections");
    let app = state.lock().unwrap();
    let val = app.store.get("connections");
    let mut conns: Vec<Connection> = match serde_json::from_value(val) {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("← get_connections: FAILED — {}", e);
            return CommandResult::err(format!("Failed to parse connections: {}", e));
        }
    };

    // Self-heal: assign UUID to any connection missing an id (e.g. migrated from old store)
    let mut needs_save = false;
    for conn in &mut conns {
        if conn.id.is_none() {
            conn.id = Some(uuid::Uuid::new_v4().to_string());
            needs_save = true;
            tracing::info!("  get_connections: assigned UUID to connection '{}'", conn.name);
        }
    }
    if needs_save {
        tracing::info!("  get_connections: saving back {} fixed connection(s)", conns.len());
        app.store.set(
            "connections",
            serde_json::to_value(&conns).unwrap_or(Value::Array(vec![])),
        );
        app.store.flush();
    }

    tracing::info!("← get_connections: {} connections", conns.len());
    CommandResult::ok(conns)
}

#[tauri::command]
pub fn save_connection(
    state: State<'_, Mutex<AppState>>,
    connection: Connection,
) -> CommandResult {
    tracing::debug!("→ save_connection: {:?}", connection.id);
    let app = state.lock().unwrap();
    let val = app.store.get("connections");
    let mut conns: Vec<Connection> = serde_json::from_value(val).unwrap_or_default();

    let id = connection
        .id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    if let Some(existing) = conns.iter_mut().find(|c| c.id.as_deref() == Some(&id)) {
        tracing::info!("← save_connection: updated {}", id);
        *existing = connection;
        existing.id = Some(id);
    } else {
        tracing::info!("← save_connection: created {}", id);
        let mut new_conn = connection;
        new_conn.id = Some(id);
        conns.push(new_conn);
    }

    app.store.set(
        "connections",
        serde_json::to_value(&conns).unwrap_or(Value::Array(vec![])),
    );
    app.store.flush();
    CommandResult::ok_empty()
}

#[tauri::command]
pub fn delete_connection(state: State<'_, Mutex<AppState>>, id: String) -> CommandResult {
    tracing::debug!("→ delete_connection: {}", id);
    let app = state.lock().unwrap();
    let val = app.store.get("connections");
    let mut conns: Vec<Connection> = serde_json::from_value(val).unwrap_or_default();
    let before = conns.len();
    conns.retain(|c| c.id.as_deref() != Some(&id));
    tracing::info!("← delete_connection: removed {} (before={}, after={})", id, before, conns.len());
    app.store.set(
        "connections",
        serde_json::to_value(&conns).unwrap_or(Value::Array(vec![])),
    );
    app.store.flush();
    CommandResult::ok_empty()
}

#[tauri::command]
pub fn reset_default_connections(state: State<'_, Mutex<AppState>>) -> CommandResult {
    tracing::debug!("→ reset_default_connections");
    let app = state.lock().unwrap();
    let defaults = crate::load_deployment_defaults();
    let val = app.store.get("connections");
    let mut existing: Vec<Connection> = serde_json::from_value(val).unwrap_or_default();

    existing.retain(|c| !c.is_default);

    for mut def in defaults.connections {
        if def.id.is_none() {
            def.id = Some(uuid::Uuid::new_v4().to_string());
        }
        if !existing.iter().any(|c| c.factory_id.is_some() && c.factory_id == def.factory_id) {
            existing.push(def);
        }
    }

    app.store.set("connections", serde_json::to_value(&existing).unwrap_or(Value::Array(vec![])));
    app.store.flush();
    tracing::info!("← reset_default_connections: total={}", existing.len());
    CommandResult::ok_empty()
}

#[tauri::command]
pub fn get_recent_connections(state: State<'_, Mutex<AppState>>) -> CommandResult<Vec<String>> {
    tracing::debug!("→ get_recent_connections");
    let app = state.lock().unwrap();
    let val = app.store.get("recent_connections");
    let result: Vec<String> = match val {
        Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
        _ => vec![],
    };
    tracing::info!("← get_recent_connections: {} entries", result.len());
    CommandResult::ok(result)
}

#[tauri::command]
pub fn push_recent_connection(state: State<'_, Mutex<AppState>>, id: String) -> CommandResult {
    tracing::debug!("→ push_recent_connection: {}", id);
    let app = state.lock().unwrap();
    let val = app.store.get("recent_connections");
    let mut list: Vec<String> = match val {
        Value::Array(arr) => arr.iter().filter_map(|v| v.as_str().map(String::from)).collect(),
        _ => vec![],
    };

    // Remove existing entry with same id (if any), so it moves to front
    list.retain(|x| x != &id);
    list.insert(0, id);
    // Keep only last 3
    list.truncate(3);

    app.store.set("recent_connections", Value::Array(list.into_iter().map(Value::String).collect()));
    app.store.flush();
    tracing::info!("← push_recent_connection: ok");
    CommandResult::ok_empty()
}
