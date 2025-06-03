###########################################
# STAGE 1: Base Image Setup
###########################################
FROM docker.io/node:lts-alpine AS base
WORKDIR /app
RUN addgroup --system frontend && adduser --system -G frontend frontend

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
COPY apps/frontend apps/frontend
COPY libs libs
COPY package.json package-lock.json* nx.json tsconfig.base.json ./
RUN npx nx build frontend --skip-nx-cache

###########################################
# STAGE 4: Production Runtime
###########################################
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4200
WORKDIR /app

# Copy the standalone Next.js application
COPY --from=build /app/dist/apps/frontend/standalone ./
COPY --from=build /app/dist/apps/frontend/static ./static

USER frontend
EXPOSE ${PORT}
CMD ["node", "server.js"]
