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

echo "⏳ Waiting for container to start..."

# wait for the app to be ready
for i in {1..15}; do
  if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ Container is ready!"
    break
  fi
  if [ $i -eq 15 ]; then
    echo "❌ Container failed to start. Check logs:"
    docker logs quote-api-local
    exit 1
  fi
  echo "   Still starting... ($i/15)"
  sleep 2
done

echo "🌐 API available at: http://localhost:3000"
echo "📚 Docs at: http://localhost:3000/docs"
echo "🔍 GraphQL at: http://localhost:3000/graphql"

echo ""
echo "🛠️  Useful commands:"
echo "  View logs:    docker logs -f quote-api-local"
echo "  Stop:         docker stop quote-api-local"
echo "  Remove:       docker rm quote-api-local"
