import jwt, { JwtPayload } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { NextFunction, Request, Response } from 'express';
import * as db from '@mtes/database';
import { extractToken } from '../lib/auth';

export interface JwtTokenData extends JwtPayload {
  userId: ObjectId;
}

const jwtSecret = process.env.JWT_SECRET;

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    const tokenData = jwt.verify(token, jwtSecret) as JwtTokenData;
    const user = await db.getUserWithCredentials({ _id: new ObjectId(tokenData.userId) });
    if (user) {
      delete user.password;
      req.user = user;
      return next();
    }
  } catch (err) {
    //Invalid token
  }

  return res.status(401).json({ error: 'UNAUTHORIZED' });
};
