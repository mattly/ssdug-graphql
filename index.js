import express from 'express'
import expressGraphql from 'express-graphql'
import graphql from 'graphql'
import queryComplexity from 'graphql-query-complexity'
import fs from 'fs'


import data from './src/data.js'

import resolverPkg from './src/resolvers.js'

const { loaders, ...resolvers } = resolverPkg

const schema = graphql.buildSchema(fs.readFileSync('./schema.graphql', { encoding: 'utf8' }))

const app = express()

app.use((request, response, next) => {
  request.data = data
  request.loaders = loaders(request)
  request.lookups = {}
  request.lookup = tableName => {
    if (request.lookups[tableName]) { request.lookups[tableName]++ }
    else { request.lookups[tableName] = 1 }
  }
  response.on('finish', () => console.log(request.lookups))
  next()
})

// app.use('/graphql', expressGraphql.graphqlHTTP({
//   schema,
//   rootValue: resolvers,
//   graphiql: true,

// }))

app.use('/graphql', expressGraphql.graphqlHTTP(async (request, response, { variables }) => ({
  schema,
  rootValue: resolvers,
  graphiql: true,
  validationRules: [
    queryComplexity.default({
      estimators: [queryComplexity.simpleEstimator({ defaultComplexity: 1 })],
      maximumComplexity: 100,
      variables,
      onComplete: (score) => console.log(`complexity: ${score}`)
    })
  ]
})))

const port = 3000
app.listen(port)
console.log(`App running on ${port}`)
