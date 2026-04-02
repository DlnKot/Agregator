# План рефакторинга

## 1. Удаление GitHub Updates

### Файлы для изменения:

#### `src/main/config/defaults.js`
- Удалить `updates.useGithub` из BUILTIN_DEFAULTS

#### `src/main/utils/autoUpdater.js` (461 строк → ~250 строк)
- Удалить константы `DEFAULT_GITHUB_OWNER`, `DEFAULT_GITHUB_REPO`
- Удалить логику `useGithub` в `initAutoUpdater()`
- Удалить `setFeedURL` с GitHub provider
- Удалить `getUpdateStatus` github-специфичную логику
- Оставить только кастомный сервер (`CUSTOM_UPDATE_URL`)

#### `src/main/main.js`
- Удалить `useGithub` из `getAutoUpdateConfig()`
- Упростить конфиг до `{ currentVersion, updateUrl, updateUrlHttp }`

#### `src/main/ipc/settings.js`
- Удалить `useGithub` из логики re-init auto-updater

#### `src/renderer-vue/src/components/settings/UpdatesSettings.vue`
- Удалить entire GitHub toggle section (form-group с `updates-use-github`)

#### `src/renderer-vue/src/components/settings/useSettingsForm.js`
- Удалить `useGithub: false` из defaultSettings

#### `.github/workflows/build-and-release.yml`
- Оставить только Windows build (убрать macOS job если не нужен)
- Убрать latest-mac.yml из артефактов

---

## 2. Настройки безопасности Electron

### `src/main/lifecycle.js`
- УДАЛИТЬ блок ARC_ALLOW_INSECURE_TLS (строки 30-35)
- Это опасный feature flag, не должен быть в продакшене

### `src/renderer-vue/index.html`
- Улучшить CSP: убрать `'unsafe-inline'` для script-src если возможно
- Использовать nonce или хеши вместо unsafe-inline

### `src/main/window/manager.js`
- Проверить что sandbox: true (уже есть)
- Проверить что contextIsolation: true (уже есть)
- Проверить что nodeIntegration: false (уже есть)

---

## 3. Удаление легаси кода

### `src/main/utils/metricsSender.js`
- Удалить TODO комментарий (строка 83)
- Решить: оставить или удалить модуль если сервер ещё не готов

### `src/main/stores/storeManager.js`
- Удалить legacy migration код если он больше не нужен (строки 51-81)
- Миграция с legacy connections должна быть завершена

### `src/main/config/defaults.js`
- Проверить неиспользуемые default поля

### `src/renderer-vue/src/composables/useApp.js`
- Очистить если есть дублирующий код с другими composables

---

## 4. Оптимизация GitHub Workflow

### `.github/workflows/build-and-release.yml`

**Текущая проблема:** 16+ артефактов

**Оптимизация:**
```yaml
# Только необходимые файлы:
dist/Alfa.Remote.Client-*-Setup.exe          # Windows installer
dist/Alfa.Remote.Client-*-Setup.exe.blockmap # Для auto-update
dist/latest.yml                              # Метаданные обновлений
```

**Изменения:**
- Убрать macOS если не нужен (или оставить минимальный)
- Убрать `.dmg.blockmap`, `.zip`, `latest-mac.yml` если не используется GitHub для обновлений
- Оставить только то, что нужно для кастомного сервера

### `.github/workflows/dev-build.yml`
- Аналогичная оптимизация
- Убрать создание release (оставить только artifacts)

---

## Порядок выполнения

1. Удалить GitHub updates (autoUpdater, defaults, UI)
2. Убрать ARC_ALLOW_INSECURE_TLS
3. Удалить legacy код
4. Оптимизировать workflows
