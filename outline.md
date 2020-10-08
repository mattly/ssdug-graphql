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

## What: Validation
- type system allows for the server to provide a lot of error-handling for free:
  - fields must exist
  - selecting an object must include at least one field on it
  - cannot select fields on an enum/scalar
  - argument validation
- fragments cannot refer to themselves or create a cycle
- servers enforce type system, optionality

## What: Introspection & Documentation

## What: Pagination Pattern & Connection Model (optional)
- Why: https://graphql.org/learn/pagination/
- What: https://relay.dev/graphql/connections.htm

## What: Global Object ID (optional)
- "Node" Interface with `id: ID!` field
- `node(id: ID!)` root field returning Node interface
- having IDs be globally unique helps clients build caches

## What: Customizations
- directives
- extensions

# How: On the Client
## Basic HTTP mechanics
my blog post: https://lyonheart.us/articles/consuming-graphql-simply/

## It's just data
- figure out how to map an api's schema to your language's type/data system
- "success" is often granular, it's not all or nothing

## Make queries dynamic with variables instead of interpolation
- seriously, this will save you so many headaches. don't try to get clever,
  have a plain-text query you can copy/paste into graphiQL & play with variables

## You probably don't need a client library, but if you do
- relay, the OG heavyweight: https://relay.dev
- apollo for javascript: https://www.apollographql.com

# How: On the Server
## Use a library!
don't write it yourself if you don't have to, the spec is *huge*. There are plenty of great implementations already: https://graphql.org/code/

I will personally vouch for lacinia for clojure and gql-gen for Go

## Resolving 101: Immediate Eager Resolution
Just send everything in the tree back, let your library handle all the fiddly details of paring it down

## AuthN/AuthZ
find in context, define authz logic in business layer

## Resolving 201: type-level resolvers
- kinda like a function on a class method, this will vary with your language & library
- also needed for fields that take argumetns

## Resolving 202: Avoiding n+1 with Dataloader
batching & caching pattern to separate the mechanics of loading resources from where they actually are. A loader is constructed on a per-context/request basis, caches are often in-memory and for the lifecycle of the context/request

- javascript reference implementation: https://github.com/graphql/dataloader
- implementatins in other languages, the readme's list is incomplete
- ultimately a very simple pattern
- good writeup: https://medium.com/@__xuorig__/the-graphql-dataloader-pattern-visualized-3064a00f319f

## Resolving 301: Query Selections
Because the client has told us what they want, we can use that information at query-time to decide how to best-optimize the work needed to produce that result

## On Guard: Complexity Ranking
- validation already prevents recursive fragments, or unlimited-depth queries,
- still, complexity-ranking is a common tool for preventing a client from asking you to do too much work in one go. think of it like rate-limiting, but around work performed, not rate of asking

# Tips from the Trenches
## Schema Patterns
- Think about your data
- Document, document, document
- Use Optionals!
  any field that involves something which could go wrong should be nullable
- decide on naming scheme, patterns
  that is, {something}Connection vs {something}s, {something}Count, and so on
- avoid versioning
