# 1. Base: install deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# 2. Build: compile the backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nx build backend --prod

# 3. Runner: production + Puppeteer
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3333 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# create non-root user
RUN addgroup -S nodejs && \
    adduser -S -G nodejs nodejs

# install Chromium & fonts etc.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# copy only prod deps and install
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# (optional) if you need Puppeteer’s CLI to fetch any extra bits:
# RUN npx puppeteer browsers install chrome

# copy your built app and fix permissions
COPY --from=builder --chown=nodejs:nodejs \
    /app/dist/apps/backend/. .
RUN chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3333
CMD ["node","main.js"]