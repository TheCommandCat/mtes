# ---- Base ----
FROM docker.io/node:lts-alpine AS base
WORKDIR /app
RUN addgroup --system backend &&     adduser --system -G backend backend

# ---- Dependencies ----
# This stage installs all dependencies (including devDependencies) needed for the build.
FROM base AS deps
# Copy essential workspace files
COPY package.json package-lock.json* ./
COPY nx.json ./
COPY tsconfig.base.json ./
# Install all dependencies from the monorepo root
RUN npm ci

# ---- Build ----
# This stage builds the backend application.
FROM deps AS build
# Copy source code: backend app, libs, and any other necessary root configs
COPY apps/backend apps/backend
COPY libs libs
# If there are other specific root config files (e.g., .env used by build), copy them too.
# COPY .env .env

# Build the backend application using Nx
RUN npx nx build backend --skip-nx-cache

# ---- Runner ----
# This stage prepares the final image with only the built app and production dependencies.
FROM base AS runner
ENV NODE_ENV=production
# The backend's port is set by this ENV var, matching what's in the original Dockerfile
ENV PORT=3000
ENV HOST=0.0.0.0

WORKDIR /app

# Copy the built output from the 'build' stage's /app/dist/apps/backend directory
COPY --from=build /app/dist/apps/backend ./

# Install production dependencies based on the package.json within dist/apps/backend
# This assumes `nx build backend` creates a package.json in its output directory.
RUN npm install --omit=dev

USER backend

# Expose the port the backend will run on (defined by ENV PORT)
EXPOSE ${PORT}

# Command to start the backend application.
# Assumes main.js is the entry point in the WORKDIR (/app, which now contains the contents of dist/apps/backend).
CMD ["node", "main.js"]
