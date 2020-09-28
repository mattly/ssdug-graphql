import fs from 'fs'
import path from 'path'
import parseCSV from 'csv-parse/lib/sync.js'
import R from 'ramda'

const input = fs.readdirSync(`./src/data`)
  .filter(file => path.extname(file) === '.csv')
  .map(file => {
    return [
      path.basename(file, '.csv'),
      parseCSV(fs.readFileSync(`./src/data/${file}`, 'utf8'), { columns: true })
    ]
  })

const tables = {}

input.forEach(([table, data]) => {
  console.log(table, data.length, Object.keys(data[0]))
  tables[table] = data
})

const keys = Object.keys(tables.customers[0])
const acc = Object.fromEntries(keys.map(k => [k, 0]))
tables.customers.forEach(row => {
  keys.forEach(key => {
    if (row[key].length == 0) {
      acc[key]++
    }
  })
})
console.log(acc)

const query = (tablename, { pred, sortKey, desc, limit, pk }) => {
  const table = tables[tablename]
  if (!table) {
    console.log(Object.keys(table), tablename)
    throw new Error(`table '${tablename}' does not exist!`)
  }
  console.log(`querying ${tablename}: ${pred}, ${sortKey}:${desc}, ${limit}`)
  let results = table
  results = sortKey ? R.sortBy(row => `${row[sortKey]}--${row[pk]}`, results) : results
  results = desc ? R.reverse(results) : results
  results = pred ? R.filter(pred, results) : results
  const pageResults = limit ? R.take(limit, results) : results
  return {
    rows: pageResults,
    totalCount: results.length,
  }
}

export default {
  query,
}
