###########################################
# STAGE 1: Base Image Setup
###########################################
FROM docker.io/node:lts-alpine AS base
WORKDIR /app
RUN addgroup --system backend && adduser --system -G backend backend

###########################################
# STAGE 2: Dependencies Installation
###########################################
FROM base AS deps
# Project configuration files
COPY package.json package-lock.json* ./
COPY nx.json ./
COPY tsconfig.base.json ./
RUN npm ci

###########################################
# STAGE 3: Build Application
###########################################
FROM deps AS build
# Source files and libraries
COPY apps/backend apps/backend
COPY libs libs
COPY package.json package-lock.json* nx.json tsconfig.base.json ./
RUN npx nx build backend --skip-nx-cache

###########################################
# STAGE 4: Production Runtime
###########################################
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0
WORKDIR /app

# Production files and dependencies
COPY --from=build /app/dist/apps/backend ./
RUN npm install --omit=dev

USER backend
EXPOSE ${PORT}
CMD ["node", "main.js"]
