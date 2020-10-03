import R from 'ramda'

const connection = (table, { preds, page, makeCursor, prepare }) => {
  let matchingResults = R.sortBy(makeCursor, table)
  if (preds) {
    matchingResults = R.filter(R.allPass(preds), matchingResults)
  }
  let hasNextPage = false
  let hasPreviousPage = false
  let thisPage = matchingResults
  if (page) {
    const matchLen = matchingResults.length
    if (page.after) {
      thisPage = R.dropWhile(item => makeCursor(item) <= page.after, thisPage)
      if (thisPage.length < matchLen) { hasPreviousPage = true }
    }
    if (page.before) {
      thisPage = R.dropLastWhile(item => makeCursor(item) >= page.before, thisPage)
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
  const edges = thisPage
     .map(prepare)
     .map(item => ({ cursor: makeCursor(item), node: item }))
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

const pageArgs = (args, fallbacks) => {
  const { first, after, last, before } = args
  if (first && last) {
    throw new Error("cannot specify `first` and `last` page arguments")
  }
  const out = { first, after, last, before }
  if (true) {
    out.sort = fallbacks.sort
  }
  return out
}

// yeah I'm basic
const padNum = (len, num) =>
  R.takeLast(len, R.concat(R.times(R.always('0'), len), `${num}`.split(''))).join('')

const NumFilter = (filter, prop) => {
  const preds = []
  const getProp = R.pipe(R.prop(prop), n => parseInt(n))
  if (!filter) { return preds }
  if (filter.lt) { preds.push(R.pipe(getProp, R.lt(R.__, filter.lt))) }
  if (filter.gt) { preds.push(R.pipe(getProp, R.gt(R.__, filter.gt))) }
  return preds
}

export default {
  connection,
  pageArgs,
  padNum,
  NumFilter,
}
