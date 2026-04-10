/**
 * Citrix Workspace Launcher - Main Entry Point
 * Modular version - delegates to src/main/launchers/citrix/
 */

const { launchCitrix, killAllProcesses } = require('./citrix');

module.exports = {
    launchCitrix,
    killAllProcesses
};