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

  }
 }

 get(key, defaultValue) {

  const value = this.data[key]

  return value !== undefined
   ? value
   : defaultValue

 }

 set(key, value) {

  this.data[key] = value

  this._save()

 }

}

module.exports = SimpleStore