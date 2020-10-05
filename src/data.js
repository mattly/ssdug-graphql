import fs from 'fs'
import path from 'path'
import xml from 'xml-js'

const files = fs.readdirSync('./data').filter(f => path.extname(f) === '.xml')

const tables = {}

files.forEach(file => {
  const table = path.basename(file, '.xml').toLowerCase()
  const text = fs.readFileSync(`./data/${file}`, { encoding: 'utf-8' })
  const thisData = xml.xml2js(text, { compact: true, spaces: 2 })
  tables[table] = thisData[table].row.map(row => {
    const out = {}
    Object.keys(row._attributes).forEach(k => {
      out[k.replace(/^\w/, s => s.toLowerCase())] = row._attributes[k]
    })
    return out
  })
  if (['tags', 'users', 'badges'].indexOf(table) == -1) {
    console.log(`${table}: ${thisData[table].row.length}`)
    const attrs = {}
    tables[table].forEach(row => {
      Object.keys(row).forEach(k => {
        if (attrs[k]) { attrs[k]++ }
        else { attrs[k] = 1 }
      })
    })
    console.log(attrs)
  }
})

export default tables
