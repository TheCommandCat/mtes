import express, { NextFunction, Request, Response } from 'express';
import dayjs from 'dayjs';
import jwt from 'jsonwebtoken';
import * as db from '@mtes/database';
import { User } from '@mtes/types';
import { ObjectId } from 'mongodb';

const router = express.Router({ mergeParams: true });

const jwtSecret = process.env.JWT_SECRET;

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const loginDetails: User = req.body;
  if (loginDetails.eventId) loginDetails.eventId = new ObjectId(loginDetails.eventId);

  try {
    const user = await db.getUser({ ...loginDetails });

    if (!user) {
      console.log(`🔑 Login failed ${loginDetails.role || 'admin'}`);
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    console.log(`🔑 Login successful ${loginDetails.role || 'admin'}`);

    const expires = dayjs().endOf('day');
    const expiresInSeconds = expires.diff(dayjs(), 'second');

    const token = jwt.sign(
      {
        userId: user._id
      },
      jwtSecret,
      {
        issuer: 'MOATZA',
        expiresIn: expiresInSeconds
      }
    );

    res.cookie('auth-token', token, {
      expires: expires.toDate(),
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });
    return res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  console.log(`🔒 Logout successful`);
  res.clearCookie('auth-token');
  return res.json({ ok: true });
});

export default router;