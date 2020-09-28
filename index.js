import express from 'express'
import expressGraphql from 'express-graphql'
import graphql from 'graphql'
import fs from 'fs'

import data from './src/data.js'

import customers from './src/customers.js'

const schema = graphql.buildSchema(fs.readFileSync('./schema.graphql', { encoding: 'utf8' }))

const handlers = {
  ...customers,
}

const app = express()

app.use((request, response, next) => {
  request.data = data
  next()
})

app.use('/graphql', expressGraphql.graphqlHTTP({
  schema,
  rootValue: handlers,
  graphiql: true,
}))

const port = 3000
app.listen(port)
console.log(`App running on ${port}`)
