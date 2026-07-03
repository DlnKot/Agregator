use std::process::Command;

use crate::utils::CommandResult;

#[tauri::command]
pub fn network_ping(host: String, count: u32) -> CommandResult<Vec<f64>> {
    let count = count.max(1).min(10);
    tracing::debug!("→ network_ping: host={}, count={}", host, count);
    let mut rtts = Vec::new();

    for i in 0..count {
        let start = std::time::Instant::now();
        let output = if cfg!(target_os = "windows") {
            Command::new("ping")
                .arg("-n").arg("1")
                .arg(&host)
                .output()
        } else {
            Command::new("ping")
                .arg("-c").arg("1")
                .arg("-t").arg("5")
                .arg(&host)
                .output()
        };

        match output {
            Ok(o) if o.status.success() => {
                let elapsed = start.elapsed();
                let ms = elapsed.as_secs_f64() * 1000.0;
                tracing::debug!("  ping #{}/{}: {:.1}ms", i + 1, count, ms);
                rtts.push(ms);
            }
            Ok(o) => {
                let stderr = String::from_utf8_lossy(&o.stderr);
                tracing::warn!("  ping #{}/{}: failed — {}", i + 1, count, stderr.trim());
            }
            Err(e) => {
                tracing::error!("  ping #{}/{}: error — {}", i + 1, count, e);
            }
        }
    }

    let avg = if rtts.is_empty() {
        0.0
    } else {
        rtts.iter().sum::<f64>() / rtts.len() as f64
    };
    tracing::info!("← network_ping: {}/{} succeeded, avg={:.1}ms", rtts.len(), count, avg);
    CommandResult::ok(rtts)
}
