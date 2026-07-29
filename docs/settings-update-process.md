# Процесс обновления настроек клиента

## Архитектура: единый источник правды

```
┌─────────────────────────────────────────────────────┐
│  config/deployment-defaults.json                     │
│  (компилируется в бинар через include_str!)          │
│  Это ТОЛЬКО шаблон для первоначальной загрузки       │
│  и для обновлений.                                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  <app_data_dir>/com.alfa.remoteclient/settings.json  │
│  ЕДИНСТВЕННЫЙ файл на диске. Содержит:               │
│    • defaults_version — для отслеживания обновлений  │
│    • settings — все настройки клиента                │
│    • connections — все подключения                   │
│    • recent_connections — последние использованные   │
│    • user_modified_keys — какие ключи юзер менял    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Rust backend (Tauri команды)                        │
│    get_settings → возвращает settings как есть       │
│    save_settings → сохраняет + вычисляет modified    │
│    get_connections → из того же файла                │
│    save_connection → сохраняет в тот же файл         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Vue frontend                                        │
│    useSettingsForm.js                                │
│    → initSettings(settings) — применяет то,          │
│      что пришло с бэкенда (уже смержено)            │
│    → getSettings() — возвращает для сохранения       │
└─────────────────────────────────────────────────────┘
```

---

## Структура `settings.json` на диске

Файл находится в `<app_data_dir>/com.alfa.remoteclient/settings.json`.

```json
{
  "defaults_version": "1.0",
  "settings": {
    "user": { "domain": "MOSCOW", "username": "ivanov" },
    "rdp": { "resolution": "1920x1080", ... },
    "horizon": { ... },
    "citrix": { ... },
    "general": { ... },
    "networkCheck": { "latencyThresholdMs": 100 },
    "updates": { "autoCheck": true, "useGithubReleases": false },
    "metricsEnabled": false
  },
  "connections": [
    {
      "id": "uuid-xxxxxxxx",
      "type": "horizon",
      "name": "VDI",
      "host": "https://telework.alfabank.ru",
      "factoryId": "default-horizon-vdi-primary",
      "isDefault": true,
      "isUserModified": false,
      "desktopPool": "workspace-fullwm"
    },
    {
      "id": "uuid-yyyyyyyy",
      "type": "rdp",
      "name": "Мой сервер",
      "host": "10.20.30.40",
      "isDefault": false,
      "isUserModified": true
    }
  ],
  "recent_connections": ["uuid-yyyyyyyy"],
  "user_modified_keys": ["rdp"]
}
```

### Поля

| Поле | Тип | Описание |
|------|-----|----------|
| `defaults_version` | string | Версия шаблона `deployment-defaults.json`, при которой был создан/обновлён файл |
| `settings` | object | Все настройки клиента (ключи в camelCase) |
| `connections` | array | Все подключения (дефолтные + пользовательские) |
| `recent_connections` | array | ID последних 3 использованных подключений |
| `user_modified_keys` | array | Список top-level ключей из `settings`, которые пользователь менял |

---

## Структура `deployment-defaults.json` (шаблон в бинаре)

Файл: `config/deployment-defaults.json`

```json
{
  "version": "1.0",
  "force_update_keys": [],
  "settings": { ... },
  "connections": [ ... ]
}
```

### Поля шаблона

| Поле | Тип | Описание |
|------|-----|----------|
| `version` | string | **Монотонно возрастающая версия**. При каждом изменении шаблона увеличивать. |
| `force_update_keys` | string[] | Ключи, которые ПРИНУДИТЕЛЬНО применяются даже если пользователь их менял. Формат: `"settings.rdp"`, `"settings.general"` |
| `settings` | object | Эталонные настройки. Полный перечень всех возможных ключей. |
| `connections` | array | Эталонные дефолтные подключения. Каждое должно иметь уникальный `factoryId`. |

### Секция `settings` — полный перечень ключей

```json
{
  "settings": {
    "user": {
      "domain": "",
      "username": ""
    },
    "rdp": {
      "host": "",
      "resolution": "800x600",
      "colorDepth": "32",
      "multimon": true,
      "span": false,
      "startFullScreen": true,
      "clipboard": true,
      "driveMapping": false,
      "promptCredentials": false,
      "useAdminSession": false,
      "audio": {
        "playback": true,
        "capture": true
      },
      "redirect": {
        "printers": true,
        "smartcards": true,
        "webauthn": true
      },
      "performance": {
        "wallpaper": true,
        "fontSmoothing": false,
        "desktopComposition": false,
        "fullWindowDrag": false,
        "menuAnimations": false
      },
      "customFlags": "compression:i:1\nnetworkautodetect:i:1\n..."
    },
    "horizon": {
      "appName": "",
      "desktopProtocol": "",
      "desktopLayout": "",
      "monitors": "",
      "unattended": false,
      "nonInteractive": false,
      "launchMinimized": false,
      "loginAsCurrentUser": false,
      "hideClientAfterLaunchSession": false,
      "useExisting": false,
      "singleAutoConnect": false,
      "customPath": "",
      "customFlags": ""
    },
    "citrix": {
      "accountName": "",
      "resourceName": "",
      "customPath": "",
      "customFlags": ""
    },
    "general": {
      "minimizeToTray": false,
      "startMinimized": false
    },
    "networkCheck": {
      "hosts": [],
      "pingCount": 4,
      "latencyThresholdMs": 100
    },
    "updates": {
      "autoCheck": true,
      "useGithubReleases": true
    },
    "metricsEnabled": false
  }
}
```

> **Важно:** Ключи в `settings` используются в UI через `v-model="localSettings.<key>.<field>"`. Все ключи должны быть в camelCase, потому что так их ожидает Vue-фронтенд.

---

## Процесс при запуске приложения

```
Запуск
  │
  ▼
load_deployment_defaults()
  │  Читает config/deployment-defaults.json
  │  через include_str! (компилируется в бинар)
  │  Возвращает DeploymentDefaults { version, force_update_keys, settings, connections }
  │
  ▼
SettingsFile::new(path, defaults)
  │
  ├── Файла settings.json нет
  │     └── seed_from_defaults(defaults)
  │           Создать SettingsFileData:
  │             defaults_version = defaults.version
  │             settings = defaults.settings (копия)
  │             connections = defaults.connections (с UUID)
  │             recent_connections = []
  │             user_modified_keys = []
  │
  ├── Файл settings.json есть
  │     └── Прочитать → десериализовать в SettingsFileData
  │           Если прочитать не удалось → seed_from_defaults
  │
  └─── merge_defaults(defaults)
        │
        ├── Если defaults_version == defaults.version
        │     └── ничего не делаем, всё актуально
        │
        └── Если defaults_version != defaults.version
              │
              ├── 1. Слияние настроек:
              │     Берём defaults.settings как базу
              │     Для каждого ключа в user_settings:
              │       если ключ в force_update_keys → пропускаем (оставляем дефолт)
              │       если ключ в user_modified_keys И значение отличается
              │         → применяем пользовательское значение
              │       если ключ НЕ в user_modified_keys И значение отличается
              │         → применяем пользовательское значение (маловероятно)
              │       иначе → оставляем дефолт
              │
              ├── 2. Слияние подключений:
              │     Для каждого default connection:
              │       если factory_id НЕ найден среди существующих
              │         → добавляем (с новым UUID)
              │       если factory_id найден
              │         → НЕ трогаем (пользователь мог переименовать)
              │
              └── 3. defaults_version = defaults.version
                    Записать settings.json на диск
```

---

## Как добавить НОВУЮ настройку в следующей версии

### Пример: добавить настройку `rdp.enableHardwareAcceleration`

**Шаг 1. Обновить `config/deployment-defaults.json`**

```json
{
  "version": "1.1",
  "force_update_keys": [],
  "settings": {
    "rdp": {
      "resolution": "800x600",
      "enableHardwareAcceleration": true,
      ...
    },
    ...
  },
  "connections": [...]
}
```

- Добавить поле `enableHardwareAcceleration: true` в секцию `rdp`
- Увеличить `version` с `"1.0"` до `"1.1"`

**Шаг 2. (опционально) Обновить Rust-код, если новая настройка влияет на логику лаунчера**

В `launchers.rs`, в `launch_rdp`, настройка читается как:
```rust
let hw_accel = rdp_settings
    .get("enableHardwareAcceleration")
    .and_then(|v| v.as_bool())
    .unwrap_or(true);
```

Добавить использование этой настройки при генерации .rdp файла.

**Шаг 3. (опционально) Добавить UI-элемент в настройки**

В `RdpSettings.vue` добавить:
```html
<label class="toggle-item">
  <span>Аппаратное ускорение</span>
  <label class="toggle">
    <input type="checkbox" v-model="localSettings.rdp.enableHardwareAcceleration">
    <span class="toggle-slider"></span>
  </label>
</label>
```

**Шаг 4. (опционально) Добавить поле в SECTION_SHAPES в `useSettingsForm.js`**

```js
const SECTION_SHAPES = {
  rdp: {
    enableHardwareAcceleration: true,
    ...
  },
  ...
}
```

> Это нужно, чтобы при пустых настройках с бэкенда форма не падала. Если настройка гарантированно приходит с бэкенда — можно не добавлять.

### Что произойдёт при обновлении клиента

1. Пользователь устанавливает новую версию
2. При запуске `deployment-defaults.json` имеет `version: "1.1"`
3. В `settings.json` пользователя `defaults_version: "1.0"`
4. Запускается `merge_defaults`:
   - `user_modified_keys` пользователя — например `["rdp.resolution"]`
   - Новая настройка `rdp.enableHardwareAcceleration` **НЕ в user_modified_keys**
   - Она не была изменена пользователем (её просто не было)
   - → Она применяется из дефолтов (значение `true`)
5. Пользователь заходит в настройки → видит новый чекбокс со значением `true`

---

## Как принудительно обновить настройку (force_update_keys)

### Сценарий: админу нужно сменить `rdp.resolution` с `800x600` на `1280x720`

Даже если пользователь менял разрешение, оно должно примениться принудительно.

**Шаг 1. Обновить `config/deployment-defaults.json`**

```json
{
  "version": "1.2",
  "force_update_keys": ["settings.rdp"],
  "settings": {
    "rdp": {
      "resolution": "1280x720",
      ...
    }
  },
  "connections": [...]
}
```

- Новое значение `resolution: "1280x720"` в секции `rdp`
- Добавлен `"settings.rdp"` в `force_update_keys`
- Увеличена `version` до `"1.2"`

### Что произойдёт

1. `merge_defaults` видит `"settings.rdp"` в `force_update_keys`
2. Пропускает пользовательское значение для всего ключа `rdp`
3. **ВСЯ секция `rdp`** сбрасывается на дефолтную (все поля внутри!)
4. После мержа `user_modified_keys` не очищается для `rdp`
5. Когда пользователь в следующий раз сохранит настройки — `rdp` снова попадёт в `user_modified_keys`, если он что-то поменяет

> **Важно:** `force_update_keys` форсирует ЦЕЛЫЙ top-level ключ. Если нужно форснуть только одно поле внутри секции — сейчас механизма нет. Если понадобится — нужно добавить точечный force update.

---

## Как добавить новое дефолтное подключение

### Пример: добавить подключение "Horizon - Тестовый полигон"

**Шаг 1. Обновить `config/deployment-defaults.json`**

```json
{
  "version": "1.3",
  "force_update_keys": [],
  "settings": { ... },
  "connections": [
    { "factoryId": "default-horizon-vdi-primary", ... },
    { "factoryId": "default-horizon-vdi-backup", ... },
    { "factoryId": "default-rdp-purms", ... },
    { "factoryId": "default-citrix-vdi-apps", ... },
    {
      "factoryId": "default-horizon-test",
      "type": "horizon",
      "name": "Horizon - Тестовый полигон",
      "host": "https://test.alfabank.ru",
      "description": "Тестовый полигон Horizon",
      "isDefault": true,
      "isUserModified": false,
      "desktopPool": "workspace-test"
    }
  ]
}
```

- Новый объект подключения с уникальным `factoryId`
- Увеличена `version`

### Что произойдёт

1. `merge_defaults` видит `factoryId: "default-horizon-test"` — его нет среди существующих
2. Добавляет новое подключение (с новым UUID) в конец списка
3. Существующие подключения не трогаются

> **Важно:** Если изменить `host` или `name` у существующего дефолтного подключения (с тем же `factoryId`), изменения НЕ применятся к пользователю, если он уже переименовал или менял это подключение. Если нужно форснуть — нужно очистить `isUserModified` или удалить старое подключение из `settings.json` у пользователя.

---

## Как работает `user_modified_keys`

### Сохранение настроек

Когда пользователь нажимает "Сохранить настройки":

```
save_settings(new_settings)
  │
  ├── Сравнить каждый top-level ключ new_settings
  │   с соответствующим ключом в defaults.settings
  │
  ├── Если new_settings.rdp != defaults.settings.rdp
  │     → добавить "rdp" в user_modified_keys
  │
  ├── Если new_settings.user == defaults.settings.user
  │     → убрать "user" из user_modified_keys (если был)
  │
  └── Сохранить settings.json с обновлённым user_modified_keys
```

### Влияние на обновления

При следующем обновлении клиента:
- Ключи ВНЕ `user_modified_keys` — обновляются до новых дефолтных значений
- Ключи В `user_modified_keys` — сохраняют пользовательские значения
- Ключи В `force_update_keys` — обновляются принудительно (даже если в `user_modified_keys`)

---

## Полный сценарий: выпуск новой версии с изменениями

### Допустим, нужно:
1. Добавить настройку `rdp.enableHardwareAcceleration`
2. Сменить `rdp.resolution` с `800x600` на `1280x720` (принудительно)
3. Добавить новое дефолтное подключение "Horizon - Тестовый полигон"

### `deployment-defaults.json`:

```json
{
  "version": "1.4",
  "force_update_keys": ["settings.rdp"],
  "settings": {
    "user": { "domain": "", "username": "" },
    "rdp": {
      "resolution": "1280x720",
      "colorDepth": "32",
      "multimon": true,
      "enableHardwareAcceleration": true,
      ...
    },
    "horizon": { ... },
    "citrix": { ... },
    "general": { ... },
    "networkCheck": { "latencyThresholdMs": 100 },
    "updates": { "autoCheck": true, "useGithubReleases": true },
    "metricsEnabled": false
  },
  "connections": [
    { "factoryId": "default-horizon-vdi-primary", ... },
    { "factoryId": "default-horizon-vdi-backup", ... },
    { "factoryId": "default-rdp-purms", ... },
    { "factoryId": "default-citrix-vdi-apps", ... },
    {
      "factoryId": "default-horizon-test",
      "type": "horizon",
      "name": "Horizon - Тестовый полигон",
      "host": "https://test.alfabank.ru",
      ...
    }
  ]
}
```

### Что произойдёт у пользователя после обновления:

1. Пользователь установил новую версию → запустил
2. `defaults_version: "1.3"` → не совпадает с `"1.4"`
3. **merge_defaults:**
   - **rdp** — в `force_update_keys` → вся секция `rdp` сбрасывается на дефолт:
     - `resolution` становится `1280x720`
     - `enableHardwareAcceleration` становится `true`
     - Все остальные поля rdp тоже сбрасываются на дефолт
   - **Другие секции** — не в `force_update_keys`:
     - Если пользователь менял → оставляем его значения
     - Если не менял → обновляем до новых дефолтов
   - **default-horizon-test** — новый `factoryId` → добавляем в список подключений
4. `defaults_version` обновляется до `"1.4"`
5. `settings.json` сохраняется на диск
6. Когда пользователь зайдёт в настройки RDP — увидит `1280x720` и новый чекбокс

---

## Rust: ключевые структуры

### `DeploymentDefaults` (`src-tauri/src/models.rs:28`)

```rust
pub struct DeploymentDefaults {
    pub version: String,
    pub force_update_keys: Vec<String>,
    pub settings: Value,
    pub connections: Vec<Connection>,
}
```

### `SettingsFileData` (`src-tauri/src/models.rs:38`)

```rust
pub struct SettingsFileData {
    pub defaults_version: String,
    pub settings: Value,
    pub connections: Vec<Connection>,
    pub recent_connections: Vec<String>,
    pub user_modified_keys: Vec<String>,
}
```

### `Connection` (`src-tauri/src/models.rs:7`)

```rust
pub struct Connection {
    pub id: Option<String>,
    pub connection_type: String,   // "rdp" | "horizon" | "citrix"
    pub name: String,
    pub host: String,
    pub description: Option<String>,
    pub username: Option<String>,
    pub domain: Option<String>,
    pub port: Option<u16>,
    pub is_default: bool,
    pub is_user_modified: bool,
    pub factory_id: Option<String>,
    pub extra: Value,              // дополнительные поля (desktopPool, storeUrl, и т.д.)
}
```

### `SettingsFile` (`src-tauri/src/store/settings_file.rs:11`)

Методы:

| Метод | Описание |
|-------|----------|
| `new(path, defaults)` | Создать/загрузить файл, выполнить merge при несовпадении версий |
| `get_settings() -> Value` | Получить настройки |
| `save_settings(new_settings, defaults)` | Сохранить настройки + пересчитать `user_modified_keys` |
| `get_connections() -> Vec<Connection>` | Получить все подключения |
| `save_connections(connections)` | Сохранить подключения |
| `get_recent_connections() -> Vec<String>` | Получить ID недавних |
| `save_recent_connections(recent)` | Сохранить ID недавних |

---

## Фронтенд: ключевые файлы

### `useSettingsForm.js`

- `SECTION_SHAPES` — минимальные формы для каждой секции (чтобы реактивность не ломалась при пустых данных)
- `initSettings(settings)` — применяет настройки с бэкенда (мерж с SECTION_SHAPES)
- `getSettings()` — возвращает текущие настройки для сохранения

### `api/index.js`

- `settingsApi.get()` → `invoke('get_settings')`
- `settingsApi.save(settings)` → `invoke('save_settings', { settings })`

### `useSettings.js`

- `loadSettings()` — загружает с бэкенда, устанавливает `isFirstRun`
- `saveSettings(newSettings)` — отправляет на бэкенд

---

## Важные моменты

1. **Не удалять старые ключи из `deployment-defaults.json`** — если у пользователя в `settings.json` есть ключ, которого нет в дефолтах, он сохранится в `user_modified_keys` и будет перезаписан при мерже (потому что мерж начинается с дефолтов как базы). Если нужно удалить ключ — удалять его и из `deployment-defaults.json`, и написать миграцию.

2. **camelCase во всём** — и в `deployment-defaults.json`, и в `settings.json`, и на фронтенде. Rust-структуры используют `#[serde(rename_all = "camelCase")]` для Connection, а SettingsFileData хранит `settings: Value` (как есть, без трансформации).

3. **force_update_keys сбрасывает ЦЕЛУЮ секцию** — осторожно, если в секции много полей, все они сбросятся.

4. **При первом запуске** — если `settings.json` не существует, он создаётся ПОЛНОСТЬЮ из `deployment-defaults.json`. Это значит, что все настройки на новом компьютере будут в точности как в шаблоне.

5. **Локальный файл имеет приоритет** — если пользователь вручную отредактирует `settings.json` и изменит какой-то ключ, бэкенд при следующем `save_settings` заметит это и добавит в `user_modified_keys` (потому что сравнит с дефолтами).

6. **Тестирование обновлений** — чтобы протестировать сценарий обновления:
   - Запустить старую версию → она создаст `settings.json` с `defaults_version: "1.0"`
   - Остановить, обновить бинар (с новым `deployment-defaults.json`)
   - Запустить снова → `merge_defaults` сработает

---

## Пример: минимальное изменение настроек

Допустим, нужно просто сменить дефолтное разрешение RDP с `800x600` на `1024x768`, НЕ форся:

```json
{
  "version": "1.1",
  "force_update_keys": [],
  "settings": {
    "rdp": {
      "resolution": "1024x768",
      ...
    }
  },
  ...
}
```

Результат:
- У новых пользователей → `1024x768`
- У существующих, кто НЕ менял разрешение → `1024x768` (ключ не в `user_modified_keys`)
- У существующих, кто менял разрешение → останется их значение (ключ в `user_modified_keys`)
