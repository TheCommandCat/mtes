# Docker Setup for Development

This document outlines how to use Docker and Docker Compose to build and run this application stack (frontend and backend) for development purposes.

## Prerequisites

*   Docker installed and running (Docker Desktop recommended).
*   A terminal or command prompt.
*   Ensure you are in the root directory of this monorepo.

## Initial Setup

Before running Docker Compose for the first time, or if you've made changes that affect the backend's built distributables:

1.  **Build the Backend Application:**
    The backend service's Docker image expects the backend application to be already built on your host machine. Run the following command from the monorepo root:
    ```bash
    npx nx build backend
    ```
    This step is necessary because the `apps/backend/Dockerfile` copies files directly from the `dist/apps/backend` directory.

## Building and Running with Docker Compose

1.  **Build and Start Services:**
    To build the Docker images for both frontend and backend, and then start the services, run:
    ```bash
    docker-compose up --build
    ```
    *   `--build`: Forces Docker Compose to build the images before starting the containers. This is recommended if you've made changes to Dockerfiles or application code that needs to be rebuilt into the image.
    *   You can add `-d` to run in detached mode (in the background): `docker-compose up --build -d`

2.  **Accessing Services:**
    Once the services are running:
    *   **Frontend:** Accessible at `http://localhost:3000` (or the port you mapped in `docker-compose.yml` for the frontend).
    *   **Backend:** Accessible at `http://localhost:3001` (or the port you mapped for the backend). The frontend application will typically communicate with the backend on its container network name (`http://backend:3000`).

3.  **Viewing Logs:**
    If running in detached mode (or in another terminal), you can view logs for specific services:
    ```bash
    docker-compose logs frontend
    docker-compose logs backend
    ```
    To follow logs in real-time:
    ```bash
    docker-compose logs -f frontend
    docker-compose logs -f backend
    ```

## Stopping Services

1.  **Stop Services (if running in foreground):** Press `Ctrl+C` in the terminal where `docker-compose up` is running.
2.  **Stop Services (if running in detached mode):**
    ```bash
    docker-compose down
    ```
    This command stops and removes the containers. It does not remove the built images or volumes by default. To also remove volumes (e.g., database data if you add a database service with volumes), use `docker-compose down -v`.

## Environment Variables

*   **Backend:** Environment variables for the backend are managed via the `apps/backend/.env.local` file, which is specified in the `docker-compose.yml`.
*   **Frontend:** Frontend environment variables (e.g., `NEXT_PUBLIC_*`) are typically built into the Docker image during the `npx nx build frontend` step within the `apps/frontend/Dockerfile`. If you need to change them, you might need to rebuild the frontend image.

## Troubleshooting

*   **Frontend Build Issues (`ProjectsWithNoNameError` or similar):**
    Ensure your root `.dockerignore` file correctly excludes `dist/` and `node_modules/`. The refined `COPY` commands in `apps/frontend/Dockerfile` are designed to prevent this, but ensure no local `dist` artifacts are inadvertently copied into the build stage.
*   **Backend Not Starting:**
    *   Ensure you have run `npx nx build backend` on your host *before* `docker-compose up --build`.
    *   Check logs: `docker-compose logs backend`.
*   **Port Conflicts:** If other applications on your host machine are using ports `3000` or `3001`, you can change the host-side port mapping in `docker-compose.yml`. For example, change `ports: - "3000:3000"` to `ports: - "3005:3000"` to map the container's port `3000` to your host's port `3005`.
