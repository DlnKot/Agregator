/**
 * IPC Error Codes - Standardized error responses for IPC handlers
 */

// Standard error codes
const ERROR_CODES = {
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_CONNECTION_TYPE: 'INVALID_CONNECTION_TYPE',
  
  // Connection errors
  CONNECTION_NOT_FOUND: 'CONNECTION_NOT_FOUND',
  CONNECTION_ALREADY_EXISTS: 'CONNECTION_ALREADY_EXISTS',
  
  // Launcher errors
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  CLIENT_LAUNCH_FAILED: 'CLIENT_LAUNCH_FAILED',
  STORE_FRONT_REGISTRATION_FAILED: 'STORE_FRONT_REGISTRATION_FAILED',
  
  // Settings errors
  INVALID_SETTINGS: 'INVALID_SETTINGS',
  
  // Storage errors
  STORAGE_ERROR: 'STORAGE_ERROR',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Update errors
  UPDATE_ERROR: 'UPDATE_ERROR',
  
  // Unknown/generic error
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Create a standardized error response
 * @param {string} errorCode - One of ERROR_CODES
 * @param {string} message - Human-readable error message
 * @param {*} [details] - Additional error details (optional)
 * @returns {Object} Standardized error response
 */
function createErrorResponse(errorCode, message, details = null) {
  const response = {
    success: false,
    error: message,
    errorCode: errorCode
  };
  
  if (details !== null) {
    response.details = details;
  }
  
  return response;
}

/**
 * Create a standardized success response
 * @param {*} [data] - Data to return (optional)
 * @returns {Object} Standardized success response
 */
function createSuccessResponse(data = null) {
  const response = {
    success: true
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return response;
}

module.exports = {
  ERROR_CODES,
  createErrorResponse,
  createSuccessResponse
};