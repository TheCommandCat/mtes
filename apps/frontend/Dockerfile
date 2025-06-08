# Dockerfile

# 1. Base stage: Install all dependencies for building
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Builder stage: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nx build frontend --prod

# 3. Runner stage: Create the final production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# --- THE FIX ---
# Change ownership of the app directory BEFORE switching user
# This is fast because the directory is empty.
RUN chown nextjs:nodejs /app

# Switch to the non-root user
USER nextjs

# Copy package definitions (owner is already 'nextjs' due to USER)
COPY package.json package-lock.json* ./

# Now this command will succeed because 'nextjs' owns '/app'
RUN npm ci --omit=dev

# Copy the built app from the builder stage
COPY --from=builder /app/dist/apps/frontend/. .

EXPOSE 4200
ENV PORT 4200

# Start the Next.js server
CMD ["npx", "next", "start"]