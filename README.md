# 🗳️ MTES - Moatza TLV Election System

> Modern Real Time Election Management System built with Next.js, Express, and WebSocket technology! 🚀

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Nx](https://img.shields.io/badge/Nx-143055?style=for-the-badge&logo=nx&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## ✨ Features

- 🔄 **Real-time Updates**: Live voting progress with WebSocket integration
- 🎯 **Drag & Drop Interface**: Intuitive member assignment to voting stands
- 🔐 **Role-Based Access**: Secure access control for different user types
- 📊 **Live Results**: Instant visualization of voting outcomes
- 🎛️ **Admin Dashboard**: Comprehensive election management tools
- 📱 **Responsive Design**: Works seamlessly on all devices

## 🛠️ Tech Stack

- **Frontend**: Next.js + Material-UI
- **Backend**: Express.js + Socket.IO
- **Database**: MongoDB
- **Build Tool**: Nx
- **Language**: TypeScript

## 🚀 Quick Start

> **Prerequisite:**  
> You need [Docker](https://www.docker.com/get-started/) installed.  
> Start a MongoDB database instance (in the background) with:
>
> ```bash
> docker run --name mtes-mongo -p 27017:27017 -d mongo:7.0.5
> ```

1. **Clone & Install**

```bash
git clone https://github.com/TheCommandCat/mtes.git
cd mtes
npm install
```

2. **Configure Environment Variables**

   Create a `.env` file in the `apps/backend/` directory and set a `JWT_SECRET`:

   ```bash
   cp .env.example apps/backend/.env
   # Then, edit apps/backend/.env and set JWT_SECRET
   ```

3. **Run Development Server**

```bash
npm run dev
```

## 🐳 Deploying with Docker Compose

Deploy the application swiftly using Docker Compose. 🚀 Ensure Docker is running.

> [!IMPORTANT]
> Before launching, configure your environment variables. The backend service needs an `apps/backend/.env.local` file (copy `apps/backend/.env` if needed). The `JWT_SECRET` is crucial. ✨

Run this from the project root:

```bash
docker-compose up -d
```

This builds and starts frontend and backend services in detached mode.

Access:

- **Frontend**: `http://localhost:4200` 🖥️
- **Backend API**: `http://localhost:3333` ⚙️

To stop:

```bash
docker-compose down
```

Happy deploying! 🎉

## 🏗️ Project Structure

```
mtes/
├── apps/
│   ├── frontend/    # Next.js application
│   └── backend/     # Express server
├── libs/
│   ├── database/    # MongoDB models
│   ├── types/       # Shared types
│   └── utils/       # Common utilities
```

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

This project is licensed under the GPL-3.0 License. It utilizes a similar tech stack and codebase inspired by [FIRSTIsrael/lems](https://github.com/FIRSTIsrael/lems); 🙏 thank you for making this possible! 🚀

**_Made with ❤️ by [@TheCommandCat](https://github.com/TheCommandCat)_**
