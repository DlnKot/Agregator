use std::fs::OpenOptions;
use std::path::PathBuf;

use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{fmt, Registry};

pub fn init_logging(log_dir: PathBuf) -> Option<WorkerGuard> {
    std::fs::create_dir_all(&log_dir).ok()?;

    let log_path = log_dir.join("app.log");

    // Rotate: keep last 3 logs
    rotate_logs(&log_dir, 3);

    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .expect("Failed to open log file");

    let (non_blocking, guard) = tracing_appender::non_blocking(log_file);

    let file_layer = fmt::layer()
        .with_writer(non_blocking)
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .with_ansi(false);

    let stdout_layer = fmt::layer()
        .with_writer(std::io::stdout)
        .with_target(false)
        .with_ansi(true);

    Registry::default()
        .with(stdout_layer)
        .with(file_layer)
        .init();

    tracing::info!("Logger initialized — log file: {}", log_path.display());

    Some(guard)
}

fn rotate_logs(log_dir: &PathBuf, keep: usize) {
    let log_path = log_dir.join("app.log");
    if !log_path.exists() {
        return;
    }
    // Shift backups: .2 → .3, .1 → .2, current → .1
    for i in (1..keep).rev() {
        let src = log_dir.join(format!("app.log.{}", i));
        let dst = log_dir.join(format!("app.log.{}", i + 1));
        if src.exists() {
            let _ = std::fs::rename(&src, &dst);
        }
    }
    let dst = log_dir.join("app.log.1");
    let _ = std::fs::rename(&log_path, &dst);
}
