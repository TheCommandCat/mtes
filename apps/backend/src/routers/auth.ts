import express, { NextFunction, Request, Response } from 'express';
import dayjs from 'dayjs';
import jwt from 'jsonwebtoken';
import * as db from '@mtes/database';
import { User } from '@mtes/types';

const router = express.Router({ mergeParams: true });

const jwtSecret = process.env.JWT_SECRET;

interface LoginRequestBody extends User {
  eventId: string;
}

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const { eventId, ...loginDetails }: LoginRequestBody = req.body;

  if (!eventId) {
    console.log('🔑 Login failed - eventId is missing');
    return res.status(400).json({ error: 'EVENT_ID_REQUIRED' });
  }

  try {
    // It's important that db.getUser does not use eventId for fetching user credentials
    const user = await db.getUser({ ...loginDetails });

    if (!user) {
      console.log(`🔑 Login failed for event ${eventId} - ${loginDetails.role || 'admin'}`);
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    console.log(`🔑 Login successful for event ${eventId} - ${loginDetails.role || 'admin'}`);

    const expires = dayjs().endOf('day');
    const expiresInSeconds = expires.diff(dayjs(), 'second');

    const token = jwt.sign(
      {
        userId: user._id,
        eventId: eventId, // Add eventId to the JWT payload
      },
      jwtSecret,
      {
        issuer: 'MOATZA',
        expiresIn: expiresInSeconds,
      }
    );

    res.cookie('auth-token', token, { expires: expires.toDate(), httpOnly: true, secure: true });
    return res.json(user); // User object remains the same in the response
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
