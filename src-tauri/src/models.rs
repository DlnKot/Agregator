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

/// Deployment defaults (loaded from config/deployment-defaults.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeploymentDefaults {
    pub settings: Value,
    pub connections: Vec<Connection>,
}

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub user: Option<UserCredentials>,
    pub network_check: Option<NetworkCheckSettings>,
    pub updates: Option<UpdateSettings>,
    pub metrics_enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserCredentials {
    pub domain: Option<String>,
    pub username: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkCheckSettings {
    pub hosts: Option<Vec<String>>,
    pub ping_count: Option<u32>,
    pub latency_threshold_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSettings {
    pub auto_check: Option<bool>,
    pub use_github_releases: Option<bool>,
}

/// Ping detail — returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PingDetail {
    pub loss_percent: Option<f64>,
    pub avg_ms: Option<f64>,
    pub min_ms: Option<f64>,
    pub max_ms: Option<f64>,
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
