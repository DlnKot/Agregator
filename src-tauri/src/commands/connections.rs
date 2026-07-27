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
pub fn get_last_connection(state: State<'_, Mutex<AppState>>) -> CommandResult<Option<String>> {
    tracing::debug!("→ get_last_connection");
    let app = state.lock().unwrap();
    let val = app.store.get("last_connection");
    let result = match val {
        Value::String(s) => {
            tracing::info!("← get_last_connection: {}", s);
            CommandResult::ok(Some(s))
        }
        _ => {
            tracing::info!("← get_last_connection: none");
            CommandResult::ok(None::<String>)
        }
    };
    result
}

#[tauri::command]
pub fn set_last_connection(state: State<'_, Mutex<AppState>>, id: Option<String>) -> CommandResult {
    tracing::debug!("→ set_last_connection: {:?}", id);
    let app = state.lock().unwrap();
    app.store.set(
        "last_connection",
        match &id {
            Some(s) => Value::String(s.clone()),
            None => Value::Null,
        },
    );
    app.store.flush();
    tracing::info!("← set_last_connection: ok");
    CommandResult::ok_empty()
}
