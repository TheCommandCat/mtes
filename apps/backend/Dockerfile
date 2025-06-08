# Dockerfile

# 1. Base stage: Install all dependencies for building
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Builder stage: Build the Express application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the 'backend' app
RUN npx nx build backend --prod

# 3. Runner stage: Create the final production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Change ownership of the app directory BEFORE switching user
RUN chown nodejs:nodejs /app

# Switch to the non-root user
USER nodejs

# Copy package definitions and install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy the built 'backend' app from the builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/backend/. .

EXPOSE 3333
ENV PORT 3333

# Start the Express server (Nx typically outputs a main.js file)
CMD ["node", "main.js"]