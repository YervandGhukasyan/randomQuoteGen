# multi-stage build because why not save some space
FROM node:18-alpine AS builder

WORKDIR /app

# copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# copy source and build
COPY . .
RUN npm run build

# runtime image
FROM node:18-alpine AS runtime

WORKDIR /app

# create app user (security best practice or whatever)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# copy built app and node_modules
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# create data directory for sqlite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

# health check so we know if it's working
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]
