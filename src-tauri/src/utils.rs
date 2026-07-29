use std::process::Command;

use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub trait CommandSilentExt {
    fn no_window(self) -> Command;
}

impl CommandSilentExt for Command {
    fn no_window(mut self) -> Command {
        #[cfg(target_os = "windows")]
        self.creation_flags(CREATE_NO_WINDOW);
        self
    }
}

/// Decode Windows command output bytes to String.
/// On Windows, console programs often use the system's active code page
/// (e.g. CP866 for Russian) rather than UTF-8. This tries UTF-8 first,
/// then falls back to common Windows code pages.
#[cfg(target_os = "windows")]
pub fn decode_windows_output(bytes: &[u8]) -> String {
    if let Ok(s) = std::str::from_utf8(bytes) {
        return s.to_string();
    }
    // Try common Windows code pages for Russian/European locales
    for encoding in &[
        encoding_rs::WINDOWS_1251,
        encoding_rs::IBM866,
        encoding_rs::WINDOWS_1252,
        encoding_rs::KOI8_R,
    ] {
        let (decoded, _encoding, _had_errors) = encoding.decode(bytes);
        if !_had_errors {
            return decoded.into_owned();
        }
    }
    String::from_utf8_lossy(bytes).into_owned()
}

#[cfg(not(target_os = "windows"))]
pub fn decode_windows_output(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).into_owned()
}

/// Standard response envelope matching the JS convention: { success: true, data } / { success: false, error }
#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult<T: Serialize = ()> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T: Serialize> CommandResult<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(msg: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

impl CommandResult {
    pub fn ok_empty() -> Self {
        Self {
            success: true,
            data: None,
            error: None,
        }
    }
}
