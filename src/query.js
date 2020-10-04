import R from 'ramda'

const makeCursor = ( sort, cursorVal ) => row => `${sort}:${cursorVal(row)}:${row.id}`

const parseCursor = cursor => {
  const [col, val, id] = cursor.split(':')
  const row = { id }
  row[col] = val
  return row
}

const connection = (table, { preds, page, cursorVal, desc, prepare }) => {
  const sortDir = desc ? R.ascend : R.descend
  const sorter = R.sortWith([sortDir(cursorVal), R.ascend(R.prop('id'))])
  let matchingResults = sorter(table)
  if (preds) {
    const fns = R.filter(R.identity, preds)
    matchingResults = R.filter(R.allPass(fns), matchingResults)
  }
  let hasNextPage = false
  let hasPreviousPage = false
  let thisPage = matchingResults
  if (page) {
    const matchLen = matchingResults.length
    const cursorSort = vals => R.equals(vals, sorter(vals))
    if (page.after) {
      let afterCursor = parseCursor(page.after)
      thisPage = R.dropWhile(row => cursorSort([row, afterCursor]), thisPage)
      if (thisPage.length < matchLen) { hasPreviousPage = true }
    }
    if (page.before) {
      let beforeCursor = parseCursor(page.before)
      thisPage = R.dropLastWhile(row => cursorSort([beforeCursor, row]), thisPage)
      if (thisPage.length < matchLen) { hasNextPage = true }
    }
    const truncLength = thisPage.length

    if (page.first) {
      thisPage = R.take(page.first, thisPage)
      if (thisPage.length < truncLength) { hasNextPage = true }
    }
    if (page.last) {
      thisPage = R.takeLast(page.last, thisPage)
      if (thisPage.length < truncLength) { hasPreviousPage = true }
    }
  }
  const cursor = makeCursor(page.sort, cursorVal)
  const edges = thisPage.map(item => ({ cursor: cursor(item), node: prepare(item) }))
  const pageInfo = { hasNextPage, hasPreviousPage }
  if (thisPage.length > 0) {
    pageInfo.startCursor = edges[0].cursor
    pageInfo.endCursor = edges[edges.length-1].cursor
  }
  return {
    edges,
    pageInfo,
    totalCount: matchingResults.length
  }
}

const pageArgs = (args, defaults) => {
  const { first, after, last, before } = args
  if (first && last) {
    throw new Error("cannot specify `first` and `last` page arguments")
  }
  const out = { first, after, last, before }
  out.sort = args.sort || defaults.sort
  return out
}

const NumFilter = (filter={}, getter) => {
  const getProp = R.pipe(getter, n => parseInt(n))
  return [
    filter.lt && ( row => R.lt(getProp(row), filter.lt) ),
    filter.gt && ( row => R.gt(getProp(row), filter.gt) )
  ]
}

const isPresent = R.complement(R.anyPass([R.isNil, R.isEmpty]))

const StringFilter = (filter={}, getter) => {
  return [
    R.is(Boolean, filter.present) && (
      row => isPresent(getter(row)) == filter.present
    ),
    filter.matches && (
      expr => row => (getter(row) || "").match(expr)
    )(new RegExp(filter.matches)) // warning - don't do this to user input in production code
  ]
}

export default {
  connection,
  pageArgs,
  NumFilter,
  StringFilter,
}
