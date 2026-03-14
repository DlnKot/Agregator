#!/usr/bin/env node
'use strict';

// electron-builder writes `latest-mac.yml` with URLs that use `${productFilename}`
// (hyphenated), but the actual produced artifacts may still use `${productName}`
// (with spaces). If we upload the spaced filenames to GitHub Releases, macOS
// auto-update will 404 when trying to download the hyphenated URLs.
//
// This script ensures that every `url:` entry in dist/latest-mac.yml exists as a
// file in `dist/` by copying from an existing artifact that matches the same
// versioned suffix (e.g. `-0.2.7-arm64-mac.zip`).

const fs = require('fs');
const path = require('path');

const distDir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'dist');
const ymlPath = path.join(distDir, 'latest-mac.yml');

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
  die(`dist dir not found: ${distDir}`);
}

if (!fs.existsSync(ymlPath)) {
  // Nothing to do (e.g. mac build not executed).
  process.stdout.write(`skip: ${ymlPath} not found\n`);
  process.exit(0);
}

const yml = fs.readFileSync(ymlPath, 'utf8');
const versionMatch = yml.match(/^version:\s*([0-9A-Za-z.+-]+)\s*$/m);
const version = versionMatch ? versionMatch[1] : null;
if (!version) {
  die(`cannot parse version from ${ymlPath}`);
}

const urls = Array.from(yml.matchAll(/^\s*-\s+url:\s+(.+?)\s*$/gm)).map(m => m[1].trim());
const expectedFiles = Array.from(new Set(urls));

const dirEntries = fs.readdirSync(distDir);

function findBySuffix(suffix) {
  const matches = dirEntries.filter(name => name.endsWith(suffix));
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  // Prefer the shortest name (usually the one without extra prefixes).
  matches.sort((a, b) => a.length - b.length);
  return matches[0];
}

function ensureFile(expectedName) {
  const expectedPath = path.join(distDir, expectedName);
  if (fs.existsSync(expectedPath)) return { ok: true, created: false };

  const suffixIndex = expectedName.indexOf(`-${version}`);
  if (suffixIndex === -1) {
    return { ok: false, reason: `expected name doesn't contain -${version}: ${expectedName}` };
  }

  const suffix = expectedName.slice(suffixIndex);
  const sourceName = findBySuffix(suffix);
  if (!sourceName) {
    return { ok: false, reason: `no source file matches suffix ${suffix}` };
  }

  const sourcePath = path.join(distDir, sourceName);
  fs.copyFileSync(sourcePath, expectedPath);
  process.stdout.write(`created: ${expectedName} (from ${sourceName})\n`);
  return { ok: true, created: true };
}

let missing = 0;
for (const expectedName of expectedFiles) {
  const res = ensureFile(expectedName);
  if (!res.ok) {
    missing += 1;
    process.stderr.write(`missing: ${expectedName} (${res.reason})\n`);
  }

  // Keep blockmaps aligned if present.
  const blockmapExpected = `${expectedName}.blockmap`;
  const expectedBlockmapPath = path.join(distDir, blockmapExpected);
  const suffixIndex = expectedName.indexOf(`-${version}`);
  if (suffixIndex !== -1 && !fs.existsSync(expectedBlockmapPath)) {
    const suffix = `${expectedName.slice(suffixIndex)}.blockmap`;
    const sourceBlockmapName = findBySuffix(suffix);
    if (sourceBlockmapName) {
      fs.copyFileSync(path.join(distDir, sourceBlockmapName), expectedBlockmapPath);
      process.stdout.write(`created: ${blockmapExpected} (from ${sourceBlockmapName})\n`);
    }
  }
}

if (missing > 0) {
  die(`sync failed: ${missing} expected artifacts could not be created from existing files in ${distDir}`);
}

