use std::sync::Mutex;

use tauri::State;

use crate::models::*;
use crate::utils::CommandResult;
use crate::AppState;

#[tauri::command]
pub fn get_connections(state: State<'_, Mutex<AppState>>) -> CommandResult<Vec<Connection>> {
    tracing::debug!("→ get_connections");
    let app = state.lock().unwrap();
    let mut conns = app.store.get_connections();

    // Self-heal: assign UUID to any connection missing an id
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
        app.store.save_connections(conns.clone());
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
    let mut conns = app.store.get_connections();

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

    app.store.save_connections(conns);
    CommandResult::ok_empty()
}

#[tauri::command]
pub fn delete_connection(state: State<'_, Mutex<AppState>>, id: String) -> CommandResult {
    tracing::debug!("→ delete_connection: {}", id);
    let app = state.lock().unwrap();
    let mut conns = app.store.get_connections();
    let before = conns.len();
    conns.retain(|c| c.id.as_deref() != Some(&id));
    tracing::info!("← delete_connection: removed {} (before={}, after={})", id, before, conns.len());
    app.store.save_connections(conns);
    CommandResult::ok_empty()
}

#[tauri::command]
pub fn reset_default_connections(state: State<'_, Mutex<AppState>>) -> CommandResult {
    tracing::debug!("→ reset_default_connections");
    let app = state.lock().unwrap();
    let defaults = &app.defaults;
    let mut existing = app.store.get_connections();

    existing.retain(|c| !c.is_default);

    for mut def in defaults.connections.clone() {
        if def.id.is_none() {
            def.id = Some(uuid::Uuid::new_v4().to_string());
        }
        if !existing.iter().any(|c| c.factory_id.is_some() && c.factory_id == def.factory_id) {
            existing.push(def);
        }
    }

    app.store.save_connections(existing.clone());
    tracing::info!("← reset_default_connections: total={}", existing.len());
    CommandResult::ok_empty()
}

#[tauri::command]
pub fn get_recent_connections(state: State<'_, Mutex<AppState>>) -> CommandResult<Vec<String>> {
    tracing::debug!("→ get_recent_connections");
    let app = state.lock().unwrap();
    let result = app.store.get_recent_connections();
    tracing::info!("← get_recent_connections: {} entries", result.len());
    CommandResult::ok(result)
}

#[tauri::command]
pub fn push_recent_connection(state: State<'_, Mutex<AppState>>, id: String) -> CommandResult {
    tracing::debug!("→ push_recent_connection: {}", id);
    let app = state.lock().unwrap();
    let mut list = app.store.get_recent_connections();

    // Remove existing entry with same id, so it moves to front
    list.retain(|x| x != &id);
    list.insert(0, id);
    // Keep only last 3
    list.truncate(3);

    app.store.save_recent_connections(list);
    tracing::info!("← push_recent_connection: ok");
    CommandResult::ok_empty()
}
