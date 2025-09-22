# multi-stage build because why not save some space
FROM node:18-alpine AS builder

WORKDIR /app

# install build dependencies for native modules (like better-sqlite3)
# python3 and make are needed for node-gyp to compile native addons
RUN apk add --no-cache python3 make g++

# copy package files first for better caching
COPY package*.json ./
RUN npm ci  # install all deps including devDependencies for building

# copy source and build
COPY . .
RUN npm run build

# runtime image
FROM node:18-alpine AS runtime

WORKDIR /app

# install build deps for production dependencies (better-sqlite3 needs them)
RUN apk add --no-cache python3 make g++

# create app user (security best practice or whatever)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# install only production dependencies in runtime stage
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# now remove build dependencies to keep image small
RUN apk del python3 make g++

# copy built app from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# create data directory for sqlite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

# health check so we know if it's working
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]
