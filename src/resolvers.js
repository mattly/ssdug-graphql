import DataLoader from 'dataloader'
import R from 'ramda'
import gqlQueryPaths from 'graphql-query-path'
import query from './query.js'

const appendCursor = (cursors, name, getter, desc) => {
  const readerFn = (ctx) => (row) => row[name] || getter(row, ctx)
  cursors[name] = (ctx) => ( { val: readerFn(ctx), desc } )
}

const questionCursors = {}
appendCursor(questionCursors, 'RECENT', R.prop('creationDate'), true)
appendCursor(questionCursors, 'SCORE', row => parseInt(row.score), true)
appendCursor(questionCursors, 'VIEWS', row => parseInt(row.views), true)

const prepareAnswer = (ctx) => ({ creationDate, ...post }) => {
  const a = {
    ...post,
    created: creationDate,
    __typename: 'Answer',
    author: () => ctx.loaders.userById.load(post.ownerUserId),
    parent: () => ctx.data.posts.find(p => p.id == post.parentId),
    isAcceptedAnswer: () => {
      const parent = ctx.data.posts.find(p => p.id == post.parentId)
      return parent && parent.acceptedAnswerId == post.id
    }
  }
  return a
}

const postConnectionStats = (selections) => (rows) => {
    const ret = {}
    if (selections.selects('totalScore')) {
      ret.totalScore = R.sum(rows.map(r => parseInt(r.score)))
    }
    return ret
  }

const answerSearch = (args, ctx, info) => {
  ctx.lookup('answerSearch')
  const page = query.pageArgs(args, { sort: 'SCORE' })
  const filter = args.filter || {}
  const preds = R.flatten([
    row => row.postTypeId == '2',
    query.FKeyFilter(filter.parentIs, R.prop('parentId')),
    query.FKeyFilter(filter.authorIs, R.prop('ownerUserId')),
  ])

  const selections = new Selections(getPath(info), gqlQueryPaths.getPaths(info))

  return query.connection(ctx.data.posts, {
    page, preds,
    cursor: questionCursors[page.sort](ctx),
    prepare: prepareAnswer(ctx),
    withAll: postConnectionStats(selections),
  })
}

const prepareQuestion = ( ctx, selections ) => ({ creationDate, ...post }) => {
  const q = {
    ...post,
    created: creationDate,
    __typename: 'Question',
  }
  let user
  // - method one: eagerly, directly
  user = userById({ id: post.ownerUserId }, ctx)
  // - method two: eagerly, dataloader
  // user = ctx.loaders.userById.load(post.ownerUserId)
  // - method three: lazily, dataloader
  // user = () => ctx.loaders.userById.load(post.ownerUserId)
  // - method four: checking the query selections
  // user = selections.selects('author/') && ctx.loaders.userById.load(post.ownerUserId)
  q.author = user

  if (post.acceptedAnswerId && selections.selects('acceptedAnswer/')) {
    q.acceptedAnswer = prepareAnswer(ctx)(ctx.data.posts.find(({id}) => id == post.acceptedAnswerId))
  }

  if (selections.selects('unacceptedAnswers/')) {
    q.unacceptedAnswers = (args, innerCtx, info) => {
      args.filter = { parentIs: post.id }
      return answerSearch(args, innerCtx, info)
    }
  }

  return q
}

const getPath = info => {
  const frags = []
  let path = info.path
  frags.unshift(path.key)
  while (path.prev) {
    path = path.prev
    if (typeof path.key == 'string') {
      frags.unshift(path.key)
    }
  }
  return `/${frags.join('/')}`
}

class Selections {
  constructor(point, paths) {
    this.paths = paths
      .filter(p => R.startsWith(point, p))
      .map(p => p.substr(point.length + 1))
  }
  selects(path) {
    return R.includes(path, this.paths)
  }
  into(...paths) {
    return new Selections(paths.join('/'), this.paths)
  }
}

const questionSearch = (args, ctx, info) => {
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

  const selections = new Selections(getPath(info), gqlQueryPaths.getPaths(info))

  return query.connection(ctx.data.posts, {
    page,
    preds,
    cursor: questionCursors[page.sort](ctx),
    prepare: prepareQuestion(ctx, selections.into('edges', 'node')),
    withAll: postConnectionStats(selections)
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
    questions: ({ filter = {}, ...args }, innerCtx, info) =>
      questionSearch({ ...args, filter: {...filter, authorIs: user.id } }, innerCtx, info),
    answers: (args, innerCtx, info) => {
      args.filter = { authorIs: user.id }
      return answerSearch(args, innerCtx, info)
    }
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

const addBadge = ({ userId, badgeName }, ctx) => {
  const user = ctx.data.users.find(({ id }) => userId == id)
  if (! user) { throw new Error(`can't find user ${id}`)}
  ctx.data.badges.push({
    id: ctx.data.badges.length, // definitely don't do this in prod
    userId,
    name: badgeName,
    date: new Date().toISOString(),
  })
  return ctx.loaders.userById.load(userId)
}

const loaders = (ctx) => ({
  userById: new DataLoader(keys => batchUsersById(keys, ctx)),
})

export default {
  questionSearch,
  userById, userSearch,
  addBadge,
  loaders
}
