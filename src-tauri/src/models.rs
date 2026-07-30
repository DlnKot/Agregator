use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A remote desktop connection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: Option<String>,
    #[serde(rename = "type")]
    pub connection_type: String,
    pub name: String,
    pub host: String,
    pub description: Option<String>,
    pub username: Option<String>,
    pub domain: Option<String>,
    pub port: Option<u16>,
    #[serde(default, alias = "is_default")]
    pub is_default: bool,
    #[serde(default, alias = "is_user_modified")]
    pub is_user_modified: bool,
    #[serde(default, alias = "factory_id")]
    pub factory_id: Option<String>,
    #[serde(flatten)]
    pub extra: Value,
}

/// Deployment defaults (compiled into binary from config/deployment-defaults.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentDefaults {
    pub version: String,
    #[serde(rename = "force_update_keys")]
    pub force_update_keys: Vec<String>,
    pub settings: Value,
    pub connections: Vec<Connection>,
}

/// Single settings.json file on disk — the single source of truth
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsFileData {
    pub defaults_version: String,
    pub settings: Value,
    pub connections: Vec<Connection>,
    pub recent_connections: Vec<String>,
    pub user_modified_keys: Vec<String>,
}

/// Ping detail — returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PingDetail {
    pub loss_percent: Option<f64>,
    pub avg_ms: Option<f64>,
    pub min_ms: Option<f64>,
    pub max_ms: Option<f64>,
    // Standard deviation (jitter) in milliseconds
    pub jitter_ms: Option<f64>,
    pub raw: Option<String>,
    pub error: Option<String>,
}

/// Ping evaluation — displayed as badge
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PingEval {
    pub status: String,
    pub label: String,
    pub recommendation: String,
    pub threshold_ms: u64,
}

/// Single host ping result (returned by network_ping)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SinglePingResult {
    pub ping: PingDetail,
    pub evaluation: PingEval,
}

/// Network check result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkCheckResult {
    pub hosts: Vec<HostCheckResult>,
    pub geo: Option<GeoInfo>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostCheckResult {
    pub host: String,
    pub resolved: bool,
    pub ping: Option<PingResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PingResult {
    pub min: f64,
    pub avg: f64,
    pub max: f64,
    pub packet_loss: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoInfo {
    pub ip: String,
    pub city: Option<String>,
    pub country: Option<String>,
}

/// VPN status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VpnStatus {
    pub connected: bool,
    pub client_installed: bool,
    pub platform: String,
}

/// RuDesktop status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuDesktopStatus {
    pub installed: bool,
    pub device_id: Option<String>,
}

/// RuDesktop launch result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuDesktopLaunchResult {
    pub device_id: Option<String>,
}

/// App version info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppVersion {
    pub version: String,
    pub name: String,
}
