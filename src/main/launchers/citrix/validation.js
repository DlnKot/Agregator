/**
 * Citrix Launcher - Validation Functions
 * Validates input data to prevent injection attacks
 */

function validateStoreUrl(storeUrl) {
    if (!storeUrl || typeof storeUrl !== 'string') return '';
    const trimmed = storeUrl.trim();
    // Basic URL validation - allow http/https URLs only
    if (!/^https?:\/\/.+/.test(trimmed)) return '';
    if (trimmed.length > 512) throw new Error('Store URL too long');
    return trimmed;
}

function validateResourceName(resourceName) {
    if (!resourceName || typeof resourceName !== 'string') return '';
    const trimmed = resourceName.trim();
    // Reject paths and dangerous characters
    if (/[\\\/&$;|`()\\n\\r]/.test(trimmed)) {
        throw new Error('Invalid resource name: contains invalid characters');
    }
    if (trimmed.length > 128) throw new Error('Resource name too long');
    return trimmed;
}

function validateConnectionData(connection) {
    if (!connection || typeof connection !== 'object') {
        throw new Error('Invalid connection object');
    }

    // For Citrix, host can be store URL or resource name
    // Validate optional storeUrl if present
    if (connection.storeUrl) {
        connection.storeUrl = validateStoreUrl(connection.storeUrl);
    }

    return connection;
}

module.exports = {
    validateStoreUrl,
    validateResourceName,
    validateConnectionData
};