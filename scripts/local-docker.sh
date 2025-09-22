#!/bin/bash

# script to run the app locally with docker
# because sometimes you want to test the container

set -e

echo "🐳 Building Docker image..."
docker build -t quote-api:local .

echo "🚀 Running container..."
docker run -d \
  --name quote-api-local \
  -p 3000:3000 \
  -e NODE_ENV=development \
  -e LOG_LEVEL=debug \
  quote-api:local

echo "✅ Container started!"
echo "🌐 API available at: http://localhost:3000"
echo "📚 Docs at: http://localhost:3000/docs"
echo "🔍 GraphQL at: http://localhost:3000/graphql"

echo ""
echo "🛠️  Useful commands:"
echo "  View logs:    docker logs -f quote-api-local"
echo "  Stop:         docker stop quote-api-local"
echo "  Remove:       docker rm quote-api-local"
