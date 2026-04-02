/**
 * macOS Dock utilities
 */

const { nativeImage } = require('electron');
const { app } = require('electron');
const path = require('path');
const { resolveAssetPath } = require('./manager');

function trySetDockIcon(logger) {
  // In dev (`npm run start` / `electron .`) macOS Dock icon stays Electron's
  // unless we override it programmatically.
  if (process.platform !== 'darwin') return;
  if (!app.dock || typeof app.dock.setIcon !== 'function') return;

  const iconPath = resolveAssetPath(path.join('assets', 'icon.png'));
  if (!iconPath) return;

  try {
    const img = nativeImage.createFromPath(iconPath);
    if (!img || img.isEmpty()) return;
    app.dock.setIcon(img);
    if (logger) logger('info', `Dock icon set from: ${iconPath}`);
  } catch (e) {
    if (logger) logger('warn', `Cannot set Dock icon: ${e?.message || String(e)}`);
  }
}

module.exports = { trySetDockIcon };
