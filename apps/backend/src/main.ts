import express from 'express';
import cookies from 'cookie-parser';
import cors from 'cors';
import * as http from 'http';
import authRouter from './routers/auth';
import apiRouter from './routers/api';
import publicRouter from './routers/public';
import * as path from 'path';
import { Server } from 'socket.io';
import websocket from './websocket';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3333;

const app = express();
const server = http.createServer(app);
const corsOptions = {
  origin: [
    /localhost:\d+$/,
    /\.thecommandcat\.me$/
  ],
  credentials: true
};
const io = new Server(server, { cors: corsOptions });

app.use(cookies());
app.use(cors(corsOptions));
app.use(express.json());

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use('/auth', authRouter);
app.use('/public', publicRouter);
app.use('/api', apiRouter);

app.get('/status', (req, res) => {
  return res.status(200).json({ ok: true });
});

app.use((req, res) => res.status(404).json({ error: 'ROUTE_NOT_DEFINED' }));

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
});

io.on('connection', websocket);

console.log('💫 Starting server...');
server.listen(port, () => {
  console.log(`✅ Server started on port ${port}.`);
});

server.on('error', console.error);