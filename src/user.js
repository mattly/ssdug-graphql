import R from 'ramda'
import query from './query.js'

const userById = ({ id }, ctx) => {
  return ctx.data.users.find(user => user.id == id)
}

const cursors = {
  'ID': user => query.padNum(8, user.id)
}
const userCursor = page => user => `user:${cursors[page.sort](user)}`

const prepare = ({ creationDate, lastAccessDate, ...user }) => ({
  ...user,
  created: creationDate,
  lastAccessed: lastAccessDate,
})

const userSearch = (args, ctx) => {
  const page = query.pageArgs(args, { sort: 'ID' })
  const filter = args.filter || {}
  const preds = R.flatten([
    query.NumFilter(filter.reputation, R.prop('reputation')),
    query.StringFilter(filter.displayName, R.prop('displayName')),
    query.StringFilter(filter.websiteUrl, R.prop('websiteUrl'))
  ])

  return query.connection(ctx.data.users, {
    page,
    preds,
    makeCursor: userCursor(page),
    prepare,
  })
}

export default { userById, userSearch }
