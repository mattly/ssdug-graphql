import R from 'ramda'
import query from './query.js'

const userById = ({ id }, ctx) => {
  return ctx.data.users.find(user => user.id == id)
}

const sortAxis = (cursorVal, desc) => ({ cursorVal, desc })

const sorts = {
  'created': sortAxis(R.prop('creationDate')),
  'displayName': sortAxis(R.prop('displayName')),
  'lastAccessed': sortAxis(R.prop('lastAccessDate'), true),
  'reputation': sortAxis(user => parseInt(user.reputation)),
}

const prepareUser = (ctx) => ({ creationDate, lastAccessDate, ...row }) => {
  let user = {
    ...row,
    created: creationDate,
    lastAccessed: lastAccessDate,
    badges: ctx.data.badges.filter(({ userId }) => userId == row.id)
  }

  return user
}

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
    ...sorts[page.sort],
    prepare: prepareUser(ctx),
  })
}

export default { userById, userSearch }
