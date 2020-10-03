# What & Why

GraphQL is an API Query language for typed data which has graph-like relationships.

- a clarification: The "Graph" in GraphQL is much more in line with the notions of tables in relational databases than it is a
  store where any node can have a relationship with any other node. Data in GraphQL is typed, and the relationships between types are
  defined in a schema.

It allows clients to ask for the data they need, both

-   making it easier to evolve APIs over time
-   and reducing the request-load of network-edge clients (such as mobile) to gather the data necessary for a view

GraphQL is declarative and crosses references
-   queries specify what they want, not how to get it

        query($login: String!) { user(login: $login) {
            login
          	avatarUrl
          	websiteUrl
            issues(first: 5 states:[OPEN]) {
                totalCount pageInfo { hasNextPage endCursor }
                nodes { title viewerDidAuthor
                        author { login avatarUrl }
                        repository { name url } } }
          	starredRepositories(first: 5, orderBy: { field:STARRED_AT direction:DESC }) {
              	totalCount pageInfo { hasNextPage endCursor }
            	nodes { name url description stargazerCount
                        owner { login avatarUrl }
                        labels(first: 10) { nodes { name color }}
                        watchers(first: 0) { totalCount } }
            }
          	following(first: 5) {
              	totalCount pageInfo { hasNextPage endCursor }
            	nodes { ...on User {
                    login avatarUrl url
                    repositories(first: 3, orderBy: {field: STARGAZERS, direction: DESC}) {
                        totalCount pageInfo { hasNextPage endCursor }
                        nodes {name url description stargazerCount } } } } } }}

- instead of possibly several REST-style requests, which may include extraneous data:

        GET /users/:login
        GET /users/:login/issues?first=5&states=OPEN                            # hopefully includes page info?
        issues.forEach
            GET /issues/:id/author
            GET /issues/:id/respository
        GET /users/:login/starred-repositories?first=5&order=STARRED_AT,DESC    # hopefully includes page info?
        stars.forEach
            GET /repositories/:id/owner
            GET /repositories/:id/labels?first=10
            GET /repositories/:id/stargazers?first=0                            # just want the count?
            GET /repositories/:id/watchers?first=0                              # just want the count?
        GET /users/:login/following?first=5                                     # hopefully includes page info?
        following.forEach
            GET /:followingType/:id/repositories?first=3,order=STARGAZERS,DESC  # hopefully includes page info?
            repositories.forEach
                GET /repositories/:id/stargazers?first=0                        # basically just want the count

- this also allows for the easy introduction of new fields without impacting existing queries, and deprecation of existing fields with warnings to developers, allows for APIs to evolve gradually instead of with hard-lined versions

GraphQL is introspective

- heavy emphasis on published schmeas with documentation
- allows for easy client/server-side validation of queries
- allows for great developer tooling

## What: Querying with Types, Arguments, Interfaces, and Fragments

### the basics
- objects (types)
- scalars (boolean, float, int, string, id, custom)
- enums
- lists and optionals

### flexibility
- interfaces
- fragments
- unions
- input
- variables
- operations

## What: Mutations
## What: Extensions

# How: On the Client
## Basic HTTP mechanics
## It's just data
## Make queries dynamic with variables instead of interpolation
## You probably don't need a client library, but if you do

# How: On the Server
## Resolving 101
## AuthN/AuthZ in Resolvers
## Resolving 201: Just-In-Time Functions
## Resolving 202: Dataloader
## Resolving 301: Query Selections

# How: Tips from the Trenches
## Schema Patterns
### Think about your data
- Use Optionals!
## Client Patterns
## Serving Patterns
### Resolving
### Complexity Ranking
