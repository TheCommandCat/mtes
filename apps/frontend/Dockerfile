# ---- Base ----
# Use a specific Node version consistent with your project if possible, otherwise LTS-Alpine is a good default.
FROM docker.io/node:lts-alpine AS base
WORKDIR /app
# Create a non-root user and group
RUN addgroup --system frontend &&     adduser --system -G frontend frontend

# ---- Dependencies ----
# This stage is for installing dependencies, including devDependencies needed for the build.
FROM base AS deps
# Copy package.json and lock file
COPY package.json package-lock.json* ./
# Copy Nx workspace configuration files
COPY nx.json ./
COPY tsconfig.base.json ./
# Copy any other root configuration files that might be needed for the build (e.g., .babelrc, postcss.config.js if they exist and are used)
# COPY .babelrc .babelrc # Example
# COPY postcss.config.js postcss.config.js # Example

# Install all dependencies. Using 'npm ci' is generally recommended for CI/build environments.
RUN npm ci

# ---- Build ----
# This stage builds the Next.js application using the installed dependencies.
FROM deps AS build
# Copy the entire monorepo source code.
# Alternatively, be more selective to improve caching if only certain parts change.
# For instance, copy libs first, then apps/frontend.
COPY . .
# Build the frontend application using Nx.
# The --skip-nx-cache flag ensures it runs the build regardless of local Nx cache.
RUN npx nx build frontend --skip-nx-cache

# ---- Runner ----
# This stage prepares the final image with only the built app and production dependencies.
FROM base AS runner
ENV NODE_ENV=production
# Next.js default port is 3000. This can be overridden by the PORT env var.
ENV PORT=3000

WORKDIR /app

# Copy built output from the 'build' stage.
# `nx build frontend` should place the output in `dist/apps/frontend`.
# This output should include .next, public, package.json (with 'next' as a dependency).
COPY --from=build /app/dist/apps/frontend ./

# Install production dependencies based on the package.json copied from dist/apps/frontend.
# This ensures 'next' and other runtime dependencies are available.
RUN npm install --omit=dev

# Set the user for running the application.
USER frontend

# Expose the port Next.js will run on.
EXPOSE ${PORT}

# Command to start the Next.js application.
# `next start` will use the PORT environment variable.
CMD ["npx", "next", "start"]
