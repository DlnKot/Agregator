# Remote Desktop Manager - Specification

## 1. Project Overview

**Project Name:** Remote Desktop Manager  
**Type:** Desktop Application (Electron)  
**Core Functionality:** Агрегатор для запуска клиентов подключения к удалённым рабочим столам (RDP, VMware Horizon, Citrix Workspace)  
**Target Users:** IT-специалисты, сотрудники с удалённым доступом

## 2. UI/UX Specification

### Layout Structure

- **Single Window Application** с боковой панелью навигации
- **Sidebar (Left):** 200px фиксированная ширина, содержит табы навигации
- **Main Content (Right):** остальное пространство, динамический контент
- **Window Controls:** стандартные (минимизация, максимизация, закрытие)

### Visual Design

**Color Palette:**
- Background Primary: `#0f0f0f` (тёмный фон)
- Background Secondary: `#1a1a1a` (карточки, панели)
- Background Tertiary: `#252525` (hover states)
- Accent Primary: `#3b82f6` (синий - основные действия)
- Accent Secondary: `#10b981` (зелёный - успех/подключено)
- Accent Warning: `#f59e0b` (оранжевый - предупреждение)
- Accent Danger: `#ef4444` (красный - ошибка/отключено)
- Text Primary: `#ffffff`
- Text Secondary: `#a1a1aa`
- Border: `#2d2d2d`

**Typography:**
- Font Family: `'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif`
- Headings: 18px (h1), 16px (h2), 14px (h3)
- Body: 14px
- Small: 12px

**Spacing System:**
- Base unit: 4px
- Padding small: 8px
- Padding medium: 16px
- Padding large: 24px
- Gap: 12px
- Border radius: 8px

**Visual Effects:**
- Card shadows: `0 2px 8px rgba(0,0,0,0.3)`
- Hover transitions: 150ms ease
- Active tab indicator: 3px left border accent color

### Components

**Sidebar Navigation:**
- Логотип/название приложения сверху
- Навигационные табы:
  - Подключения (иконка монитора)
  - Профили (иконка пользователя)
  - Настройки (иконка шестерёнки)
- Активный таб: подсветка + left border

**Connection Cards:**
- Card для каждого подключения
- Отображает: название, тип (RDP/Horizon/Citrix), статус
- Кнопки: Подключить, Редактировать, Удалить
- Hover: slight elevation + border highlight

**Settings Panel:**
- Tabs для каждого клиента (RDP, Horizon, Citrix)
- Формы с инпутами для флагов подключения
- Кнопка сохранения

**Modal Dialogs:**
- Для создания/редактирования подключений
- Полутемный оверлей
- Центрированное окно

## 3. Functional Specification

### Core Features

**1. Connection Manager**
- Создание, редактирование, удаление подключений
- Типы подключений: RDP, VMware Horizon, Citrix Workspace
- Хранение настроек подключения в JSON файле
- Запуск соответствующего клиента с параметрами

**2. Launcher (запуск клиентов)**
- **RDP:** запуск `mstsc.exe` с переданными параметрами
- **VMware Horizon:** запуск `vmware-view.exe`
- **Citrix Workspace:** запуск `Citrix Workspace.exe` или `selfservice.exe`

**3. Credential Store**
- Хранение учётных данных (опционально)
- Использует system keychain или зашифрованный файл

**4. Profiles**
- Управление профилями подключений
- Импорт/экспорт профилей

**5. Settings**
- Глобальные настройки
- Настройки для каждого клиента отдельно:
  - **RDP:** разрешение, глубина цвета, multimon, clipboard, drive mapping
  - **Horizon:** broker URL, desktop pool, options
  - **Citrix:** store URL, HDX mode, receiver options

### User Interactions

1. Выбор типа подключения в sidebar
2. Просмотр списка подключений
3. Создание нового подключения (кнопка +)
4. Редактирование подключения (клик на карточку или кнопка)
5. Запуск подключения (кнопка "Подключить")
6. Переход в настройки для конфигурации флагов

### Data Flow

```
User Action → IPC (Renderer → Main) → Business Logic → External Client Launch
                    ↓
            Config Store (JSON)
                    ↓
            Credential Store (encrypted)
```

### Key Modules

**Main Process (main.js):**
- Window management
- IPC handlers
- Client launcher
- Config storage
- Logging

**Renderer Process:**
- React/Vue или Vanilla JS UI
- State management
- IPC communication

**Modules:**
- `launcher.js` - запуск внешних клиентов
- `config-store.js` - работа с конфигурацией
- `credential-store.js` - безопасное хранение учётных данных

## 4. Acceptance Criteria

### Visual Checkpoints
- [ ] Приложение запускается с тёмной темой
- [ ] Sidebar отображает 3 таба с иконками
- [ ] Активный таб имеет визуальную индикацию
- [ ] Карточки подключений отображаются корректно
- [ ] Настройки разделены по клиентам (RDP, Horizon, Citrix)
- [ ] Модальные окна открываются и закрываются
- [ ] Формы имеют современный вид

### Functional Checkpoints
- [ ] Создание подключения работает
- [ ] Редактирование подключения работает
- [ ] Удаление подключения работает
- [ ] Запуск RDP через mstsc работает
- [ ] Запуск Horizon client работает
- [ ] Запуск Citrix Workspace работает
- [ ] Настройки сохраняются и загружаются
- [ ] Приложение сворачивается, разворачивается, закрывается
