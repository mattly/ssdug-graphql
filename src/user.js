import R from 'ramda'
import query from './query.js'

const userById = ({ id }, ctx) => {
  return ctx.data.users.find(user => user.id == id)
}

const cursors = {
  'CREATED': R.prop('creationDate'),
  'DISPLAY_NAME': R.prop('displayName'),
  'RECENTLY_ACCESSED': R.descend(R.prop('lastAccessDate')),
  'REPUTATION': user => parseInt(user.reputation)
}

const prepare = ({ creationDate, lastAccessDate, ...user }) => ({
  ...user,
  created: creationDate,
  lastAccessed: lastAccessDate,
})

const userSearch = (args, ctx) => {
  const page = query.pageArgs(args, { sort: 'CREATED' })
  const filter = args.filter || {}
  const preds = R.flatten([
    query.NumFilter(filter.reputation, R.prop('reputation')),
    query.StringFilter(filter.displayName, R.prop('displayName')),
    query.StringFilter(filter.websiteUrl, R.prop('websiteUrl'))
  ])

  return query.connection(ctx.data.users, {
    page,
    preds,
    cursorVal: cursors[page.sort],
    prepare,
  })
}

export default { userById, userSearch }
