# Remote Desktop Manager

Агрегатор для запуска клиентов подключения к удалённым рабочим столам (RDP, VMware Horizon, Citrix Workspace).

## Возможности

- **Подключения** - управление списком подключений к удалённым рабочим столам
- **Профили** - группировка подключений в профили для быстрого запуска
- **Настройки** - конфигурация параметров для каждого типа подключения:
  - RDP: разрешение, глубина цвета, несколько мониторов, буфер обмена
  - VMware Horizon: URL Broker, Desktop Pool, дополнительные опции
  - Citrix Workspace: Store URL, режим HDX, дополнительные параметры

## Установка

```bash
npm install
```

## Запуск в режиме разработки

```bash
npm run dev
```

## Сборка приложения

```bash
npm run build
```

Собранное приложение будет в папке `dist/`.

## Использование

1. **Добавление подключения**
   - Нажмите кнопку "Добавить" в разделе "Подключения"
   - Выберите тип подключения (RDP, Horizon, Citrix)
   - Заполните название и хост (IP или hostname)
   - При необходимости сохраните учётные данные

2. **Запуск подключения**
 - Нажмите кнопку воспроизведения на карточке подключения
 - Клиент запускается с учётом ОС:
 - **RDP**: Windows → `mstsc.exe`, macOS → `Windows App` (fallback: `Microsoft Remote Desktop`)
 - **Horizon**: Windows → `vmware-view.exe`, macOS → `VMware Horizon Client`
 - **Citrix**: Windows → `selfservice.exe`, macOS → `Citrix Workspace`

3. **Настройки**
   - Перейдите в раздел "Настройки"
   - Настройте параметры по умолчанию для каждого типа подключения
   - Нажмите "Сохранить настройки"

## Структура проекта

```
src/
├── main/
│   └── main.js          # Основной процесс Electron
├── preload/
│   └── preload.js       # Прелоуд для безопасного IPC
└── renderer/
    ├── index.html       # HTML разметка
    ├── styles.css       # Стили
    └── app.js           # Логика UI
```

## Требования

- Node.js18+
- Electron33+
- Windows или macOS
- Для macOS:
 - RDP: установлен `Windows App` (или `Microsoft Remote Desktop`)
 - Horizon: установлен `VMware Horizon Client`
 - Citrix: установлен `Citrix Workspace`
