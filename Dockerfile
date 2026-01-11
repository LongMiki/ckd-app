# Multi-stage Dockerfile for deploying the Vite React app + Express socket server
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --progress=false

# Build frontend
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy package.json and install production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --progress=false

# Copy built assets and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server/index.cjs"]
