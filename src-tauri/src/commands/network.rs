use crate::commands::pinger;
use crate::models::*;
use crate::utils::CommandResult;

#[tauri::command]
pub async fn network_ping(
    host: String,
    count: u32,
    threshold_ms: Option<u64>,
    loss_threshold_percent: Option<f64>,
) -> CommandResult<SinglePingResult> {
    let packets = count.max(1).min(50);
    let threshold = threshold_ms.unwrap_or(100).max(1).min(10000);
    let loss_threshold = loss_threshold_percent.unwrap_or(10.0).max(0.0).min(100.0);
    tracing::debug!("→ network_ping: host={}, count={}, threshold={}, loss_threshold={}", host, packets, threshold, loss_threshold);

    let (ping, evaluation) = pinger::ping_host(&host, packets, threshold, loss_threshold, 2).await;

    tracing::info!("← network_ping: status={}, loss={:?}, avg={:?}ms, jitter={:?}ms", evaluation.status, ping.loss_percent, ping.avg_ms, ping.jitter_ms);

    CommandResult::ok(SinglePingResult { ping, evaluation })
}

#[tauri::command]
pub async fn network_geo() -> CommandResult<serde_json::Value> {
    tracing::debug!("→ network_geo");

    match reqwest::get("http://ip-api.com/json/?fields=status,country,countryCode,regionName,city,isp,org,query").await {
        Ok(resp) => {
            match resp.json::<serde_json::Value>().await {
                Ok(data) => {
                    tracing::info!("← network_geo: status={:?}", data.get("status"));
                    CommandResult::ok(data)
                }
                Err(e) => {
                    tracing::error!("← network_geo: JSON parse error — {}", e);
                    CommandResult::err(format!("JSON parse error: {}", e))
                }
            }
        }
        Err(e) => {
            tracing::error!("← network_geo: HTTP error — {}", e);
            CommandResult::err(format!("HTTP request failed: {}", e))
        }
    }
}
