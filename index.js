import express from 'express'
import expressGraphql from 'express-graphql'
import graphql from 'graphql'
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

app.use('/graphql', expressGraphql.graphqlHTTP({
  schema,
  rootValue: resolvers,
  graphiql: true,
}))

const port = 3000
app.listen(port)
console.log(`App running on ${port}`)
