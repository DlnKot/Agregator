# Agent Guide (Agregator / Alfa Remote Client)
This repo is a **Tauri v2** app (Rust backend + Vue 3 frontend + Vite).

- Rust backend: `src-tauri/src/` (Tauri commands, store, models, utils)
- Vue frontend: `src/renderer-vue/` (Vite + Vue 3, ESM)
- Renderer build output: `dist-renderer/`
- Tauri config: `src-tauri/tauri.conf.json`

## Repo Layout
- App metadata/version: `package.json` (source of truth; auto-synced to `src/version.js` via `prebuild:vue`)
- Tauri version: `src-tauri/tauri.conf.json` (set independently — keep in sync)
- Rust backend: `src-tauri/src/commands/`, `src-tauri/src/store/`, `src-tauri/src/models.rs`, `src-tauri/src/utils.rs`
- Deployment defaults (enterprise): `config/deployment-defaults.json`
- Persistence: `SimpleStore` (`src-tauri/src/store/simple_store.rs`) — JSON file under platform-specific app data dir
- Auto updates: Tauri updater plugin (endpoint in `tauri.conf.json`)

## Commands
Package manager: npm (repo includes `package-lock.json`).

```bash
npm install

# Dev (Vite + Tauri)
npm run dev

# Build for current platform
npm run build

# Build renderer only
npm run build:vue

# Platform-specific builds (macOS, Windows)
npm run build:mac
npm run build:win

# Package the app (Tauri bundles)
npm run build

# Lint / Test
npm run lint
npm test
```

## CI / Release
- **Build and Release** (`.github/workflows/build-and-release.yml`): triggered on push to `main` or `v*` tags. Produces Windows MSI/NSIS and macOS DMG installers via GitHub Actions, creates a GitHub Release.
- **Dev Build** (`.github/workflows/dev-build.yml`): triggered on push to `dev`. Produces build artifacts only (no release).

## Manual Smoke Checks
Since there is no formal test suite, verify manually via `npm run dev`:
- App launches; sidebar tabs switch; no console errors
- Connections: add/edit/delete; verify persistence across restart
- Launchers: try RDP/Horizon/Citrix flows (errors return `{ success: false, error }`)
- Network Check: full check + ping; verify latency threshold behavior
- Settings: verify persistence, theme toggle, updater toggles
- Build: `npm run build` completes without Rust/Vite errors

## Architecture & Conventions

### Module system
- Rust (`src-tauri/`): standard Rust modules
- Renderer (`src/renderer-vue/`): ESM (`import`/`export`) and Vue SFCs
- Renderer alias: `@` -> `src/renderer-vue/src` (see `vite.config.js`)

### IPC (Renderer ↔ Rust Backend)
- Renderer calls Rust backend via Tauri `invoke` (`@tauri-apps/api/core`)
- Commands are defined in `src-tauri/src/commands/` and registered in `src-tauri/src/lib.rs`
- All commands return structured results: `{ success: true, data }` / `{ success: false, error }`

### Data shapes
- Connections/settings/profiles are persisted via `SimpleStore` (file-based JSON)
- Keep stored objects JSON-serializable
- Sanitize/normalize inputs on the Rust side
- Backward compatibility: stored config may exist from older versions; normalize on load

### Error handling and logging
Rust backend:
- Return structured results from Tauri commands
- Log with the `tracing` crate (configured in `src-tauri/src/logger.rs`)
- Avoid panicking in command handlers

Renderer:
- The renderer can run in a plain browser (Vite) without Tauri; guard Tauri APIs
- When catching errors, log to console

### Style
- Rust: follow `rustfmt` conventions (4-space indent)
- Vue/JS: 2-space indent, single quotes, semicolons optional
- Do not do drive-by reformatting; keep changes minimal and consistent with the file

### Naming
- Rust: `snake_case` for functions/variables, `PascalCase` for types
- JS/Vue: `camelCase` for functions/variables, `PascalCase` for components
- Tauri command names: `snake_case`
- IPC channels use the command name directly

### Security / safety
- Validate/sanitize any user-controlled strings that become shell args, file paths, or URLs
- Prefer `Command::new()` with arg arrays (Rust); avoid shell string concatenation
- No preload bridge — Tauri uses direct `invoke` calls with capability-based permissions
- Capabilities are configured in `src-tauri/capabilities/default.json`

## Common Change Patterns
- New Rust command: implement in `src-tauri/src/commands/X.rs`, register in `mod.rs` and `lib.rs`, call via `invoke('command_name', { ... })` from renderer
- New persisted setting: update `SimpleStore` usage in Rust, add defaults, update renderer forms
- New launcher: implement in `src-tauri/src/commands/launchers.rs`, validate inputs, keep args as arrays

## Dependencies
- Rust: see `src-tauri/Cargo.toml` (Tauri v2, serde, tokio, reqwest, ping, open, etc.)
- Node: see `package.json` (Vite, Vue 3, @tauri-apps/cli + api, ESLint)

## Notes
- RuDesktop integration is removed from this repo.
- The updater endpoint in `tauri.conf.json` currently points to an internal server; GitHub stable releases can be enabled via a settings toggle if needed.
