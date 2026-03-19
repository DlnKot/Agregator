# Alfa Remote Client - Техническая документация

## Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Архитектура](#2-архитектура)
3. [Структура проекта](#3-структура-проекта)
4. [Компоненты системы](#4-компоненты-системы)
5. [Конфигурация](#5-конфигурация)
6. [Запуск и сборка](#6-запуск-и-сборка)
7. [Автообновление](#7-автообновление)
8. [API и IPC](#8-api-и-ipc)
9. [Устранение проблем](#9-устранение-проблем)

---

## 1. Обзор проекта

**Alfa Remote Client** — это десктопное приложение (Electron), которое служит агрегатором для запуска клиентов удалённых рабочих столов:

| Тип подключения | Windows клиент | macOS клиент |
|-----------------|----------------|--------------|
| RDP | `mstsc.exe` | Windows App / Microsoft Remote Desktop |
| VMware Horizon | `vmware-view.exe` | VMware Horizon Client |
| Citrix Workspace | `selfservice.exe` | Citrix Workspace |

### Основные возможности

- Управление подключениями (создание, редактирование, удаление)
- Настройка параметров для каждого типа подключения
- Автоматический запуск соответствующего клиента
- Поддержка нескольких мониторов
- Автообновление через GitHub Releases
- Логирование событий

---

## 2. Архитектура

Приложение построено на **Electron** и использует классическую архитектуру:

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Vue.js App                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │    │
│  │  │ Connections│ │ Profiles │ │ SettingsView      │  │    │
│  │  │   List    │ │          │ │                    │  │    │
│  │  └──────────┘ └──────────┘ └────────────────────┘  │    │
│  │                        │                            │    │
│  │               useApp.js (composable)               │    │
│  └────────────────────────│────────────────────────────┘    │
│                           │                                  │
│                    window.api (preload)                      │
└───────────────────────────│──────────────────────────────────┘
                            │ IPC
┌───────────────────────────│──────────────────────────────────┐
│                     Main Process                             │
│                           │                                  │
│  ┌────────────────────────┼────────────────────────────────┐ │
│  │                        ▼                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │ rdpLauncher │  │horizonLaunch│  │citrixLaunch │    │ │
│  │  │             │  │    er       │  │    er       │    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │ │
│  │                                                      │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │  IPC        │  │   Store     │  │   Logger    │   │ │
│  │  │  Handlers   │  │ (JSON file) │  │             │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Поток данных

1. Пользователь нажимает кнопку "Подключить" в UI
2. Vue.js отправляет IPC запрос через `window.api`
3. Preload.js проксирует запрос в main process
4. Main process определяет тип подключения
5. Соответствующий launcher запускает внешний клиент с параметрами
6. Результат возвращается в renderer

---

## 3. Структура проекта

```
alfa-remote-client/
├── assets/                      # Статические ресурсы
│   └── icon.ico                 # Иконка приложения (Windows)
│
├── config/                      # Конфигурация развёртывания
│   └── deployment-defaults.json # Настройки по умолчанию
│
├── dist/                        # Собранное приложение (после build)
│   └── win-unpacked/            # Портативная версия
│   └── Alfa Remote Client Setup.exe  # Инсталлятор
│
├── src/
│   ├── main/                    # Main Process (Node.js)
│   │   ├── main.js              # Точка входа, создание окна, IPC
│   │   ├── launchers/           # Запуск внешних клиентов
│   │   │   ├── rdpLauncher.js   # Запуск RDP (mstsc)
│   │   │   ├── horizonLauncher.js # Запуск VMware Horizon
│   │   │   ├── citrixLauncher.js  # Запуск Citrix Workspace
│   │   │   └── vpnLauncher.js    # Запуск VPN (CheckPoint)
│   │   ├── stores/              # Хранение данных
│   │   │   └── simpleStore.js   # JSON-хранилище
│   │   ├── utils/               # Утилиты
│   │   │   ├── logger.js        # Логирование
│   │   │   ├── autoUpdater.js   # Автообновление
│   │   │   └── networkCheck.js  # Проверка сети
│   │   └── version.js           # Управление версией
│   │
│   ├── preload/
│   │   └── preload.js           # Безопасный мост между процессами
│   │
│   └── renderer-vue/            # Renderer Process (Vue.js)
│       ├── index.html           # HTML-шаблон
│       └── src/
│           ├── main.js          # Точка входа Vue
│           ├── App.vue          # Корневой компонент
│           ├── styles.css       # Глобальные стили
│           ├── composables/
│           │   └── useApp.js    # Основная логика (shared state)
│           └── components/
│               ├── ConnectionsList.vue  # Список подключений
│               ├── ConnectionModal.vue  # Модальное окно подключения
│               ├── FirstRunModal.vue    # Первоначальная настройка
│               ├── SettingsView.vue     # Панель настроек
│               ├── NetworkCheckView.vue # Проверка сети
│               └── HelpView.vue         # Раздел помощи
│
├── package.json                 # Зависимости и скрипты
├── vite.config.js               # Конфигурация Vite
└── DOCS.md                      # Эта документация
```

---

## 4. Компоненты системы

### 4.1 Main Process (main.js)

Основной процесс Electron, который:
- Создаёт главное окно приложения
- Регистрирует IPC-обработчики
- Управляет жизненным циклом приложения
- Инициализирует хранилище и логирование

**Основные функции:**
```javascript
// Инициализация при запуске
app.whenReady().then(() => {
  initLogger(app)
  initializeStores()
  setupIpcHandlers()
  createWindow()
  
  // Автообновление (только в production)
  if (app.isPackaged) {
    autoUpdaterModule.initAutoUpdater(config)
  }
})
```

### 4.2 Launchers

#### RDP Launcher (rdpLauncher.js)

Запускает RDP-подключения через `mstsc.exe` (Windows) или Windows App (macOS).

**Создаёт .rdp файл с параметрами:**
```
full address:s:192.168.1.100
username:s:DOMAIN\username
screen mode id:i:1
desktopwidth:i:1920
desktopheight:i:1080
```

**Логика запуска на macOS:**
1. Проверяет наличие "Windows App" через `mdfind` (bundle ID: `com.microsoft.rdc.macos`)
2. Проверяет наличие "Microsoft Remote Desktop" (legacy)
3. Запускает через `open -a "Windows App" <file.rdp>`

#### Horizon Launcher (horizonLauncher.js)

Запускает VMware Horizon Client.

**Windows:** вызывает `vmware-view.exe` с аргументами:
```
--serverURL=https://telework.alfabank.ru
--desktopName=workspace-fullwm
--userName=DOMAIN\username
--loginAsCurrentUser=true
--unattended
```

**macOS:** использует формат `open -a`:
```bash
open -a "VMware Horizon Client" --args \
  -serverUrl https://telework.alfabank.ru \
  -desktopName workspace-fullwm \
  -userName DOMAIN\\username \
  -loginAsCurrentUser
```

**Поиск клиента:**
1. Кастомный путь из настроек
2. Стандартные пути установки
3. Команда `where` (Windows) / `mdfind` (macOS)
4. Рекурсивный поиск в Program Files

#### Citrix Launcher (citrixLauncher.js)

Запускает Citrix Workspace через SelfService.

**Windows:**
```
"C:\Program Files (x86)\Citrix\ICA Client\SelfServicePlugin\SelfService.exe" -launch "Desktop"
```

**macOS:**
```bash
open -a "Citrix Workspace" --args -launch "Desktop"
```

### 4.3 Storage (simpleStore.js)

Простое JSON-хранилище на основе файлов.

**Расположение:** `%APPDATA%/Alfa Remote Client/config.json`

**Структура:**
```json
{
  "settings": {
    "user": { "domain": "MOSCOW", "username": "ivanov" },
    "rdp": { "resolution": "1920x1080", ... },
    "horizon": { "serverUrl": "...", ... },
    "citrix": { "storeUrl": "...", ... },
    "general": { "minimizeToTray": false }
  },
  "connections": [
    {
      "id": "1234567890",
      "type": "rdp",
      "name": "Рабочий ПК",
      "host": "192.168.1.100",
      "username": "MOSCOW\\ivanov",
      "desktopPool": "",
      "description": "",
      "isDefault": false,
      "clientSettings": {}
    }
  ],
  "profiles": []
}
```

### 4.4 Logger (logger.js)

Логирование через `electron-log`.

**Файл лога:** `%APPDATA%/Alfa Remote Client/logs/`

**Уровни логирования:**
- `info` — информационные сообщения
- `warn` — предупреждения
- `error` — ошибки

**Пример вывода:**
```
[2026-03-13T11:07:44.823Z] [info] Horizon Launcher: Using app at: /Applications/VMware Horizon Client.app
[2026-03-13T11:07:44.824Z] [warn] Horizon Launcher: CLI tool not found in app bundle
```

### 4.5 Auto Updater (autoUpdater.js)

Автоматическое обновление через GitHub Releases.

**Процесс:**
1. При запуске проверяет наличие обновлений на GitHub
2. Если есть — уведомляет пользователя
3. Пользователь может скачать обновление
4. После загрузки — перезапуск для установки

---

## 5. Конфигурация

### 5.1 Настройки по умолчанию (deployment-defaults.json)

```json
{
  "settings": {
    "user": {
      "domain": "",
      "username": ""
    },
    "rdp": {
      "resolution": "1920x1080",
      "colorDepth": "32",
      "multimon": false,
      "clipboard": true,
      "driveMapping": false,
      "useAdminSession": false,
      "promptCredentials": true,
      "startFullScreen": false,
      "span": false,
      "customFlags": ""
    },
    "horizon": {
      "serverUrl": "https://telework.alfabank.ru",
      "desktopName": "workspace-fullwm",
      "loginAsCurrentUser": true,
      "unattended": true,
      ...
    },
    "citrix": {
      "storeUrl": "https://sf-vdi.moscow.alfaintra.net/Citrix/VDI-Apps/discovery",
      "resourceName": "",
      ...
    },
    "general": {
      "minimizeToTray": false,
      "startMinimized": false
    }
  },
  "connections": []
}
```

### 5.2 Параметры RDP

| Параметр | Описание | Значение по умолчанию |
|----------|----------|----------------------|
| `resolution` | Разрешение экрана | 1920x1080 |
| `colorDepth` | Глубина цвета (бит) | 32 |
| `multimon` | Несколько мониторов | false |
| `clipboard` | Буфер обмена | true |
| `driveMapping` | Подключение дисков | false |
| `useAdminSession` | Административная сессия (/admin) | false |
| `promptCredentials` | Запрос учётных данных (/prompt) | true |
| `startFullScreen` | Полноэкранный режим (/f) | false |
| `span` | Span на все мониторы (/span) | false |
| `customFlags` | Дополнительные параметры .rdp | - |

### 5.3 Параметры Horizon

| Параметр | Описание | Флаг CLI |
|----------|----------|----------|
| `serverUrl` | URL сервера Horizon | `--serverURL` |
| `desktopName` | Имя десктопа/пула | `--desktopName` |
| `appName` | Имя приложения | `--appName` |
| `desktopProtocol` | Протокол (PCoIP, Blast, RDP) | `--desktopProtocol` |
| `desktopLayout` | Режим отображения | `--desktopLayout` |
| `monitors` | Индексы мониторов | `--monitors` |
| `unattended` | Без участия пользователя | `--unattended` |
| `loginAsCurrentUser` | Вход под текущим пользователем | `--loginAsCurrentUser` |
| `customPath` | Путь к vmware-view.exe | - |
| `customFlags` | Дополнительные флаги | - |

### 5.4 Параметры Citrix

| Параметр | Описание |
|----------|----------|
| `storeUrl` | URL Citrix Store |
| `resourceName` | Имя ресурса (Desktop/App) |
| `customPath` | Путь к selfservice.exe |
| `customFlags` | Дополнительные параметры |

---

## 6. Запуск и сборка

### 6.1 Установка зависимостей

```bash
npm install
```

### 6.2 Режим разработки

```bash
npm run dev
```

Запускает Vite dev server и Electron одновременно.

### 6.3 Сборка

**Windows:**
```bash
npm run build:win
```
Результат: `dist/Alfa Remote Client Setup.exe` (NSIS инсталлятор)

**macOS:**
```bash
npm run build:mac
```
Результат: `dist/Alfa Remote Client-0.x.x.dmg`

### 6.4 Конфигурация electron-builder

```json
{
  "build": {
    "appId": "com.alfa.remoteclient",
    "productName": "Alfa Remote Client",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64"] }],
      "icon": "assets/icon.ico",
      "publish": {
        "provider": "github",
        "owner": "DlnKot",
        "repo": "Agregator"
      }
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

---

## 7. Автообновление

### 7.1 Настройка GitHub

1. Создайте репозиторий на GitHub
2. Обновите `package.json` с вашим owner и repo:
   ```json
   "publish": {
     "provider": "github",
     "owner": "ваш-username",
     "repo": "ваш-репозиторий"
   }
   ```
3. Обновите `src/main/main.js`:
   ```javascript
   const githubConfig = {
     owner: 'ваш-username',
     repo: 'ваш-репозиторий',
     currentVersion: app.getVersion()
   };
   ```

### 7.2 Создание Release

1. Соберите приложение: `npm run build:win`
2. Зайдите в репозиторий → **Releases** → **Create a new release**
3. Укажите тег версии: `v0.2.1` (должен совпадать с version в package.json)
4. Загрузите файлы из папки `dist`:
   - `Alfa Remote Client Setup.exe`
   - `latest.yml` (создаётся автоматически при публикации)

### 7.3 Процесс обновления

```
1. Запуск приложения
      ↓
2. autoUpdater проверяет GitHub API
      ↓
3. Если есть новая версия → 'update-available' event
      ↓
4. Пользователь нажимает "Скачать"
      ↓
5. Загрузка в фоновом режиме (progress events)
      ↓
6. 'update-downloaded' → диалог перезагрузки
      ↓
7. quitAndInstall() → перезапуск с новой версией
```

---

## 8. API и IPC

### 8.1 Preload API (window.api)

```javascript
// Подключения
window.api.getConnections()           // Получить все подключения
window.api.saveConnection(conn)       // Сохранить подключение
window.api.deleteConnection(id)       // Удалить подключение

// Настройки
window.api.getSettings()              // Получить настройки
window.api.saveSettings(settings)     // Сохранить настройки

// Профили
window.api.getProfiles()
window.api.saveProfile(profile)
window.api.deleteProfile(id)

// Запуск
window.api.launchRdp(conn, settings)
window.api.launchHorizon(conn, settings)
window.api.launchCitrix(conn, settings)

// Автообновление
window.api.checkForUpdates()          // Проверить обновления
window.api.downloadUpdate()           // Скачать обновление
window.api.installUpdate()            // Установить и перезапустить
window.api.getUpdateStatus()          // Получить статус обновлений
window.api.onAutoUpdateEvent(callback) // Подписаться на события
```

### 8.2 IPC handlers (main.js)

```javascript
// Все обработчики регистрируются в setupIpcHandlers()
ipcMain.handle('get-connections', () => ...)
ipcMain.handle('save-connection', (event, connection) => ...)
ipcMain.handle('launch-rdp', async (event, connection, settings) => ...)
ipcMain.handle('check-for-updates', async () => ...)

// События от autoUpdater
win.webContents.send('auto-update-event', { event, data })
```

---

## 9. Устранение проблем

### 9.1 RDP не запускается на macOS

**Проблема:** Не запускается Windows App

**Решения:**
1. Убедитесь, что установлен "Windows App" из App Store
2. Проверьте логи: ищите `RDP Launcher: Windows App found: ...`
3. Убедитесь, что файл `.rdp` создаётся в временной папке

### 9.2 Horizon не подключается

**Проблемы:**
1. URL без https:// — добавьте `https://` к serverUrl
2. Неверное имя пула — проверьте `desktopPool` (обычно `workspace-fullwm`)
3. macOS: используется URL scheme вместо CLI — обновите код

**Логи:**
```bash
# Windows - логи Horizon Client
%APPDATA%\VMware\VMware Horizon Client\Logs\

# macOS - Console.app
```

### 9.3 Ошибка автообновления 404

**Проблема:** Cannot find latest.yml

**Решения:**
1. Проверьте, что тег версии совпадает с version в package.json
2. Убедитесь, что файлы загружены в Release
3. Проверьте настройки publish в package.json

### 9.4 Логи

**Расположение логов:**
- Windows: `%APPDATA%/Alfa Remote Client/logs/`
- macOS: `~/Library/Logs/Alfa Remote Client/`

**Включение отладки:**
Логи уже записываются автоматически. Для диагностики проверьте:
```javascript
// В коде
logger('info', 'сообщение')
logger('error', 'ошибка: ' + error.message)
```

---

## Версии и история изменений

| Версия | Дата | Изменения |
|--------|------|-----------|
| 0.1.0 | 2025-01 | Первоначальный релиз |
| 0.1.8 | 2025-03 | Исправления RDP/Horizon на macOS |
| 0.1.9 | 2025-03 | Добавлено автообновление |
| 0.2.0 | 2025-03 | Исправления URL для Horizon |
| 0.2.1 | 2025-03 | Финальные исправления |
| 0.4.0 | 2026-03 | Добавлена проверка сети, улучшен UI |
| 0.4.7 | 2026-03 | Исправления безопасности и RDP настроек |
| 0.4.8 | 2026-03 | Добавлен раздел "Помощь" с HelpDesk, Indeed, Виды удалёнки, Чатбот |
| 0.4.9 | 2026-03 | Добавлен индикатор статуса подключений (Эталонные/Пользовательские) |
| 0.5.0 | 2026-03 | Переход на кастомный сервер обновлений |
| 0.5.1 | 2026-03 | Minor fixes |

---

## Лицензия

MIT License
