/**
 * UUID Generator - генерация UUID v4 без внешних зависимостей
 */
const crypto = require('crypto');

/**
 * Генерация UUID v4
 * @returns {string} UUID v4
 */
function uuidv4() {
  return crypto.randomUUID();
}

/**
 * Проверка валидности UUID
 * @param {string} uuid - UUID для проверки
 * @returns {boolean}
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

module.exports = {
  uuidv4,
  isValidUUID
};
