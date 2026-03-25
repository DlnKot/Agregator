# Agent Guide (Agregator / Alfa Remote Client)
This repo is an Electron app with a Vue 3 renderer.

- Main process entry: `src/main/main.js` (CommonJS)
- Preload bridge: `src/preload/preload.js` (CommonJS, exposes `window.api`)
- Renderer app: `src/renderer-vue/` (Vite + Vue 3, ESM)
- Renderer build output: `dist-renderer/` (configured in `vite.config.js`)

## Repo Layout
- App metadata/version: `src/version.js` (single source of truth used by main + renderer)
- Deployment defaults (enterprise): `config/deployment-defaults.json`
- Main-process persistence: `src/main/stores/simpleStore.js` (JSON file under Electron `app.getPath('userData')`)
- Auto updates: `src/main/utils/autoUpdater.js` (electron-updater + custom server)
- CI build/release: `.github/workflows/build-and-release.yml`

## Commands
Package manager: npm (repo includes `package-lock.json`).

```bash
npm install

# Dev (Vite + Electron)
npm run dev

# Start (build renderer, then run Electron)
npm run start

# Build renderer only
npm run build:vue

# Package app (local builds, no publishing)
npm run build:win
npm run build:mac

# Directory-only pack (electron-builder)
npm run pack

# Publish (requires token)
export GH_TOKEN=...
npm run publish:win
npm run publish:mac
```

Notes:
- `npm run dev` sets `ELECTRON_DEV=1` and `VITE_DEV_SERVER_URL=http://localhost:5173` (used in `src/main/main.js`).
- There is no `npm run build` script; use `build:vue`, `build:win`, or `build:mac`.
- Output installers/artifacts go to `dist/` (electron-builder `directories.output`).
- Renderer build output is `dist-renderer/` (referenced by the main process when packaged).

## Manual Smoke Checks
Use these when changing behavior (since there is no test suite):
- `npm run dev`: app launches; sidebar tabs switch; no console spam in renderer.
- Connections: add/edit/delete; verify persistence across app restart.
- Launchers: try at least one of RDP/Horizon/Citrix flows on your OS (error paths should return `{ success: false, error }`).
- Network Check: run full check + ping; verify latency threshold behavior (`settings.networkCheck.latencyThresholdMs`).
- Auto-updater: only exercised in packaged builds (guarded by `app.isPackaged` and `!ELECTRON_DEV`).

## Lint / Format / Tests

- Lint: `npm run lint` (ESLint; currently used mainly as a syntax checker)
- Tests: `npm test` (Node's built-in test runner)
- Use targeted manual smoke checks via `npm run dev`.

Single test patterns:

```bash
# Vitest (recommended if added)
npx vitest
npx vitest path/to/file.test.js
npx vitest -t "test name substring"

# Node's built-in test runner (Node 18+)
node --test
node --test path/to/test-file.js
```

## Cursor / Copilot Instructions
No agent instruction files found in `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md`. If added later, treat them as higher-priority repo rules and mirror them here.

## Code Style (follow the local file)
This codebase mixes styles; do not do drive-by reformatting.
- Keep changes minimal and consistent with the file you are editing.
- Prefer 2-space indentation unless the file already uses a different indent.
- Prefer single quotes in JS (matches renderer code and parts of main code).

### Module system
- Main/preload (`src/main/**`, `src/preload/**`): CommonJS (`require`, `module.exports`).
- Renderer (`src/renderer-vue/**`): ESM (`import`/`export`) and Vue SFCs.
- Do not convert a file's module system unless you are intentionally migrating and you update all call sites.

### Imports
Group imports/requires in this order: (1) Node built-ins (2) external deps (3) local modules.
Renderer alias: `@` -> `src/renderer-vue/src` (see `vite.config.js`).

### Formatting
- Do not do repo-wide formatting.
- In `src/main/**` and `src/preload/**`, semicolons are common; in `src/renderer-vue/**`, semicolons are often omitted.
- Prefer small, reviewable diffs: keep existing whitespace, keep existing quote style, avoid unrelated renames.

### Naming
- JS: `camelCase` for variables/functions; `PascalCase` for Vue components.
- Constants: `UPPER_SNAKE_CASE` (example: `CUSTOM_UPDATE_URL` in `src/main/utils/autoUpdater.js`).
- IPC channels: `kebab-case` strings (example: `ipcMain.handle('get-connections', ...)` in `src/main/main.js`).
- `window.api` methods: `camelCase` (see `src/preload/preload.js`).

### Data shapes
- Connections/settings/profiles are persisted via `SimpleStore` (`src/main/stores/simpleStore.js`); keep stored objects JSON-serializable.
- Sanitize/normalize inputs on the main-process side (see `sanitizeConnectionInput()` / `sanitizeSettingsInput()` in `src/main/main.js`).
- Be careful with backward compatibility: stored config may exist from older versions; normalize on load rather than crashing.

### Error handling and logging
Main process:
- Prefer returning structured results from IPC handlers: `{ success: true, data }` / `{ success: false, error }`.
- Log with `src/main/utils/logger.js` (`logger('info'|'warn'|'error', msg)`).
- Avoid throwing from `ipcMain.handle()` unless the renderer is prepared for rejected promises.

Renderer:
- The renderer can run in a plain browser (Vite) without Electron preload; guard Electron APIs (`if (!window.api) { ... }`).
- When catching errors, log to console and optionally forward to main (`window.api?.log('error', ...)`).

Preload:
- Keep `contextBridge.exposeInMainWorld()` minimal; do not expose raw `ipcRenderer`.

### Security / safety (important)
- Do not disable TLS verification globally; debug-only escape hatch exists: `ARC_ALLOW_INSECURE_TLS=1` (`src/main/main.js`).
- Prefer shipping/loading a CA via `NODE_EXTRA_CA_CERTS` (`src/main/utils/autoUpdater.js`).
- Validate/sanitize any user-controlled strings that become shell args, file paths, or URLs (`open-external` restricts protocols to `http`, `https`, `mailto`).
- Prefer `spawn`/`spawnSync` with arg arrays; avoid `exec` with concatenated strings.

## Common Change Patterns
- New IPC API: implement handler in `src/main/main.js`, expose in `src/preload/preload.js`, call via `window.api` from `src/renderer-vue/src/**`.
- New persisted setting: update defaults in `BUILTIN_DEFAULTS` (`src/main/main.js`), sanitize in `sanitizeSettingsInput()`, and update renderer forms.
- Anything that launches external apps: validate inputs, keep args as arrays, and log enough context to debug without leaking secrets.

## Architecture Notes (for changes)
- Renderer talks to main only through `window.api` (preload) -> IPC -> `src/main/main.js` handlers.
- If you add an IPC method: add handler (`src/main/main.js`), expose in preload (`src/preload/preload.js`), call from renderer (`src/renderer-vue/src/**`), and return `{ success, ... }` consistently.

## Release / CI
- GitHub Actions workflow: `.github/workflows/build-and-release.yml`.
- Release guidance: `DEVELOPMENT.md`.
