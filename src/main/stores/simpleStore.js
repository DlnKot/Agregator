/**
 * Simple JSON-based store for persistent data
 */
const fs = require('fs');
const path = require('path');

class SimpleStore {
 constructor(filePath, defaults = {}) {
 this.filePath = filePath;
 this.defaults = defaults;
 this.data = this._load();
 }

 _load() {
 try {
 if (fs.existsSync(this.filePath)) {
 const content = fs.readFileSync(this.filePath, 'utf8');
 return { ...this.defaults, ...JSON.parse(content) };
 }
 } catch (error) {
 console.error('Error loading store:', error);
 }
 return { ...this.defaults };
 }

 _save() {
 try {
 const dir = path.dirname(this.filePath);
 if (!fs.existsSync(dir)) {
 fs.mkdirSync(dir, { recursive: true });
 }
 fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
 } catch (error) {
 console.error('Error saving store:', error);
 }
 }

 get(key, defaultValue) {
 const value = this.data[key];
 return value !== undefined ? value : defaultValue;
 }

 set(key, value) {
 this.data[key] = value;
 this._save();
 }
}

module.exports = SimpleStore;
