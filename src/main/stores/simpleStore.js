const fs = require('fs');
const path = require('path');

class SimpleStore {

  constructor(filePath, defaults = {}) {

    this.filePath = filePath;
    this.defaults = defaults;
    this.data = this._load();

    // Debounce для предотвращения race condition при быстрых последовательных записях
    this._saveTimeout = null;
    this._savePending = false;
    this._isSaving = false;  // Флаг текущей операции сохранения

  }

  _load() {

    try {

      if (!fs.existsSync(this.filePath))
        return { ...this.defaults }

      const content = fs.readFileSync(this.filePath, 'utf8')

      try {

        const parsed = JSON.parse(content)

        return { ...this.defaults, ...parsed }

      } catch {

        console.error('Store corrupted, restoring backup')

        fs.renameSync(
          this.filePath,
          this.filePath + '.broken'
        )

        return { ...this.defaults }

      }

    } catch (error) {

      console.error('Error loading store:', error)

      return { ...this.defaults }

    }
  }

  _save() {

    try {

      const dir = path.dirname(this.filePath)

      if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true })

      const tmp = this.filePath + '.tmp'

      const data = JSON.stringify(this.data, null, 2)

      fs.writeFileSync(tmp, data, 'utf8')

      fs.renameSync(tmp, this.filePath)

    } catch (error) {

      console.error('Error saving store:', error)

    } finally {

      this._isSaving = false;

      // Если были изменения во время сохранения, запустить еще одно
      if (this._savePending) {
        this._savePending = false;
        this._scheduleSave();
      }

    }
  }

  _scheduleSave() {
    // Отменяем предыдущий таймаут
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = null;
    }

    // Если сейчас идет сохранение, просто отметить что нужно еще одно
    if (this._isSaving) {
      this._savePending = true;
      return;
    }

    // Debounce запись - ждем 100ms после последнего изменения
    this._saveTimeout = setTimeout(() => {
      this._saveTimeout = null;
      this._isSaving = true;
      this._save();
    }, 100);
  }

  get(key, defaultValue) {

    const value = this.data[key]

    return value !== undefined
      ? value
      : defaultValue

  }

  set(key, value) {

    this.data[key] = value

    // Используем debounced запись для предотвращения race condition
    this._scheduleSave();

  }

  // Принудительная синхронная запись (для критических операций)
  setSync(key, value) {
    this.data[key] = value;

    // Отменяем отложенную запись и пишем сразу
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = null;
    }

    this._save();
  }

  // При закрытии приложения - обязательно дождаться записи
  flush() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = null;
      this._save();
    }
  }

}

module.exports = SimpleStore