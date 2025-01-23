import express from 'express';
import cookies from 'cookie-parser';
import cors from 'cors';
import authRouter from './routers/auth';
import publicRouter from './routers/public';
import apiRouter from './routers/api';
import * as path from 'path';
import * as db from '@mtes/database';

const notinporttand = db.EventUserAllowedRoleTypes

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3333;

const app = express();
const corsOptions = {
  origin: [/localhost:\d+$/],
  credentials: true
};

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

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});