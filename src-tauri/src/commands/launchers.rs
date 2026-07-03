use std::path::Path;
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;

use directories::BaseDirs;
use serde_json::Value;

use crate::models::*;
use crate::utils::CommandResult;

fn launch_exe(program: &str, args: &[&str]) -> CommandResult {
    tracing::debug!("  launch_exe: {} {:?}", program, args);
    match Command::new(program).args(args).spawn() {
        Ok(_) => {
            tracing::info!("  launch_exe: {} started", program);
            CommandResult::ok_empty()
        }
        Err(e) => {
            tracing::error!("  launch_exe: {} FAILED — {}", program, e);
            CommandResult::err(format!("Failed to launch {}: {}", program, e))
        }
    }
}

fn launch_mac(app_name: &str, args: &[&str]) -> CommandResult {
    tracing::debug!("  launch_mac: {} {:?}", app_name, args);
    let mut cmd = Command::new("open");
    cmd.arg("-a").arg(app_name);
    for a in args {
        cmd.arg(a);
    }
    match cmd.spawn() {
        Ok(_) => {
            tracing::info!("  launch_mac: {} started", app_name);
            CommandResult::ok_empty()
        }
        Err(e) => {
            tracing::error!("  launch_mac: {} FAILED — {}", app_name, e);
            CommandResult::err(format!("Failed to launch {}: {}", app_name, e))
        }
    }
}

fn macos_check_vpn_connected() -> bool {
    if let Ok(output) = Command::new("scutil").args(["--nc", "list"]).output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        stdout.contains("Connected")
    } else {
        false
    }
}

fn macos_get_connected_vpn_names() -> Vec<String> {
    let mut names = Vec::new();
    if let Ok(output) = Command::new("scutil").args(["--nc", "list"]).output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if line.contains("[Connected]") {
                if let Some(paren) = line.find('(') {
                    let name = line[..paren].trim();
                    if !name.is_empty() {
                        names.push(name.to_string());
                    }
                }
            }
        }
    }
    names
}

// ==================== RuDesktop Helpers ====================

fn find_rudesktop_path() -> Option<String> {
    if cfg!(target_os = "windows") {
        let known_paths = [
            "C:\\Program Files\\RuDesktop\\rudesktop.exe",
            "C:\\Program Files (x86)\\RuDesktop\\rudesktop.exe",
        ];
        for p in &known_paths {
            if Path::new(p).exists() {
                return Some(p.to_string());
            }
        }
        if let Ok(output) = Command::new("where").arg("rudesktop.exe").output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Some(line) = stdout.lines().next() {
                    let p = line.trim();
                    if !p.is_empty() && Path::new(p).exists() {
                        return Some(p.to_string());
                    }
                }
            }
        }
    } else if cfg!(target_os = "macos") {
        let known_paths = [
            "/Applications/RuDesktop.app",
        ];
        for p in &known_paths {
            if Path::new(p).exists() {
                return Some(p.to_string());
            }
        }
        if let Some(home) = std::env::var("HOME").ok() {
            let user_path = format!("{}/Applications/RuDesktop.app", home);
            if Path::new(&user_path).exists() {
                return Some(user_path);
            }
        }
        if let Ok(output) = Command::new("mdfind")
            .args(["kMDItemCFBundleIdentifier == \"ru.rudesktop.client\""])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Some(line) = stdout.lines().next() {
                    let p = line.trim();
                    if !p.is_empty() && Path::new(p).exists() {
                        return Some(p.to_string());
                    }
                }
            }
        }
    }
    None
}

fn rudesktop_binary_path(app_path: &str) -> String {
    if cfg!(target_os = "macos") {
        let path = Path::new(app_path);
        if path.is_dir() && app_path.ends_with(".app") {
            for name in &["rudesktop", "RuDesktop"] {
                let candidate = path.join("Contents").join("MacOS").join(name);
                if candidate.exists() {
                    return candidate.to_string_lossy().to_string();
                }
            }
        }
    }
    app_path.to_string()
}

fn get_rudesktop_device_id_from_binary(bin_path: &str) -> Option<String> {
    let actual_bin = rudesktop_binary_path(bin_path);
    let result = Command::new(&actual_bin)
        .arg("--get-id")
        .output()
        .ok()?;
    if result.status.success() {
        let stdout = String::from_utf8_lossy(&result.stdout);
        let id = stdout.trim();
        if !id.is_empty() {
            return Some(id.to_string());
        }
    }
    None
}

fn get_rudesktop_device_id_from_config() -> Option<String> {
    let base = BaseDirs::new()?;
    let config_path = if cfg!(target_os = "macos") {
        base.data_dir().join("RuDesktop").join("config.json")
    } else if cfg!(target_os = "windows") {
        base.data_dir().join("RuDesktop").join("config.json")
    } else {
        return None;
    };
    let content = std::fs::read_to_string(config_path).ok()?;
    let json: Value = serde_json::from_str(&content).ok()?;
    if let Some(id) = json.get("deviceId").and_then(|v| v.as_str()) {
        return Some(id.to_string());
    }
    if let Some(id) = json.get("device_id").and_then(|v| v.as_str()) {
        return Some(id.to_string());
    }
    None
}

fn get_rudesktop_device_id(bin_path: Option<&str>) -> Option<String> {
    if let Some(path) = bin_path {
        if let Some(id) = get_rudesktop_device_id_from_binary(path) {
            return Some(id);
        }
    }
    get_rudesktop_device_id_from_config()
}

// ==================== RDP ====================

fn find_mac_rdp_app() -> (String, Option<String>) {
    let bundle_id = "com.microsoft.rdc.macos".to_string();

    // Try mdfind by bundle identifier
    if let Ok(output) = Command::new("mdfind")
        .args([r#"kMDItemCFBundleIdentifier == "com.microsoft.rdc.macos""#])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = stdout.lines().next() {
                let p = line.trim().to_string();
                if !p.is_empty() && Path::new(&p).exists() {
                    tracing::info!("  find_mac_rdp_app: found via mdfind at {}", p);
                    return (bundle_id, Some(p));
                }
            }
        }
    }

    // Known paths (Windows App is the new name for Microsoft Remote Desktop)
    let candidates = [
        "/Applications/Windows App.app",
        "/Applications/Microsoft Remote Desktop.app",
    ];
    for p in &candidates {
        if Path::new(p).exists() {
            tracing::info!("  find_mac_rdp_app: found at {}", p);
            return (bundle_id, Some(p.to_string()));
        }
    }

    // User Applications directory
    if let Some(home) = std::env::var("HOME").ok() {
        let user_candidates = [
            format!("{}/Applications/Windows App.app", home),
            format!("{}/Applications/Microsoft Remote Desktop.app", home),
        ];
        for p in &user_candidates {
            if Path::new(&p).exists() {
                tracing::info!("  find_mac_rdp_app: found at {}", p);
                return (bundle_id, Some(p.to_string()));
            }
        }
    }

    (bundle_id, None)
}

#[tauri::command]
pub fn launch_rdp(connection: Connection, settings: Value) -> CommandResult {
    let host = connection.host.trim().to_string();
    if host.is_empty() {
        return CommandResult::err("Invalid host: must be non-empty");
    }
    tracing::debug!("→ launch_rdp: host={}", host);

    let rdp_settings = settings.get("rdp").unwrap_or(&settings);

    // Build temp .rdp file path
    let temp_dir = std::env::temp_dir();
    let conn_id = connection.id.clone().unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let rdp_path = temp_dir.join(format!("rdm_{}.rdp", conn_id));
    let rdp_path_str = rdp_path.to_string_lossy().to_string();

    // Resolution
    let resolution = rdp_settings
        .get("resolution")
        .and_then(|v| v.as_str())
        .unwrap_or("1920x1080");
    let fullscreen = resolution == "fullscreen"
        || rdp_settings
            .get("startFullScreen")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

    let (width, height) = if !fullscreen && resolution.contains('x') {
        let parts: Vec<&str> = resolution.split('x').collect();
        let w = parts
            .first()
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(1920);
        let h = parts
            .get(1)
            .and_then(|s| s.parse::<u32>().ok())
            .unwrap_or(1080);
        (w, h)
    } else {
        (1920, 1080)
    };

    // Build .rdp content
    let mut lines: Vec<String> = Vec::new();

    lines.push(format!("full address:s:{}", host));
    lines.push(format!(
        "username:s:{}",
        connection.username.as_deref().unwrap_or("")
    ));
    lines.push(format!(
        "screen mode id:i:{}",
        if fullscreen { 2 } else { 1 }
    ));
    lines.push(format!("desktopwidth:i:{}", width));
    lines.push(format!("desktopheight:i:{}", height));
    lines.push(format!(
        "session bpp:i:{}",
        rdp_settings
            .get("colorDepth")
            .and_then(|v| v.as_str())
            .unwrap_or("32")
    ));
    lines.push(format!("winposstr:s:0,3,0,0,{},{}", width, height));
    lines.push(format!(
        "use multimon:i:{}",
        rdp_settings
            .get("multimon")
            .and_then(|v| v.as_bool())
            .unwrap_or(false) as u8
    ));
    lines.push(format!(
        "span monitors:i:{}",
        rdp_settings
            .get("span")
            .and_then(|v| v.as_bool())
            .unwrap_or(false) as u8
    ));
    lines.push("displayconnectionbar:i:1".to_string());
    lines.push("enableworkspacereconnect:i:0".to_string());
    lines.push(format!(
        "redirectclipboard:i:{}",
        rdp_settings
            .get("clipboard")
            .and_then(|v| v.as_bool())
            .unwrap_or(true) as u8
    ));
    lines.push(format!(
        "drivestoredirect:s:{}",
        if rdp_settings
            .get("driveMapping")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
        {
            "*"
        } else {
            ""
        }
    ));

    let redirect = rdp_settings.get("redirect");
    lines.push(format!(
        "redirectprinters:i:{}",
        redirect
            .and_then(|r| r.get("printers"))
            .and_then(|v| v.as_bool())
            .unwrap_or(true) as u8
    ));
    lines.push(format!(
        "redirectsmartcards:i:{}",
        redirect
            .and_then(|r| r.get("smartcards"))
            .and_then(|v| v.as_bool())
            .unwrap_or(true) as u8
    ));
    lines.push(format!(
        "redirectwebauthn:i:{}",
        redirect
            .and_then(|r| r.get("webauthn"))
            .and_then(|v| v.as_bool())
            .unwrap_or(true) as u8
    ));
    lines.push("redirectcomports:i:0".to_string());
    lines.push("redirectposdevices:i:0".to_string());
    lines.push("redirectlocation:i:0".to_string());

    let audio = rdp_settings.get("audio");
    let audio_playback = audio
        .and_then(|a| a.get("playback"))
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    lines.push(format!("audiomode:i:{}", if audio_playback { 0 } else { 2 }));
    lines.push(format!(
        "audiocapturemode:i:{}",
        audio
            .and_then(|a| a.get("capture"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false) as u8
    ));

    lines.push("videoplaybackmode:i:1".to_string());

    let perf = rdp_settings.get("performance");
    lines.push(format!(
        "disable wallpaper:i:{}",
        perf
            .and_then(|p| p.get("wallpaper"))
            .and_then(|v| v.as_bool())
            .unwrap_or(true) as u8
    ));
    lines.push(format!(
        "allow font smoothing:i:{}",
        perf
            .and_then(|p| p.get("fontSmoothing"))
            .and_then(|v| v.as_bool())
            .unwrap_or(true) as u8
    ));
    lines.push(format!(
        "allow desktop composition:i:{}",
        perf
            .and_then(|p| p.get("desktopComposition"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false) as u8
    ));
    lines.push(format!(
        "disable full window drag:i:{}",
        perf
            .and_then(|p| p.get("fullWindowDrag"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false) as u8
    ));
    lines.push(format!(
        "disable menu anims:i:{}",
        perf
            .and_then(|p| p.get("menuAnimations"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false) as u8
    ));
    lines.push("disable themes:i:0".to_string());
    lines.push("disable cursor setting:i:0".to_string());

    lines.push("compression:i:1".to_string());
    lines.push("networkautodetect:i:1".to_string());
    lines.push("bandwidthautodetect:i:1".to_string());
    lines.push("connection type:i:7".to_string());
    lines.push("bitmapcachepersistenable:i:1".to_string());
    lines.push("autoreconnection enabled:i:1".to_string());
    lines.push(format!(
        "prompt for credentials:i:{}",
        rdp_settings
            .get("promptCredentials")
            .and_then(|v| v.as_bool())
            .unwrap_or(false) as u8
    ));
    lines.push(format!(
        "administrative session:i:{}",
        rdp_settings
            .get("useAdminSession")
            .and_then(|v| v.as_bool())
            .unwrap_or(false) as u8
    ));
    lines.push("authentication level:i:2".to_string());
    lines.push("negotiate security layer:i:1".to_string());
    lines.push("remoteapplicationmode:i:0".to_string());
    lines.push("alternate shell:s:".to_string());
    lines.push("shell working directory:s:".to_string());
    lines.push("gatewayhostname:s:".to_string());
    lines.push("gatewayusagemethod:i:4".to_string());
    lines.push("gatewaycredentialssource:i:4".to_string());
    lines.push("gatewayprofileusagemethod:i:0".to_string());
    lines.push("promptcredentialonce:i:0".to_string());
    lines.push("gatewaybrokeringtype:i:0".to_string());
    lines.push("use redirection server name:i:0".to_string());
    lines.push("rdgiskdcproxy:i:0".to_string());
    lines.push("kdcproxyname:s:".to_string());
    lines.push("enablerdsaadauth:i:0".to_string());
    lines.push("remoteappmousemoveinject:i:1".to_string());

    // Custom flags from settings
    if let Some(custom) = rdp_settings
        .get("customFlags")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
    {
        lines.extend(split_args(custom));
    }

    // Write .rdp file
    let content = lines.join("\n");
    if let Err(e) = std::fs::write(&rdp_path, &content) {
        tracing::error!("  launch_rdp: FAILED to write .rdp file — {}", e);
        return CommandResult::err(format!("Failed to create RDP file: {}", e));
    }
    tracing::info!("  launch_rdp: wrote {}", rdp_path_str);

    // Schedule temp file deletion after 10 seconds
    let delete_path = rdp_path.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(10));
        if let Err(e) = std::fs::remove_file(&delete_path) {
            tracing::warn!("  launch_rdp: failed to delete temp file — {}", e);
        }
    });

    // Platform-specific launch
    if cfg!(target_os = "windows") {
        match Command::new("mstsc.exe")
            .arg(&rdp_path_str)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
        {
            Ok(_) => {
                tracing::info!("← launch_rdp: mstsc.exe started");
                CommandResult::ok_empty()
            }
            Err(e) => {
                tracing::error!("← launch_rdp: mstsc.exe FAILED — {}", e);
                CommandResult::err(format!("Failed to launch mstsc.exe: {}", e))
            }
        }
    } else if cfg!(target_os = "macos") {
        let (bundle_id, app_path) = find_mac_rdp_app();
        if let Some(ref path) = app_path {
            tracing::info!("  launch_rdp: using Windows App at {}", path);
        } else {
            tracing::warn!("  launch_rdp: Windows App not found, falling back to default .rdp handler");
        }

        // Try launching via bundle ID first
        let result = Command::new("open")
            .arg("-b")
            .arg(&bundle_id)
            .arg(&rdp_path_str)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();

        match result {
            Ok(_) => {
                tracing::info!("← launch_rdp: open -b {} started", bundle_id);
                CommandResult::ok_empty()
            }
            Err(_) => {
                // Fallback: use default .rdp handler
                tracing::warn!("  launch_rdp: open -b failed, falling back to default handler");
                match Command::new("open")
                    .arg(&rdp_path_str)
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                {
                    Ok(_) => {
                        tracing::info!("← launch_rdp: default handler started");
                        CommandResult::ok_empty()
                    }
                    Err(e) => {
                        tracing::error!("← launch_rdp: open FAILED — {}", e);
                        CommandResult::err(format!("Failed to open RDP file: {}", e))
                    }
                }
            }
        }
    } else {
        // Linux: xfreerdp
        let mut args = vec![format!("/v:{}", host)];
        if let Some(ref user) = connection.username {
            args.push(format!("/u:{}", user));
        }
        if let Some(custom) = rdp_settings
            .get("customFlags")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            args.extend(split_args(custom));
        }

        match Command::new("xfreerdp")
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
        {
            Ok(_) => {
                tracing::info!("← launch_rdp: xfreerdp started");
                CommandResult::ok_empty()
            }
            Err(e) => {
                tracing::error!("← launch_rdp: xfreerdp FAILED — {}", e);
                CommandResult::err(format!("Failed to launch xfreerdp: {}", e))
            }
        }
    }
}

// ==================== Shared Helpers ====================

fn normalize_url(url: &str) -> String {
    let url = url.trim();
    if url.is_empty() {
        return String::new();
    }
    if !url.starts_with("http://") && !url.starts_with("https://") {
        format!("https://{}", url)
    } else {
        url.to_string()
    }
}

fn strip_domain_from_username(user_name: &str) -> String {
    if user_name.is_empty() {
        return String::new();
    }
    if let Some(idx) = user_name.find('\\') {
        return user_name[idx + 1..].trim().to_string();
    }
    if let Some(idx) = user_name.find('/') {
        return user_name[idx + 1..].trim().to_string();
    }
    user_name.trim().to_string()
}

fn split_args(raw: &str) -> Vec<String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;

    for c in raw.chars() {
        match c {
            '"' => in_quotes = !in_quotes,
            ' ' if !in_quotes => {
                if !current.is_empty() {
                    args.push(current.clone());
                    current.clear();
                }
            }
            _ => current.push(c),
        }
    }
    if !current.is_empty() {
        args.push(current);
    }
    args
}

fn find_exe_recursive(dir: &Path, exe_name: &str, depth: usize, max_depth: usize) -> Option<String> {
    if depth > max_depth {
        return None;
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(found) = find_exe_recursive(&path, exe_name, depth + 1, max_depth) {
                    return Some(found);
                }
            } else if let Some(name) = path.file_name() {
                if name.to_string_lossy().to_lowercase() == exe_name.to_lowercase() {
                    return Some(path.to_string_lossy().to_string());
                }
            }
        }
    }
    None
}

// ==================== Horizon ====================

fn find_horizon_mac() -> Option<(String, Option<String>)> {
    let locations = [
        "/Applications/VMware Horizon Client.app",
        "/Applications/VMware Horizon.app",
    ];

    for loc in &locations {
        if Path::new(loc).exists() {
            let app = loc.to_string();
            let cli = find_horizon_mac_cli(loc);
            tracing::info!("  find_horizon_mac: found app at {}", app);
            return Some((app, cli));
        }
    }

    if let Some(ref home) = std::env::var("HOME").ok() {
        let user_app = format!("{}/Applications/VMware Horizon Client.app", home);
        if Path::new(&user_app).exists() {
            let cli = find_horizon_mac_cli(&user_app);
            tracing::info!("  find_horizon_mac: found app at {}", user_app);
            return Some((user_app, cli));
        }
    }

    if let Ok(output) = Command::new("mdfind")
        .args(["kMDItemCFBundleIdentifier == \"com.vmware.horizon\""])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = stdout.lines().next() {
                let p = line.trim().to_string();
                if !p.is_empty() && Path::new(&p).exists() {
                    let cli = find_horizon_mac_cli(&p);
                    tracing::info!("  find_horizon_mac: found via mdfind at {}", p);
                    return Some((p, cli));
                }
            }
        }
    }

    None
}

fn find_horizon_mac_cli(app_path: &str) -> Option<String> {
    let arm = format!("{}/Contents/Launchers/viewclient-macosx-arm64", app_path);
    let intel = format!("{}/Contents/Launchers/viewclient-macosx", app_path);
    if Path::new(&arm).exists() {
        Some(arm)
    } else if Path::new(&intel).exists() {
        Some(intel)
    } else {
        None
    }
}

fn find_horizon_windows(custom_path: Option<&str>) -> Option<String> {
    if let Some(p) = custom_path {
        if Path::new(p).exists() {
            tracing::info!("  find_horizon_windows: using custom path {}", p);
            return Some(p.to_string());
        }
    }

    let reg_key = "HKLM\\SOFTWARE\\VMware, Inc.\\VMware VDM";
    let reg_value = "ClientInstallPath";

    for arch in &["/reg:64", "/reg:32", ""] {
        let mut cmd = Command::new("reg");
        cmd.args(["query", reg_key, "/v", reg_value]);
        if !arch.is_empty() {
            cmd.arg(arch);
        }
        if let Ok(output) = cmd.output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    if line.contains("ClientInstallPath") {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if let Some(raw_path) = parts.last() {
                            let candidate = if raw_path.to_lowercase().ends_with(".exe") {
                                raw_path.to_string()
                            } else {
                                format!("{}\\bin\\vmware-view.exe", raw_path.trim_end_matches('\\'))
                            };
                            if Path::new(&candidate).exists() {
                                tracing::info!("  find_horizon_windows: found via registry: {}", candidate);
                                return Some(candidate);
                            }
                        }
                    }
                }
            }
        }
    }

    let roots = [
        "C:\\Program Files\\VMware",
        "C:\\Program Files (x86)\\VMware",
    ];

    for root in &roots {
        let root_path = Path::new(root);
        if root_path.exists() {
            if let Some(path) = find_exe_recursive(root_path, "vmware-view.exe", 0, 6) {
                tracing::info!("  find_horizon_windows: found at {}", path);
                return Some(path);
            }
        }
    }

    if let Ok(output) = Command::new("where").arg("vmware-view.exe").output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = stdout.lines().next() {
                let p = line.trim().to_string();
                if !p.is_empty() && Path::new(&p).exists() {
                    tracing::info!("  find_horizon_windows: found via where: {}", p);
                    return Some(p);
                }
            }
        }
    }

    None
}

fn build_horizon_args(connection: &Connection, settings: &Value, mac_format: bool) -> Vec<String> {
    let mut args = Vec::new();
    let hor = settings.get("horizon");

    // serverURL (same format on both platforms)
    if !connection.host.is_empty() {
        let url = normalize_url(&connection.host);
        args.push("-serverURL".to_string());
        args.push(url);
    }

    // desktopName (desktopPool from connection.extra)
    let desktop_pool = connection.extra.get("desktopPool").and_then(|v| v.as_str()).unwrap_or("");
    if !desktop_pool.is_empty() {
        args.push("-desktopName".to_string());
        args.push(desktop_pool.to_string());
    } else if let Some(desktop_name) = hor.and_then(|h| h.get("desktopName")).and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {
        args.push("-desktopName".to_string());
        args.push(desktop_name.to_string());
    }

    // userName (same format on both platforms)
    let user_name = strip_domain_from_username(
        connection
            .username
            .as_deref()
            .unwrap_or(""),
    );
    if !user_name.is_empty() {
        args.push("-userName".to_string());
        args.push(user_name);
    }

    // macOS-only flags from settings.horizon
    if mac_format {
        if let Some(h) = hor {
            if let Some(v) = h.get("desktopProtocol").and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {
                args.push("-desktopProtocol".to_string());
                args.push(v.to_string());
            }
            if let Some(v) = h.get("desktopLayout").and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {
                args.push("-desktopLayout".to_string());
                args.push(v.to_string());
            }
            if let Some(v) = h.get("monitors").and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {
                args.push("-monitors".to_string());
                args.push(v.to_string());
            }
            if h.get("unattended").and_then(|v| v.as_bool()).unwrap_or(false) {
                args.push("-unattended".to_string());
            }
            if h.get("nonInteractive").and_then(|v| v.as_bool()).unwrap_or(false) {
                args.push("-nonInteractive".to_string());
            }
            if h.get("launchMinimized").and_then(|v| v.as_bool()).unwrap_or(false) {
                args.push("-launchMinimized".to_string());
            }
            if h.get("loginAsCurrentUser").and_then(|v| v.as_bool()).unwrap_or(false) {
                args.push("-loginAsCurrentUser".to_string());
            }
            if h.get("hideClientAfterLaunchSession").and_then(|v| v.as_bool()).unwrap_or(false) {
                args.push("-hideClientAfterLaunchSession".to_string());
            }
            if h.get("useExisting").and_then(|v| v.as_bool()).unwrap_or(false) {
                args.push("-useExisting".to_string());
            }
            if h.get("singleAutoConnect").and_then(|v| v.as_bool()).unwrap_or(false) {
                args.push("-singleAutoConnect".to_string());
            }
        }
    } else {
        // Windows-only flags
        if let Some(h) = hor {
            if h.get("loginAsCurrentUser").and_then(|v| v.as_bool()).unwrap_or(false) {
                args.push("-loginAsCurrentUser".to_string());
                args.push("true".to_string());
            }
            // Use appName from settings if no desktopPool
            let desktop_pool = connection.extra.get("desktopPool").and_then(|v| v.as_str()).unwrap_or("");
            if desktop_pool.is_empty() {
                if let Some(v) = h.get("appName").and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {
                    args.push("-desktopName".to_string());
                    args.push(v.to_string());
                }
            }
        }
    }

    // customFlags
    if let Some(h) = hor {
        if let Some(raw) = h.get("customFlags").and_then(|v| v.as_str()).filter(|s| !s.is_empty()) {
            args.extend(split_args(raw));
        }
    }

    args
}

#[tauri::command]
pub fn launch_horizon(connection: Connection, settings: Value) -> CommandResult {
    tracing::debug!("→ launch_horizon");

    if cfg!(target_os = "windows") {
        let custom_path = settings
            .get("horizon")
            .and_then(|h| h.get("customPath"))
            .and_then(|v| v.as_str());
        let exe_path = find_horizon_windows(custom_path);

        let exe_path = match exe_path {
            Some(p) => p,
            None => {
                tracing::error!("← launch_horizon: FAILED — VMware Horizon Client not found");
                return CommandResult::err("VMware Horizon Client not found");
            }
        };

        let args = build_horizon_args(&connection, &settings, false);

        tracing::info!("  launch_horizon: launching {} {:?}", exe_path, args);
        match Command::new(&exe_path)
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
        {
            Ok(child) => {
                tracing::info!("← launch_horizon: ok, pid={}", child.id());
                CommandResult::ok_empty()
            }
            Err(e) => {
                tracing::error!("← launch_horizon: FAILED — {}", e);
                CommandResult::err(format!("Failed to launch Horizon Client: {}", e))
            }
        }
    } else if cfg!(target_os = "macos") {
        let found = find_horizon_mac();
        let (app_path, cli_path) = match found {
            Some((app, cli)) => (app, cli),
            None => {
                tracing::error!("← launch_horizon: FAILED — VMware Horizon Client not found");
                return CommandResult::err("VMware Horizon Client not found");
            }
        };

        let args = build_horizon_args(&connection, &settings, true);

        if let Some(cli) = cli_path {
            tracing::info!("  launch_horizon: launching CLI {} {:?}", cli, args);
            match Command::new(&cli)
                .args(&args)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
            {
                Ok(child) => {
                    tracing::info!("← launch_horizon: ok, pid={}", child.id());
                    return CommandResult::ok_empty();
                }
                Err(e) => {
                    tracing::warn!("  launch_horizon: CLI failed ({}), falling back to open -a", e);
                }
            }
        }

        tracing::info!("  launch_horizon: falling back to open -a {}", app_path);
        match Command::new("open")
            .arg("-a")
            .arg(&app_path)
            .arg("--args")
            .args(&args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
        {
            Ok(child) => {
                tracing::info!("← launch_horizon: ok, pid={}", child.id());
                CommandResult::ok_empty()
            }
            Err(e) => {
                tracing::error!("← launch_horizon: FAILED — {}", e);
                CommandResult::err(format!("Failed to launch Horizon Client: {}", e))
            }
        }
    } else {
        tracing::error!("← launch_horizon: FAILED — unsupported platform");
        CommandResult::err("Unsupported platform for Horizon")
    }
}

#[tauri::command]
pub fn launch_citrix(connection: Connection, _settings: Settings) -> CommandResult {
    let host = &connection.host;
    let store_url = format!("https://{}/Citrix/StoreWeb", host);
    tracing::debug!("→ launch_citrix: host={}", host);

    if cfg!(target_os = "windows") {
        launch_exe("wfica32.exe", &[&store_url])
    } else if cfg!(target_os = "macos") {
        launch_mac("Citrix Workspace", &[&store_url])
    } else {
        tracing::error!("← launch_citrix: FAILED — unsupported platform");
        CommandResult::err("Unsupported platform for Citrix")
    }
}

#[tauri::command]
pub fn launch_vpn() -> CommandResult {
    tracing::debug!("→ launch_vpn");
    if cfg!(target_os = "windows") {
        launch_exe("rasdial", &[])
    } else if cfg!(target_os = "macos") {
        let known_bundles = [
            "/Applications/Endpoint Security VPN.app",
            "/Applications/EndpointConnect.app",
            "/Applications/Endpoint Connect.app",
        ];
        let mut launched = false;
        for bundle in &known_bundles {
            if Path::new(bundle).exists() {
                tracing::info!("  launch_vpn: found bundle at {}", bundle);
                let result = Command::new("open").arg(bundle).spawn();
                if result.is_ok() {
                    launched = true;
                    break;
                }
            }
        }
        if !launched {
            tracing::warn!("  launch_vpn: no known bundle found, trying by name");
            launch_mac("Endpoint Security VPN", &[])
        } else {
            tracing::info!("← launch_vpn: ok");
            CommandResult::ok_empty()
        }
    } else {
        tracing::error!("← launch_vpn: FAILED — unsupported platform");
        CommandResult::err("Unsupported platform for VPN")
    }
}

#[tauri::command]
pub fn vpn_status() -> CommandResult<VpnStatus> {
    tracing::debug!("→ vpn_status");
    let platform = std::env::consts::OS.to_string();
    let connected = if cfg!(target_os = "macos") {
        macos_check_vpn_connected()
    } else {
        false
    };
    tracing::info!("← vpn_status: platform={}, connected={}", platform, connected);
    CommandResult::ok(VpnStatus {
        connected,
        client_installed: cfg!(target_os = "macos"),
        platform,
    })
}

#[tauri::command]
pub fn vpn_disconnect() -> CommandResult {
    tracing::debug!("→ vpn_disconnect");
    if cfg!(target_os = "macos") {
        let names = macos_get_connected_vpn_names();
        if names.is_empty() {
            tracing::info!("← vpn_disconnect: no connected VPNs found");
        } else {
            for name in &names {
                tracing::info!("  vpn_disconnect: stopping {}", name);
                let _ = Command::new("scutil")
                    .args(["--nc", "stop", name])
                    .spawn();
            }
            tracing::info!("← vpn_disconnect: stopped {} VPN(s)", names.len());
        }
        CommandResult::ok_empty()
    } else {
        tracing::info!("← vpn_disconnect: no-op (not macOS)");
        CommandResult::ok_empty()
    }
}

#[tauri::command]
pub fn vpn_connect(_credentials: Value) -> CommandResult {
    tracing::debug!("→ vpn_connect");
    if cfg!(target_os = "macos") {
        launch_vpn()
    } else {
        tracing::warn!("← vpn_connect: no-op (not macOS)");
        CommandResult::ok_empty()
    }
}

#[tauri::command]
pub fn vpn_client_status() -> CommandResult<VpnStatus> {
    tracing::debug!("→ vpn_client_status");
    let platform = std::env::consts::OS.to_string();
    let connected = if cfg!(target_os = "macos") {
        macos_check_vpn_connected()
    } else {
        false
    };
    tracing::info!("← vpn_client_status: platform={}, connected={}", platform, connected);
    CommandResult::ok(VpnStatus {
        connected,
        client_installed: cfg!(target_os = "macos"),
        platform,
    })
}

#[tauri::command]
pub fn vpn_cancel() -> CommandResult {
    tracing::debug!("→ vpn_cancel");
    CommandResult::ok_empty()
}

#[tauri::command]
pub fn launch_rudesktop() -> CommandResult<RuDesktopLaunchResult> {
    tracing::debug!("→ launch_rudesktop");
    let bin_path = find_rudesktop_path();

    let bin_path = match bin_path {
        Some(p) => {
            tracing::info!("  launch_rudesktop: found at {}", p);
            p
        }
        None => {
            tracing::warn!("← launch_rudesktop: FAILED — RuDesktop not found");
            return CommandResult::err("RuDesktop not found");
        }
    };

    let launch_result = if cfg!(target_os = "windows") {
        Command::new(&bin_path)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg("-a")
            .arg(&bin_path)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
    } else {
        return CommandResult::err("Unsupported platform for RuDesktop");
    };

    if let Err(e) = launch_result {
        tracing::error!("← launch_rudesktop: FAILED — {}", e);
        return CommandResult::err(format!("Failed to launch RuDesktop: {}", e));
    }

    tracing::info!("  launch_rudesktop: launched, getting device ID");
    let device_id = get_rudesktop_device_id_from_binary(&bin_path)
        .or_else(get_rudesktop_device_id_from_config);

    if let Some(ref id) = device_id {
        tracing::info!("← launch_rudesktop: ok, deviceId={}", id);
    } else {
        tracing::info!("← launch_rudesktop: ok, no device ID");
    }

    CommandResult::ok(RuDesktopLaunchResult { device_id })
}

#[tauri::command]
pub fn get_rudesktop_status() -> CommandResult<RuDesktopStatus> {
    tracing::debug!("→ get_rudesktop_status");
    let bin_path = find_rudesktop_path();
    let installed = bin_path.is_some();
    let device_id = if installed {
        let id = get_rudesktop_device_id(bin_path.as_deref());
        tracing::info!("  get_rudesktop_status: installed={}, deviceId={:?}", installed, id);
        id
    } else {
        tracing::info!("  get_rudesktop_status: not installed");
        None
    };

    CommandResult::ok(RuDesktopStatus {
        installed,
        device_id,
    })
}

#[tauri::command]
pub fn launch_achat() -> CommandResult {
    tracing::debug!("→ launch_achat");
    if !cfg!(target_os = "windows") {
        tracing::error!("← launch_achat: FAILED — only supported on Windows");
        return CommandResult::err("A-Chat поддерживается только на Windows");
    }

    let known_paths = [
        "C:\\Program Files\\A_Chat\\A_Chat.exe",
        "C:\\Program Files (x86)\\A_Chat\\A_Chat.exe",
        "C:\\A_Chat\\A_Chat.exe",
    ];

    for p in &known_paths {
        if Path::new(p).exists() {
            tracing::info!("  launch_achat: found at {}", p);
            match Command::new(p).spawn() {
                Ok(_) => {
                    tracing::info!("← launch_achat: ok");
                    return CommandResult::ok_empty();
                }
                Err(e) => {
                    tracing::error!("← launch_achat: FAILED — {}", e);
                    return CommandResult::err(format!("Failed to launch A-Chat: {}", e));
                }
            }
        }
    }

    tracing::warn!("← launch_achat: not found");
    CommandResult::err("A-Chat не найден")
}

#[tauri::command]
pub fn launch_tolk() -> CommandResult {
    tracing::debug!("→ launch_tolk");
    if !cfg!(target_os = "windows") {
        tracing::error!("← launch_tolk: FAILED — only supported on Windows");
        return CommandResult::err("Толк поддерживается только на Windows");
    }

    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
    let known_paths = [
        format!("{}\\Programs\\ktalk\\ktalk.exe", local_app_data),
        format!("{}\\Programs\\KTalk\\ktalk.exe", local_app_data),
        "C:\\Program Files\\ktalk\\ktalk.exe".to_string(),
        "C:\\Program Files (x86)\\ktalk\\ktalk.exe".to_string(),
    ];

    for p in &known_paths {
        if Path::new(p).exists() {
            tracing::info!("  launch_tolk: found at {}", p);
            match Command::new(p).spawn() {
                Ok(_) => {
                    tracing::info!("← launch_tolk: ok");
                    return CommandResult::ok_empty();
                }
                Err(e) => {
                    tracing::error!("← launch_tolk: FAILED — {}", e);
                    return CommandResult::err(format!("Failed to launch Толк: {}", e));
                }
            }
        }
    }

    tracing::warn!("← launch_tolk: not found");
    CommandResult::err("Толк не найден")
}
