# Alfa Remote Client — Migration Summary (Electron → Tauri)

## Architecture

```
src-tauri/src/
  main.rs          — Tauri entry point, calls lib::run()
  lib.rs           — orchestrator: AppState, init_store(), run() with generate_handler![]
  logger.rs        — dual logging (stdout + file in app data dir)
  models.rs        — data structs (Connection, Settings, VpnStatus, RuDesktopStatus, etc.)
  utils.rs         — CommandResult<T> envelope, macros
  store/
    simple_store.rs — JSON file store (replacement for Electron simpleStore)
  commands/
    mod.rs         — re-exports all submodules
    connections.rs — get/save/delete/reset connections + last_connection
    settings.rs    — get/save settings
    app.rs         — get_version, get_platform, open_external
    launchers.rs   — RDP/Horizon/Citrix/VPN/RuDesktop/A-Chat/Tolk launch + helpers
    network.rs     — network_ping
    updates.rs     — stub commands for auto-update
    installer.rs   — stub commands for client installer
    misc.rs        — open URLs, tracking stubs, log_message

src/renderer-vue/src/
  api/shim.js      — Tauri invoke → window.api (emulates Electron preload)
  api/index.js     — modular API adapter with unwrap()
  App.vue          — main view, all sections in DOM (v-show)
  components/
    settings/      — all settings sub-views
    SidebarNav.vue — launcher buttons + statuses
    *Modal*.vue    — modal dialogs (FirstRun, Connection, VpnConnect, RudesktopNotFound)
    InstallDialog.vue — client install flow
```

## Что сделано

### 1. Бэкенд: Electron → Rust (Tauri)
- Удалены `src/main/` (40+ файлов) и `src/preload/`
- Создан Rust-бэкенд в `src-tauri/`
- Все IPC-методы Electron переписаны как `#[tauri::command]`

### 2. Рефакторинг lib.rs (монолит → модули)
- `lib.rs` был 740 строк со всеми командами
- Все `#[tauri::command]` вынесены в `commands/`:
  - `connections.rs`, `settings.rs`, `app.rs` — первый этап
  - `launchers.rs` — RDP/Horizon/Citrix/VPN/RuDesktop/A-Chat/Толк + хелперы (367 строк)
  - `network.rs` — ping
  - `updates.rs` — заглушки автообновлений
  - `installer.rs` — заглушки установщиков
  - `misc.rs` — открытие URL, трекинг, log_message
- Текущий `lib.rs` — 120 строк, только `AppState`, `init_store()`, `run()`, `generate_handler![]`

### 3. Логирование (tracing)
- `logger.rs` — двухканальное логирование:
  - **stdout** — цветной, для разработки
  - **файл** — `{app_data}/logs/app.log` с таймстемпами, thread ID, файл:строка, ротация 3 бэкапа
- `tracing-appender` с неблокирующим writer
- `tracing-subscriber` с `registry` для двух слоёв
- Каждая команда логирует вход (`→ cmd`) и результат (`← cmd: ok/FAILED — ...`)
- Заглушки помечены `⛔ UNIMPLEMENTED` (уровень warn)
- `CommandResult` теперь реализует `Debug`

### 4. RuDesktop
- **`find_rudesktop_path()`** — поиск по известным путям + `where` (Windows) / `mdfind` (macOS)
- **`get_rudesktop_device_id_from_binary()`** — запуск `rudesktop --get-id` (macOS: бинарный путь внутри .app bundle)
- **`get_rudesktop_device_id_from_config()`** — fallback из `config.json`
- **`launch_rudesktop()`** — возвращает `RuDesktopLaunchResult { deviceId }`, который копируется в буфер на фронтенде
- `RuDesktopStatus` и `RuDesktopLaunchResult` — `#[serde(rename_all = "camelCase")]`

### 5. A-Chat / Толк
- `launch_achat()` — Windows-only, поиск по `C:\Program Files\A_Chat\A_Chat.exe`, `C:\Program Files (x86)\A_Chat\A_Chat.exe`, `C:\A_Chat\A_Chat.exe`
- `launch_tolk()` — Windows-only, поиск по `%LOCALAPPDATA%\Programs\ktalk\ktalk.exe`, `%LOCALAPPDATA%\Programs\KTalk\ktalk.exe`
- Web-ссылки: `open_achat_web` → `https://achat.best/`, `open_tolk_web` → `https://alfabank.ktalk.ru/`

### 6. VPN (macOS)
- `launch_vpn()` — проверяет известные пути CheckPoint: `/Applications/Endpoint Security VPN.app`, `/Applications/EndpointConnect.app`, `/Applications/Endpoint Connect.app`
- `vpn_status()` / `vpn_client_status()` — проверка через `scutil --nc list`
- `vpn_disconnect()` — поиск и остановка Connected VPN через `scutil --nc stop`

### 7. Фронтенд
- **Кнопка "Добавить подключение"** — `margin-left: auto` на `.view-header-actions`, прижата к правому краю
- **confirm()** заменён на модальный диалог с Promise
- **window.alert()** в модалках Connection/FirstRun → inline `.form-error` div
- **Тип `updateProgress`** исправлен: `ref(0)` → `ref({})` (шаблон ждёт объект с `.percent`)

### 8. Тёмная тема + CSS
- `--tab-slider-bg`, `--tab-text-inactive`, `--tab-text-active` — исправлены для видимости в тёмной теме
- `#add-connection-btn` — использует `var(--bg-tertiary)`
- **Переключатели (toggle)** — обновлены по Figma: 40×24px, зелёный `#0CC44D` в ON, серый в OFF, кноб 16×16px

### 9. Стили модальных окон
- `RudesktopNotFoundModal.vue` — `backdrop-filter: blur(4px)`, единая анимация `translateY(-20px)`, кнопки через `var(--accent-primary)` вместо хардкода
- `InstallDialog.vue` — все цвета заменены на CSS-переменные, иконки через `var(--accent-*)`
- Inline модалки (A-Chat, Толк, Confirm) — используют глобальные `.modal-overlay` / `.modal-content` из App.vue (уже с CSS-переменными)

### 10. Размер окна
- `minWidth` увеличен с 1140 → 1200px (чтобы вкладка "Обновление" в настройках не обрезалась)

### 11. Настройки: редизайн вкладок и форм (2026-06)
- **Табы настроек** — стиль приведён к фильтрам подключений: padding контейнера 2px, слайдер `top: 1px; height: 36px`, кнопки `height: 36px; padding: 8px 24px`. Зазор между контейнером и подсветкой активной вкладки минимальный.
- **"Итоговый логин"** — переделан в `login-preview` с flex-расположением (метка слева, значение справа), использует `--bg-secondary` + `--border-color`, цвет значения `--accent-primary`. Работает в обеих темах.
- **Switch (toggle)** — увеличены с 40×24px до 46×26px, бегунок 18×18px. Цвета через CSS-переменные (`--bg-tertiary`, `--accent-success`, `--text-inverse`), добавлена тень и рамка при наведении.
- **RDP настройки** — сгруппированы в карточки: «Экран», «Подключение», «Аудио и устройства», «Производительность», «Дополнительно». Убран `redirect.webauthn`.
- **Horizon настройки** — сгруппированы в «Сессия», «Поведение», «Дополнительно». Опции переименованы на русском.
- **Citrix настройки** — сгруппированы в «Параметры подключения», «Дополнительно».
- **Вкладка «Обновление»** — переработана: версии в виде бейджей, кнопки с иконками (синяя — скачать, зелёная — установить), общий стиль `.settings-group`.

## Ключевые решения

| Решение | Обоснование |
|---------|-------------|
| `tracing` + `tracing-appender` | Структурированное логирование, неблокирующая запись в файл, ротация |
| `#[serde(rename_all = "camelCase")]` | JS-фронтенд ожидает `deviceId`, а не `device_id` |
| `launch_exe()` / `launch_mac()` | Единые хелперы для запуска внешних программ (Windows: spawn, macOS: open -a) |
| A-Chat/Толк только Windows | Старый Electron код кидал ошибку на других платформах |
| `CommandResult<T>` | Единый формат ответа: `{ success, data?, error? }` |
| `tracing-subscriber registry` | Два независимых слоя (stdout + file) с разными форматами |
| `find_rudesktop_path()` с `mdfind` | Поиск .app даже в нестандартных расположениях (как старый Electron код) |

### 12. UI: красные кнопки → чёрные (2026-07)
- **App.vue**: `.btn-danger`, `.btn-vpn`, `.nav-item.active` — заменён `--accent-danger` на `--bg-tertiary` / `--bg-hover`
- **SettingsView.vue**: `.btn-primary` (Сохранить настройки) — был красный `--accent-danger`, теперь `--bg-tertiary`
- **ConnectionModal.vue**: `.btn-primary:hover`, `.btn-secondary:hover` — больше не уходят в красный
- Все кнопки теперь единого стиля (как "Добавить подключение") для обеих тем

### 13. Network check: редизайн и исправление логики (2026-07)
- **BottomSlot glassmorphism**: кнопки отдельных проверок — `padding: 4px 12px; height: 32px; background: rgba(15, 25, 55, 0.1); backdrop-filter: blur(40px); border-radius: 999px`
- **Кнопка "Проверить все"** — стиль как "Добавить подключение" (`--bg-tertiary`)
- **Подписи кнопок** — сокращены до "Проверить доступ" (одинаково для всех сервисов)
- **Подробный вывод ping** — метрики (потери/средняя/мин-макс) показываются сразу после проверки, без `<details>`-коллапса (нужно инженерам)
- **Loading overlay** — при "Проверить все" появляется оверлей со спиннером + "Проверка сети..."

### 14. Network ping: исправление оценки (2026-07)
- **`evaluate_ping()`** — добавлена проверка: если `loss` и `avg_ms` оба `None` (хост не резолвится, неизвестная ошибка), возвращается `status: "error"`, а не `"ok"`
- Раньше `ping: cannot resolve host: Unknown host` показывал "OK" в UI

### 15. UI блокировка: async network_ping (2026-07)
- **`network_ping`** был синхронным (`pub fn`) — в Tauri v2 выполнялся на главном потоке, блокируя webview
- Исправлен на `async fn` + `tokio::task::spawn_blocking` — `Command::new("ping").output()` работает в потоке пула
- На фронтенде `runAll()`: `await nextTick()` + `setTimeout(50)` перед запуском, последовательные проверки (вместо `Promise.allSettled`)

### 16. Геоданные: Tauri command вместо fetch (2026-07)
- **Проблема**: `fetch('http://ip-api.com/...')` блокировался webview (mixed content), хотя CSP = null
- **Решение**: добавлен Tauri command `network_geo` в `network.rs`, выполняющий HTTP-запрос через `reqwest` (минуя webview)
- Зарегистрирован в `lib.rs:generate_handler![]`
- `api/index.js` вызывает `invoke('network_geo')` вместо `fetch`

## Известные проблемы / заглушки

- `updates.rs` — все 4 команды заглушки (возвращают "not implemented")
- `installer.rs` — все 5 команд заглушки (возвращают false / "not implemented")
- `track_*` в `misc.rs` — только логгируют вызов, реальной отправки метрик нет
- На macOS нет GUI-установщиков для Horizon/Citrix — `InstallDialog` не используется
- `RuDesktopStatus` — добавлен `camelCase`, но старые сохранённые конфиги могут содержать `device_id` (snake). `get_rudesktop_device_id_from_config` читает оба варианта.

## Следующие шаги (приоритет)

1. **Реализовать auto-update** — `updates.rs`: `check_for_updates`, `download_update`, `install_update` через Tauri updater plugin. Сейчас все заглушки.
2. **Реализовать установщики** — `installer.rs`: скачивание дистрибутивов Horizon/Citrix, запуск установки, отслеживание прогресса.
3. **Метрики / трекинг** — `track_*` команды сейчас только логгируют. Нужно добавить отправку на сервер или файловое хранилище.
4. **Уведомления (toast/alert)** — стандартизировать: все через `AlertNotification`, убрать прямые вызовы `showToast` в компонентах.
5. **E2E smoke test** — проверить все лаунчеры на реальном macOS: RDP, Horizon, Citrix, VPN, RuDesktop.
6. **Windows-специфичное** — протестировать сборку под Windows, проверить `launch_exe`, пути для A-Chat/Толк, VPN (rasdial).
7. **Сборка/CI** — настроить GitHub Actions для Tauri (`tauri-action`), обновить `.github/workflows/`.

## Полезные команды

```bash
# Разработка (Vite + Tauri dev)
npm run dev

# Сборка Rust
cargo check                     # только проверка
cargo build                     # полная сборка

# Фронтенд
npm run build:vue               # сборка renderer
npm run lint                    # ESLint

# Логи приложения (macOS)
tail -f ~/Library/Application\ Support/com.alfa.remoteclient/logs/app.log

# Миграция: если добавили новую Tauri команду
# 1. Создать функцию в соответствующем файле commands/*.rs
# 2. Добавить в generate_handler![] в lib.rs
# 3. Добавить вызов в api/shim.js (+ api/index.js если используется напрямую)
# 4. Вызвать из Vue компонента через window.api.methodName()
```
