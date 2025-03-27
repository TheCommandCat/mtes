# MTES - Election/Voting Management System

## Overview

MTES (Election/Voting Management System) is a monorepo project built with Nx that provides a comprehensive platform for managing elections and voting processes. It includes real-time updates via WebSocket technology, ensuring a seamless and interactive user experience. The system is designed to handle various aspects of election management, from division scheduling to voting stand interfaces.

## Project Structure

The project is structured as a monorepo, utilizing Nx to manage multiple applications and libraries within a single repository. Here's a breakdown of the key directories:

```
├── apps/
│   ├── frontend/    # Next.js application for the user interface
│   └── backend/     # Express server with WebSocket support for real-time updates
├── libs/
│   ├── database/    # Database operations and models using MongoDB
│   ├── types/       # Shared TypeScript types and schemas for data validation
│   └── utils/       # Utility functions for arrays, objects, and random data generation
```

## Key Features

*   **Real-time Voting Updates**: Leverages WebSocket for instant updates during voting sessions.
*   **Division Management and Scheduling**: Tools for managing and scheduling different voting divisions.
*   **Event Management System**: System to create and manage election events.
*   **Role-Based Access Control**: Secure access control based on user roles.
*   **Admin Dashboard**: Comprehensive dashboard for administrators to manage the system.
*   **Voting Stand Interface**: User-friendly interface for voters to cast their votes.

## Technologies Used

*   **Frontend**: Next.js, Material-UI, WebSocket
*   **Backend**: Express.js, WebSocket
*   **Database**: MongoDB
*   **Build Tool**: Nx
*   **Language**: TypeScript

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
*   [MongoDB](https://www.mongodb.com/)

## Installation

1.  Clone the repository:

    ```bash
    git clone <repository-url>
    cd mtes
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

## Configuration

1.  **Environment Variables**:

    *   Create `.env` files for both the `frontend` and `backend` applications.
    *   Configure the necessary environment variables such as database connection strings, API keys, and WebSocket URLs.

## Running the Application

To start the development servers, use the following commands:

1.  **Start both Frontend and Backend**:

    ```bash
    npm run dev
    ```

2.  **Start Frontend only**:

    ```bash
    nx serve frontend
    ```

3.  **Start Backend only**:

    ```bash
    nx serve backend
    ```

## Detailed Project Structure

### Frontend (`/apps/frontend`)

*   **Pages**: Contains various routes for the application, including:
    *   `admin`: Pages for administrative tasks.
    *   `events`: Pages for managing election events.
    *   `voting`: Pages for the voting interface.
*   **Components**: Reusable UI components.
*   **Hooks**: Custom React hooks for WebSocket communication and data fetching.
*   **Theme**: Material-UI theme configuration.
*   **Utils**: Utility functions for frontend operations.

### Backend (`/apps/backend`)

*   **WebSocket Server**: Handles real-time communication between the server and clients.
*   **Authentication Middleware**: Ensures secure access to API endpoints.
*   **CSV Data Processing**: Processes CSV data for election events and divisions.
*   **API Routes**:
    *   `admin`: Routes for administrative tasks.
    *   `divisions`: Routes for managing voting divisions.
    *   `events`: Routes for managing election events.
*   **Schedule Management**: Manages the scheduling of election events and divisions.

### Libraries (`/libs`)

#### Database (`/libs/database`)

*   **MongoDB Models and Schemas**: Defines the data structure for the application.
*   **CRUD Operations**: Implements Create, Read, Update, and Delete operations for:
    *   Contestants
    *   Divisions
    *   Election Events
    *   Members
    *   Users

#### Types (`/libs/types`)

*   **Shared TypeScript Interfaces**: Defines the data types used throughout the application.
*   **Validation Schemas**: Uses schemas for data validation.
*   **Constants and Enums**: Defines constants and enums used in the project.

#### Utils (`/libs/utils`)

*   **Array Utilities**: Utility functions for array manipulation.
*   **Object Utilities**: Utility functions for object manipulation.
*   **Random Data Generation**: Tools for generating random data for testing and development.

## Development

The project uses Nx for managing the monorepo. Here are some common commands:

```bash
# Generate new library
nx generate @nx/react:lib my-lib

# Generate new component
nx generate @nx/react:component my-component

# Run tests
nx test [project-name]

# Build project
nx build [project-name]
```

## License

[Your License Here]
