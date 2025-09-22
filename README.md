# Random Quote API

A quote API I built with Fastify and TypeScript. It fetches quotes from different sources and has some cool features like learning what quotes you like and showing popular ones to new users.

## What it does

- Gets random quotes from quotable.io and dummyjson APIs
- Has both REST and GraphQL endpoints (because why not)
- Learns what quotes you like and shows you similar ones
- New users get popular quotes more often (seems to work better)
- SQLite database to store likes and preferences
- Swagger docs and GraphQL playground included
- Actually handles errors properly (unlike my first attempts)
- TypeScript because I got tired of runtime errors

## Tech stuff

- Node.js + TypeScript 
- Fastify (faster than Express apparently)
- SQLite for storing likes
- Mercurius for GraphQL
- Zod for validation
- Jest for tests
- Axios for API calls

## Getting started

You'll need Node.js 18 or higher.

```bash
# Clone and install
git clone <repo-url>
cd randomQuoteGen
npm install

# Copy the env file and edit if needed
cp env.example .env

# Run it
npm run dev
```

The API will be running on http://localhost:3000

## Available commands

```bash
npm run dev      # development with hot reload
npm run build    # build for production  
npm start        # run production build
npm test         # run tests
npm run lint     # check code style
```

## API docs

- Swagger UI: http://localhost:3000/docs
- GraphQL playground: http://localhost:3000/graphql
- Health check: http://localhost:3000/health

## API endpoints

### REST

**Get random quote:**
```
GET /api/quotes/random
GET /api/quotes/random?smart=true
```

Add `x-user-id` header for personalized quotes.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "quote-id",
    "content": "The quote content", 
    "author": "Author Name",
    "tags": ["inspirational"],
    "likes": 5,
    "isLiked": false
  }
}
```

**Other endpoints:**
```
POST /api/quotes/{quoteId}/like     # like a quote
DELETE /api/quotes/{quoteId}/like   # unlike it
GET /api/quotes/similar/{quoteId}   # find similar quotes
GET /api/quotes/popular             # most liked quotes
```

### GraphQL

```graphql
# Get a quote
query {
  randomQuote(smart: true) {
    content
    author
    likes
  }
}

# Like a quote
mutation {
  likeQuote(quoteId: "some-id") {
    likes
    isLiked
  }
}
```

## How the smart stuff works

The API tries to be clever about which quotes to show:

- New users see popular quotes 70% of the time (they seem to like that better)
- If you like quotes, it learns your preferences from the tags
- Similar quotes are found by matching tags
- Falls back to different APIs if one is down

## Database

Uses SQLite with two simple tables:
- `likes` - tracks who liked what quote
- `user_preferences` - stores user's preferred tags as JSON

## Tests

Has tests for the main service, REST routes, and GraphQL resolvers. Run with `npm test`.

## Deployment

Set these environment variables:
```
PORT=3000
NODE_ENV=production
DATABASE_PATH=./data/quotes.db
QUOTABLE_API_URL=https://api.quotable.io
DUMMYJSON_API_URL=https://dummyjson.com
```

## Things I might add later

- Redis caching (SQLite is probably fine for now)
- Rate limiting
- Proper authentication instead of just user IDs in headers
- Better logging
- Database migrations

## Examples

```bash
# Get a quote
curl http://localhost:3000/api/quotes/random

# Get smart quote for user
curl -H "x-user-id: user123" http://localhost:3000/api/quotes/random?smart=true

# Like a quote  
curl -X POST http://localhost:3000/api/quotes/some-id/like -H "x-user-id: user123"
```

## License

MIT

## Thanks

- quotable.io for the good quotes
- dummyjson.com for backup quotes  
- Fastify team for making a fast framework
