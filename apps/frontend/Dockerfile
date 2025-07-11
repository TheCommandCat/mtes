# ─── deps: install all (including dev) ───────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ─── builder: build & prune prod deps ───────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nx build frontend --prod \
    && npm prune --production

# ─── runner: prod image with Puppeteer ──────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4200 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# create non-root user + install Chromium
RUN addgroup -S nextjs \
    && adduser  -S -G nextjs nextjs \
    && apk add --no-cache \
    chromium nss freetype harfbuzz ca-certificates \
    ttf-freefont

# copy built app + prod deps with correct ownership
COPY --from=builder --chown=nextjs:nextjs /app/dist/apps/frontend/. ./
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules

EXPOSE 4200
USER nextjs
CMD ["npx","next","start"]