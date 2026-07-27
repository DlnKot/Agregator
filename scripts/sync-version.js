#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function main() {
  const root = process.cwd();
  const pkgPath = path.join(root, 'package.json');
  const outEsmPath = path.join(root, 'src', 'version.js');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const version = String(pkg.version || '').trim();
  if (!version) throw new Error('package.json: missing version');

  const esm = `export const version = ${JSON.stringify(version)}\nexport const name = ${JSON.stringify(pkg.name || '')}\nexport default { version, name }\n`;

  const existing = fs.existsSync(outEsmPath) ? fs.readFileSync(outEsmPath, 'utf8') : '';
  if (existing === esm) {
    console.log('sync-version: up-to-date (' + outEsmPath + ' v' + version + ')');
    return;
  }

  fs.writeFileSync(outEsmPath, esm, 'utf8');
  console.log('sync-version: wrote ' + outEsmPath + ' v' + version);
}

main();
