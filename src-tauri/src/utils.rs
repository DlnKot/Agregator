use serde::{Deserialize, Serialize};

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
