export const typeDefs = `
  type Quote {
    id: ID!
    content: String!
    author: String!
    tags: [String!]
    length: Int
    likes: Int
    isLiked: Boolean
    similarQuotes: [Quote!]
  }

  type LikeResult {
    quoteId: ID!
    likes: Int!
    isLiked: Boolean!
  }

  type PopularQuote {
    quoteId: ID!
    likes: Int!
  }

  type Query {
    randomQuote(smart: Boolean = false): Quote!
    similarQuotes(quoteId: ID!, limit: Int = 5): [Quote!]!
    popularQuotes(limit: Int = 10): [PopularQuote!]!
  }

  type Mutation {
    likeQuote(quoteId: ID!): LikeResult!
    unlikeQuote(quoteId: ID!): LikeResult!
  }

  schema {
    query: Query
    mutation: Mutation
  }
`;
