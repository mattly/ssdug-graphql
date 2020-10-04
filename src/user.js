import R from 'ramda'
import query from './query.js'

const userById = ({ id }, ctx) => {
  return ctx.data.users.find(user => user.id == id)
}

const appendCursor = (cursors, name, getter, desc) => {
  const readerFn = (ctx) => (row) => row[name] || getter(row, ctx)
  cursors[name] = (ctx) => ( { val: readerFn(ctx), desc } )
}

const userCursors = {}
appendCursor(userCursors, 'CREATED', R.prop('creationDate'))
appendCursor(userCursors, 'DISPLAY_NAME', R.prop('displayName'))
appendCursor(userCursors, 'RECENTLY_ACCESSED', R.prop('lastAccessDate'), true)
appendCursor(userCursors, 'REPUTATION', user => parseInt(user.reputation), true)
appendCursor(userCursors, 'BADGES',
  (user, ctx) => ctx.data.badges.filter(b => b.userId == user.id).length,
  true)

const prepareUser = (ctx) => ({ creationDate, lastAccessDate, ...row }) => {
  const badges = ctx.data.badges.filter(({ userId }) => userId == row.id)
  let user = {
    ...row,
    created: creationDate,
    lastAccessed: lastAccessDate,
    badges,
    badgeCount: badges.length,
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
    cursor: userCursors[page.sort](ctx),
    prepare: prepareUser(ctx),
  })
}

export default { userById, userSearch }
