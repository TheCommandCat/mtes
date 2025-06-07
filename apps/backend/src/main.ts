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
  origin: function (origin, callback) {
    console.log(`CORS check - Origin: ${origin}`);

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      console.log('No origin - allowing');
      return callback(null, true);
    }

    const allowedOrigins = [/localhost:\d+$/, 'https://mtes-api.thecommandcat.me'];

    const isOriginAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        const matches = origin === allowedOrigin;
        console.log(`String match "${allowedOrigin}": ${matches}`);
        return matches;
      } else {
        const matches = allowedOrigin.test(origin);
        console.log(`Regex match ${allowedOrigin}: ${matches}`);
        return matches;
      }
    });

    console.log(`CORS check - Origin: ${origin}, Allowed: ${isOriginAllowed}`);

    if (isOriginAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};
const io = new Server(server, { cors: corsOptions });

app.use(cookies());
app.use(cors(corsOptions));
app.use(express.json());

// Add explicit preflight handler
app.options('*', cors(corsOptions));

// Add debugging middleware for CORS
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use('/auth', authRouter);
app.use('/public', publicRouter);
app.use('/api', apiRouter);

app.get('/status', (req, res) => {
  return res.status(200).json({ ok: true });
});

app.get('/cors-test', (req, res) => {
  return res.status(200).json({
    origin: req.headers.origin || 'No origin',
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
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
