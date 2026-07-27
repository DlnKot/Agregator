use std::process::Command;

use crate::models::*;
use crate::utils::CommandResult;

fn parse_unix_ping(output: &str) -> (Option<f64>, Option<f64>, Option<f64>, Option<f64>) {
    let mut loss = None;
    let mut min_ms = None;
    let mut avg_ms = None;
    let mut max_ms = None;

    // "10 packets transmitted, 10 packets received, 0.0% packet loss"
    // macOS: "10 packets transmitted, 10 packets received, 0.0% packet loss"
    // linux: "10 packets transmitted, 10 received, 0% packet loss"
    for line in output.lines() {
        let lower = line.to_lowercase();
        if lower.contains("packet loss") || lower.contains("packets received") {
            for word in lower.split_whitespace() {
                if word.ends_with("%") {
                    if let Ok(pct) = word.trim_end_matches('%').parse::<f64>() {
                        loss = Some(pct);
                    }
                }
            }
        }
    }

    // "round-trip min/avg/max/stddev = 10.123/20.456/30.789/1.234 ms"
    // linux: "rtt min/avg/max/mdev = ..."
    for line in output.lines() {
        let lower = line.to_lowercase();
        if lower.contains("round-trip") || lower.contains("rtt min/avg/max") {
            if let Some(eq) = line.find('=') {
                let after = &line[eq + 1..].trim();
                let parts: Vec<&str> = after.split('/').collect();
                if parts.len() >= 3 {
                    min_ms = parts[0].trim().parse::<f64>().ok();
                    avg_ms = parts[1].trim().parse::<f64>().ok();
                    max_ms = parts[2].trim().parse::<f64>().ok();
                }
            }
        }
    }

    (loss, min_ms, avg_ms, max_ms)
}

fn parse_windows_ping(output: &str) -> (Option<f64>, Option<f64>, Option<f64>, Option<f64>) {
    let mut loss = None;
    let mut min_ms = None;
    let mut avg_ms = None;
    let mut max_ms = None;

    // "Lost = 0 (0% loss)" or "потеряно = 0 (0% потерь)"
    for line in output.lines() {
        if line.contains('%') {
            if let Some(start) = line.find('(') {
                let rest = &line[start + 1..];
                if let Some(end) = rest.find('%') {
                    if let Ok(pct) = rest[..end].parse::<f64>() {
                        loss = Some(pct);
                    }
                }
            }
        }
    }

    // "Minimum = 1ms, Maximum = 2ms, Average = 1ms"
    // Russian: "Минимальное = 1мсек, Максимальное = 2 мсек, Среднее = 1 мсек"
    for line in output.lines() {
        let lower = line.to_lowercase();
        if lower.contains("minimum") || lower.contains("миним") {
            let nums: Vec<f64> = line
                .split(|c: char| !c.is_ascii_digit() && c != '.')
                .filter_map(|s| s.parse::<f64>().ok())
                .collect();
            if nums.len() >= 3 {
                min_ms = Some(nums[0]);
                max_ms = Some(nums[1]);
                avg_ms = Some(nums[2]);
            }
        }
    }

    (loss, min_ms, avg_ms, max_ms)
}

fn evaluate_ping(
    loss: Option<f64>,
    avg_ms: Option<f64>,
    threshold_ms: u64,
) -> PingEval {
    let threshold = threshold_ms.max(1).min(10000);

    if loss.is_none() && avg_ms.is_none() {
        return PingEval {
            status: "error".into(),
            label: "Ошибка".into(),
            recommendation: "Не удалось выполнить проверку. Проверьте DNS, интернет и корпоративный VPN.".into(),
            threshold_ms: threshold,
        };
    }

    if let Some(l) = loss {
        if l >= 100.0 {
            return PingEval {
                status: "down".into(),
                label: "Недоступен".into(),
                recommendation: "Сервер не отвечает. Проверьте интернет, DNS, корпоративный VPN/прокси и доступность сервиса.".into(),
                threshold_ms: threshold,
            };
        }
        if l > 0.0 {
            return PingEval {
                status: "loss".into(),
                label: "Потери пакетов".into(),
                recommendation: "Есть потери пакетов. Рекомендации: попробуйте проводное подключение, перезапустите роутер, проверьте Wi‑Fi.".into(),
                threshold_ms: threshold,
            };
        }
    }

    if let Some(avg) = avg_ms {
        if avg > threshold as f64 {
            return PingEval {
                status: "high_latency".into(),
                label: "Нестабильно".into(),
                recommendation: "Высокая задержка. Рекомендации: проверьте загрузку сети, попробуйте провод, отключите фоновые загрузки/стриминг.".into(),
                threshold_ms: threshold,
            };
        }
    }

    PingEval {
        status: "ok".into(),
        label: "OK".into(),
        recommendation: "".into(),
        threshold_ms: threshold,
    }
}

#[tauri::command]
pub async fn network_ping(host: String, count: u32, threshold_ms: Option<u64>) -> CommandResult<SinglePingResult> {
    let packets = count.max(1).min(50);
    let threshold = threshold_ms.unwrap_or(100).max(1).min(10000);
    tracing::debug!("→ network_ping: host={}, count={}, threshold={}", host, packets, threshold);

    let host_clone = host.clone();
    let result = tokio::task::spawn_blocking(move || {
        if cfg!(target_os = "windows") {
            Command::new("ping")
                .arg("-n").arg(packets.to_string())
                .arg("-w").arg("1000")
                .arg(&host_clone)
                .output()
        } else {
            Command::new("ping")
                .arg("-c").arg(packets.to_string())
                .arg(&host_clone)
                .output()
        }
    }).await;

    match result {
        Ok(Ok(o)) => {
            let combined = format!(
                "{}\n{}",
                String::from_utf8_lossy(&o.stdout),
                String::from_utf8_lossy(&o.stderr)
            );
            let raw = combined.trim().to_string();

            let (loss, min_ms, avg_ms, max_ms) = if cfg!(target_os = "windows") {
                parse_windows_ping(&combined)
            } else {
                parse_unix_ping(&combined)
            };

            let ping = PingDetail {
                loss_percent: loss,
                avg_ms,
                min_ms,
                max_ms,
                raw: Some(raw),
                error: if o.status.success() { None } else { Some("Ping exit code non-zero".into()) },
            };

            let evaluation = evaluate_ping(loss, avg_ms, threshold);

            tracing::info!("← network_ping: status={}, loss={:?}, avg={:?}ms", evaluation.status, loss, avg_ms);

            CommandResult::ok(SinglePingResult { ping, evaluation })
        }
        Ok(Err(e)) => {
            tracing::error!("← network_ping: FAILED — {}", e);
            let ping = PingDetail {
                loss_percent: None,
                avg_ms: None,
                min_ms: None,
                max_ms: None,
                raw: None,
                error: Some(format!("Failed to execute ping: {}", e)),
            };
            let evaluation = PingEval {
                status: "error".into(),
                label: "Ошибка".into(),
                recommendation: "Не удалось выполнить ping. Проверьте доступность команды ping.".into(),
                threshold_ms: threshold,
            };
            CommandResult::ok(SinglePingResult { ping, evaluation })
        }
        Err(e) => {
            tracing::error!("← network_ping: JOIN ERROR — {}", e);
            CommandResult::err(format!("Task join error: {}", e))
        }
    }
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
