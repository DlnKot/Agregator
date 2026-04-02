/**
 * Deployment configuration loader
 * Reads deployment-defaults.json from config directory
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function resolveDeploymentConfigPath() {
  const candidates = [
    path.join(app.getAppPath(), 'config', 'deployment-defaults.json'),
    path.join(process.cwd(), 'config', 'deployment-defaults.json'),
    // __dirname = src/main/config, so ../../ = project root
    path.join(__dirname, '../../config', 'deployment-defaults.json')
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (e) { continue; }
  }
  return null;
}

function readDeploymentDefaults(logger) {
  const configPath = resolveDeploymentConfigPath();
  if (!configPath) return null;

  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (logger) logger('info', `Loaded deployment config from: ${configPath}`);
    return data;
  } catch (error) {
    if (logger) logger('warn', 'Cannot parse deployment-defaults.json:', error.message);
    return null;
  }
}

module.exports = { resolveDeploymentConfigPath, readDeploymentDefaults };
