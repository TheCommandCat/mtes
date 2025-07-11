# PDF Export Configuration

This document explains the PDF export functionality and how to configure it for different environments.

## Environment Configuration

### Development (Local)
- Backend uses `.env` file with `MTES_DOMAIN=http://localhost:4200`
- Frontend runs on `localhost:4200`
- Backend connects to frontend directly via localhost

### Production (Docker)
- Backend uses `.env.docker` file with `MTES_DOMAIN=http://frontend:4200`
- Frontend uses `.env.docker` file
- Services communicate via Docker internal network using service names

## Files
- `apps/backend/.env` - Development environment variables
- `apps/backend/.env.docker` - Docker/Production environment variables
- `apps/frontend/.env` - Development frontend environment variables
- `apps/frontend/.env.docker` - Docker/Production frontend environment variables

## Docker Compose
The `docker-compose.yml` file is configured to use the `.env.docker` files automatically when running with Docker.

## Troubleshooting

### Connection Refused Errors
If you see `ERR_CONNECTION_REFUSED` errors:
1. Ensure containers are on the same Docker network
2. Verify the `MTES_DOMAIN` is set correctly for your environment
3. Check that the frontend container is running and accessible

### PDF Generation Issues
1. Check Chrome/Chromium installation in Docker containers
2. Verify authentication tokens are valid
3. Ensure the export page loads correctly in browser first

## Error Handling
The PDF export function includes:
- Retry logic with exponential backoff
- Improved error handling for browser cleanup
- Better logging for debugging connectivity issues
