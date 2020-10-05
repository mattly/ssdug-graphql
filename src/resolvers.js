import DataLoader from 'dataloader'
import R from 'ramda'
import query from './query.js'

const appendCursor = (cursors, name, getter, desc) => {
  const readerFn = (ctx) => (row) => row[name] || getter(row, ctx)
  cursors[name] = (ctx) => ( { val: readerFn(ctx), desc } )
}

const questionCursors = {}
appendCursor(questionCursors, 'RECENT', R.prop('creationDate'), true)
appendCursor(questionCursors, 'SCORE', row => parseInt(row.score), true)
appendCursor(questionCursors, 'VIEWS', row => parseInt(row.views), true)

const prepareQuestion = ctx => async ({ creationDate, ...post }) => {
  const q = {
    ...post,
    created: creationDate,
    __typename: 'Question',
  }
  // - method one: eagerly, directly
  const user = userById({ id: post.ownerUserId }, ctx)
  // - method two: eagerly, dataloader
  // const user = await ctx.loaders.userById.load(post.ownerUserId)
  // - method three: lazily, dataloader
  // const user = () => ctx.loaders.userById.load(post.ownerUserId)
  q.author = user
  return q
}

const questionSearch = (args, ctx) => {
  ctx.lookup('questionSearch')
  const page = query.pageArgs(args, { sort: 'RECENT'})
  const filter = args.filter || {}
  const preds = R.flatten([
    row => row.postTypeId == '1',
    query.NumFilter(filter.score, R.prop('score')),
    query.StringFilter(filter.title, R.prop('title')),
    query.NumFilter(filter.views, R.prop('views')),
    query.FKeyFilter(filter.authorIs, R.prop('ownerUserId')),
    query.BooleanFilter(filter.answered, R.prop('acceptedAnswerId')),
    userFilter(filter.author, ctx).filter(R.identity).map(f =>
      (q) => f(ctx.data.users.find(user => user.id == q.ownerUserId)))
  ])

  return query.connection(ctx.data.posts, {
    page,
    preds,
    cursor: questionCursors[page.sort](ctx),
    prepare: prepareQuestion(ctx),
    withAll: (rows) => ({
      totalScore: R.sum(rows.map(r => parseInt(r.score)))
    }),
  })
}

// users
const badgesByUserId = (targetUserId, ctx) => {
  ctx.lookup('badgesByUserId')
  return ctx.data.badges.filter(({ userId }) => userId == targetUserId)
}

const prepareUser = (ctx) => ({ creationDate, lastAccessDate, ...row }) => {
  const badges = badgesByUserId(row.id, ctx)
  let user = {
    ...row,
    created: creationDate,
    lastAccessed: lastAccessDate,
    badges,
    badgeCount: badges.length,
    questions: ({ filter = {}, ...args }) =>
      questionSearch({ ...args, filter: {...filter, authorIs: user.id } }, ctx),
  }
  return user
}

const getUser = (id, ctx) => {
  const user = ctx.data.users.find(user => user.id == id)
  return user && prepareUser(ctx)(user)
}

const userById = ({ id }, ctx) => {
  ctx.lookup('userById')
  return getUser(id, ctx)
}

const batchUsersById = (keys, ctx) => {
  ctx.lookup('batchUsersById')
  return Promise.resolve(keys.map(k => getUser(k, ctx)))
}

const userCursors = {}
appendCursor(userCursors, 'CREATED', R.prop('creationDate'))
appendCursor(userCursors, 'DISPLAY_NAME', R.prop('displayName'))
appendCursor(userCursors, 'RECENTLY_ACCESSED', R.prop('lastAccessDate'), true)
appendCursor(userCursors, 'REPUTATION', user => parseInt(user.reputation), true)
appendCursor(userCursors, 'BADGES',
  (user, ctx) => ctx.data.badges.filter(b => b.userId == user.id).length,
  true)
appendCursor(userCursors, 'QUESTION_COUNT',
  (user, ctx) =>
    ctx.data.posts.filter(
      p => p.postTypeId == '1' && p.ownerUserId == user.id
    ).length,
  true)
appendCursor(userCursors, 'QUESTION_SCORES',
  (user, ctx) =>
    ctx.data.posts
      .filter(p => p.postTypeId == '1' && p.ownerUserId == user.id)
      .reduce((sum, p) => sum + parseInt(p.score), 0),
  true)

const userFilter = (filter = {}, ctx) =>
  R.flatten([
    query.NumFilter(filter.reputation, R.prop('reputation')),
    query.StringFilter(filter.displayName, R.prop('displayName')),
    query.StringFilter(filter.websiteUrl, R.prop('websiteUrl')),
    query.StringIn(filter.hasBadge, (row =>
      badgesByUserId(row.id, ctx).map(R.prop('name'))))
  ])

const userSearch = (args, ctx) => {
  ctx.lookup('userSearch')
  const page = query.pageArgs(args, { sort: 'CREATED' })
  const preds = userFilter(args.filter, ctx)

  return query.connection(ctx.data.users, {
    page,
    preds,
    cursor: userCursors[page.sort](ctx),
    prepare: prepareUser(ctx),
  })
}

const loaders = (ctx) => ({
  userById: new DataLoader(keys => batchUsersById(keys, ctx)),
})

export default {
  questionSearch,
  userById, userSearch,
  loaders
}
