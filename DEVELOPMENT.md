# Alfa Remote Client - Development & Release Guide

## Структура веток

### `dev` ветка (разработка)
- **Назначение:** Активная разработка, тестирование новых фич
- **Автоматизация:** При пуше создается **Development Build** (pre-release) на GitHub
- **Тегирование:** Не требуется
- **Когда использовать:** Для разработки новых функций и исправления багов

### `main` ветка (стабильные релизы)
- **Назначение:** Стабильные, готовые к продакшену версии
- **Автоматизация:** При пуше создается **Stable Release** на GitHub
- **Тегирование:** Автоматическое (на основе версии в `package.json`)
- **Когда использовать:** Только когда фича полностью протестирована и готова к выпуску

## Workflow разработки

### 1. Работа на dev ветке
```bash
# Переключиться на dev ветку
git checkout dev

# Создать feature ветку из dev
git checkout -b feature/my-feature

# Работать над фичей...
# Коммитить изменения

# Когда готово - merge в dev
git checkout dev
git pull origin dev
git merge feature/my-feature
git push origin dev
```

### 2. Автоматическая сборка (dev ветка)
При пуше в `dev` автоматически:
- ✅ Собирается приложение для Windows и macOS
- ✅ Создается/обновляется **Development Build** release
- ✅ Артефакты доступны в GitHub Releases (tag: `dev-build`)

### 3. Переход на main (релиз)
Когда dev ветка стабильна и готова к релизу:

```bash
# Вернуть изменения в main
git checkout main
git pull origin main
git merge dev
git push origin main
```

Автоматически:
- ✅ Собирается приложение для Windows и macOS
- ✅ Создается **Stable Release** на GitHub
- ✅ Релиз содержит свежие артефакты

## Версионирование

Версия определяется в `package.json`:

```json
{
  "version": "0.2.3"
}
```

**Правила версионирования:**
- `MAJOR.MINOR.PATCH` (семантическое версионирование)
- `MAJOR` - крупные изменения (несовместимое изменение API)
- `MINOR` - новые фичи (обратно совместимо)
- `PATCH` - исправления багов

**Пример:**
```bash
# Исправление бага
# 0.2.3 → 0.2.4

# Новая фича
# 0.2.4 → 0.3.0

# Крупное обновление
# 0.3.0 → 1.0.0
```

## GitHub Actions CI/CD

### Триггеры
- ✅ Пуш в `dev` → Development Build
- ✅ Пуш в `main` → Stable Release
- ✅ Тег `v*` в main → Named Release

### Процесс
1. **Build Windows** - компилирует на Windows Runner
2. **Build macOS** - компилирует на macOS Runner
3. **Create Release** - создает релиз на GitHub

### Что попадает в релиз
- `Alfa.Remote.Client-X.X.X-Setup.exe` (Windows)
- `Alfa.Remote.Client-X.X.X.dmg` (macOS x64)
- `Alfa.Remote.Client-X.X.X-arm64.dmg` (macOS ARM)
- `.blockmap` файлы для дельта-обновлений

## Команды для разработки

### Собрать локально (без публикации)
```bash
npm run build:win    # Windows
npm run build:mac    # macOS
```

### Опубликовать на GitHub (требует GH_TOKEN)
```bash
export GH_TOKEN=your_token_here
npm run publish:win   # Windows + публикация
npm run publish:mac   # macOS + публикация
```

### Работа с dev веткой
```bash
git checkout dev
git pull origin dev
# ... внести изменения ...
git add .
git commit -m "feat: добавить новую фичу"
git push origin dev
```

### Переход на main (релиз)
```bash
git checkout main
git pull origin main
git merge dev
# Обновить версию в package.json если нужно
git push origin main
```

## Откуда скачивать релизы

1. Идите на https://github.com/DlnKot/Agregator/releases
2. **Основной релиз** - Latest Release (main ветка)
3. **Dev версия** - Development Build (tag: `dev-build`)

## Troubleshooting

### GitHub Actions сборка упала
1. Проверьте логи в Actions tab
2. Убедитесь, что `package.json` синтаксис правильный
3. Проверьте что Node.js версия 20+ используется

### Релиз не создался
- Проверьте что token имеет доступ к `contents: write`
- Убедитесь что у репо включены Releases

### Auto-updater не работает
- Проверьте что версия в `package.json` совпадает с тегом релиза
- Убедитесь что `electron-updater` конфигурация правильная

## Пример процесса выпуска версии

```bash
# 1. Разработка на dev
git checkout dev
git checkout -b feature/citrix-fix
# ... работа ...
git add .
git commit -m "fix: исправить Citrix подключение"
git push origin feature/citrix-fix

# 2. Merge в dev (через PR или напрямую)
git checkout dev
git merge feature/citrix-fix
git push origin dev
# ✅ Автоматически создается Dev Build

# 3. Когда готово к релизу
git checkout main
git merge dev
git push origin main
# ✅ Автоматически создается Stable Release

# 4. Пользователи обновляют через auto-updater
```

## Документация GitHub Actions

- Workflow файл: `.github/workflows/build-and-release.yml`
- Учетная запись: https://github.com/DlnKot/Agregator
- Releases: https://github.com/DlnKot/Agregator/releases
- Actions tab: https://github.com/DlnKot/Agregator/actions
