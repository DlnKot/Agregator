use std::net::IpAddr;
use std::time::Duration;

use surge_ping::{Client, Config, PingIdentifier, PingSequence};

use crate::models::{PingDetail, PingEval};

/// Ping a host n times and return ping details + evaluation.
pub async fn ping_host(
    host: &str,
    count: u32,
    threshold_ms: u64,
    loss_threshold_percent: f64,
    timeout_secs: u64,
) -> (PingDetail, PingEval) {
    let packets = count.max(1).min(50);
    let threshold = threshold_ms.max(1).min(10000);
    let timeout = Duration::from_secs(timeout_secs.max(1).min(30));

    let ip: IpAddr = match resolve_host(host).await {
        Ok(ip) => ip,
        Err(e) => {
            tracing::error!("DNS resolution failed for {}: {}", host, e);
            let ping = PingDetail {
                loss_percent: Some(100.0),
                avg_ms: None,
                min_ms: None,
                max_ms: None,
                jitter_ms: None,
                raw: None,
                error: Some(format!("DNS resolution failed: {}", e)),
            };
            let eval = make_eval(None, None, threshold, loss_threshold_percent, None);
            return (ping, eval);
        }
    };

    let client = match Client::new(&Config::default()) {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to create ICMP client: {}", e);
            let ping = PingDetail {
                loss_percent: Some(100.0),
                avg_ms: None,
                min_ms: None,
                max_ms: None,
                jitter_ms: None,
                raw: None,
                error: Some(format!("Failed to create ICMP socket: {}", e)),
            };
            let eval = PingEval {
                status: "error".into(),
                label: "Ошибка".into(),
                recommendation: "Не удалось создать ICMP сокет. Возможно, нужны права администратора.".into(),
                threshold_ms: threshold,
            };
            return (ping, eval);
        }
    };

    let mut pinger = client.pinger(ip, PingIdentifier(0)).await;
    pinger.timeout(timeout);

    let mut rtts: Vec<f64> = Vec::with_capacity(packets as usize);
    let mut loss_count = 0u32;
    let payload = [0u8; 56];

    for seq in 0..packets {
        match pinger.ping(PingSequence(seq as u16), &payload).await {
            Ok((_packet, duration)) => {
                let ms = duration.as_secs_f64() * 1000.0;
                rtts.push(ms);
            }
            Err(e) => {
                tracing::debug!("Ping seq {} to {} failed: {}", seq, host, e);
                loss_count += 1;
            }
        }
    }

    let total = packets;
    let loss_percent = (loss_count as f64 / total as f64) * 100.0;
    let (min_ms, avg_ms, max_ms, jitter_ms) = if rtts.is_empty() {
        (None, None, None, None)
    } else {
        let sum: f64 = rtts.iter().sum();
        let avg = sum / rtts.len() as f64;
        let min = rtts.iter().cloned().fold(f64::MAX, f64::min);
        let max = rtts.iter().cloned().fold(f64::MIN, f64::max);
        // compute standard deviation
        let var_sum: f64 = rtts.iter().map(|v| { let d = v - avg; d * d }).sum();
        let variance = var_sum / rtts.len() as f64;
        let stddev = variance.sqrt();
        (Some(min), Some(avg), Some(max), Some(stddev))
    };

    let ping = PingDetail {
        loss_percent: Some(loss_percent),
        avg_ms,
        min_ms,
        max_ms,
        jitter_ms,
        raw: None,
        error: if loss_percent == 100.0 {
            Some("All packets lost".into())
        } else {
            None
        },
    };

    let eval = make_eval(Some(loss_percent), avg_ms, threshold, loss_threshold_percent, jitter_ms);

    (ping, eval)
}

/// Quick single-ping check (boolean result) for VPN checks.
pub async fn ping_ok(host: &str, timeout_secs: u64) -> bool {
    // Use a permissive loss threshold for quick checks
    let (ping, _) = ping_host(host, 1, 10000, 50.0, timeout_secs).await;
    ping.error.is_none() && ping.loss_percent.unwrap_or(100.0) < 100.0
}

async fn resolve_host(host: &str) -> Result<IpAddr, String> {
    if let Ok(ip) = host.parse::<IpAddr>() {
        return Ok(ip);
    }
    match tokio::net::lookup_host((host, 0)).await {
        Ok(mut addrs) => addrs
            .next()
            .map(|a| a.ip())
            .ok_or_else(|| format!("No addresses found for {}", host)),
        Err(e) => Err(format!("DNS lookup failed for {}: {}", host, e)),
    }
}

fn make_eval(
    loss: Option<f64>,
    avg_ms: Option<f64>,
    threshold_ms: u64,
    loss_threshold_percent: f64,
    jitter_ms: Option<f64>,
) -> PingEval {
    if loss.is_none() && avg_ms.is_none() {
        return PingEval {
            status: "error".into(),
            label: "Ошибка".into(),
            recommendation: "Не удалось выполнить проверку. Проверьте DNS, интернет и корпоративный VPN.".into(),
            threshold_ms,
        };
    }

    if let Some(l) = loss {
        if l >= 100.0 {
            return PingEval {
                status: "down".into(),
                label: "Недоступен".into(),
                recommendation: "Сервер не отвечает. Проверьте интернет, DNS, корпоративный VPN/прокси и доступность сервиса.".into(),
                threshold_ms,
            };
        }
        // Consider small loss acceptable up to configured threshold
        if l > loss_threshold_percent {
            return PingEval {
                status: "loss".into(),
                label: "Потери пакетов".into(),
                recommendation: "Есть потери пакетов выше допустимого порога. Рекомендации: попробуйте проводное подключение, перезапустите роутер, проверьте Wi‑Fi.".into(),
                threshold_ms,
            };
        }
    }

    if let Some(avg) = avg_ms {
        if avg > threshold_ms as f64 {
            return PingEval {
                status: "high_latency".into(),
                label: "Нестабильно".into(),
                recommendation: "Высокая задержка. Рекомендации: проверьте загрузку сети, попробуйте провод, отключите фоновые загрузки/стриминг.".into(),
                threshold_ms,
            };
        }
    }

    // Additional note about high jitter
    if let (Some(j), Some(a)) = (jitter_ms, avg_ms) {
        let jitter_threshold = (a * 0.5).max(50.0);
        if j > jitter_threshold {
            return PingEval {
                status: "unstable".into(),
                label: "Нестабильно".into(),
                recommendation: "Высокая вариативность задержки (джиттер). Попробуйте проводное подключение или проверьте фоновые нагрузки.".into(),
                threshold_ms,
            };
        }
    }

    PingEval {
        status: "ok".into(),
        label: "OK".into(),
        recommendation: "".into(),
        threshold_ms,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn eval_down_on_100_loss() {
        let e = make_eval(Some(100.0), Some(10.0), 100, 10.0, Some(5.0));
        assert_eq!(e.status, "down");
    }

    #[test]
    fn eval_loss_above_threshold() {
        let e = make_eval(Some(15.0), Some(10.0), 100, 10.0, Some(5.0));
        assert_eq!(e.status, "loss");
    }

    #[test]
    fn eval_ok_when_loss_below_threshold_and_latency_ok() {
        let e = make_eval(Some(1.0), Some(20.0), 100, 10.0, Some(10.0));
        assert_eq!(e.status, "ok");
    }

    #[test]
    fn eval_high_latency() {
        let e = make_eval(Some(0.0), Some(200.0), 100, 10.0, Some(10.0));
        assert_eq!(e.status, "high_latency");
    }

    #[test]
    fn eval_unstable_on_high_jitter() {
        // avg=100, jitter_threshold = max(50, 50) = 50 -> jitter=60 triggers unstable
        let e = make_eval(Some(0.0), Some(100.0), 100, 10.0, Some(60.0));
        assert_eq!(e.status, "unstable");
    }
}