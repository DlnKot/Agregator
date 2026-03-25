#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const root = process.cwd();
  const pkgPath = path.join(root, 'package.json');
  const outCjsPath = path.join(root, 'src', 'version.cjs');
  const outEsmPath = path.join(root, 'src', 'version.js');

  const pkg = readJson(pkgPath);
  const version = String(pkg.version || '').trim();
  if (!version) {
    throw new Error('package.json: missing version');
  }

  const name = String(pkg?.build?.productName || 'Alfa Remote Client');

  const cjsContents = [
    '/**',
    ' * Centralized version management',
    ' * NOTE: This file is generated from package.json by scripts/sync-version.js',
    ' */',
    '',
    'module.exports = {',
    `  version: ${JSON.stringify(version)},`,
    `  name: ${JSON.stringify(name)}`,
    '};',
    ''
  ].join('\n');

  const esmContents = [
    '/**',
    ' * Centralized version management (ESM for Vite renderer)',
    ' * NOTE: This file is generated from package.json by scripts/sync-version.js',
    ' */',
    '',
    `export const version = ${JSON.stringify(version)}`,
    `export const name = ${JSON.stringify(name)}`,
    'export default { version, name }',
    ''
  ].join('\n');

  function writeIfChanged(filePath, next) {
    let prev = null;
    try { prev = fs.readFileSync(filePath, 'utf8'); } catch { /* ignore */ }
    if (prev === next) {
      process.stdout.write(`sync-version: up-to-date (${path.relative(root, filePath)} v${version})\n`);
      return;
    }
    fs.writeFileSync(filePath, next, 'utf8');
    process.stdout.write(`synced: ${path.relative(root, filePath)} -> v${version}\n`);
  }

  writeIfChanged(outCjsPath, cjsContents);
  writeIfChanged(outEsmPath, esmContents);
}

try {
  main();
} catch (e) {
  process.stderr.write(`sync-version failed: ${e?.message || String(e)}\n`);
  process.exit(1);
}
