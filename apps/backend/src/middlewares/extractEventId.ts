import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const jwtSecret = process.env.JWT_SECRET;

interface DecodedToken {
  userId: string;
  eventId: string;
  // Add other properties if they exist in your JWT payload
}

export const extractEventIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies['auth-token'];

  if (!jwtSecret) {
    console.error('JWT_SECRET is not defined. Cannot verify token.');
    return res.status(500).json({ error: 'SERVER_CONFIG_ERROR' });
  }

  if (!token) {
    console.log('🚫 No token provided');
    return res.status(401).json({ error: 'NO_TOKEN_PROVIDED' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as DecodedToken;

    if (!decoded.eventId || !decoded.userId) {
      console.log('🚫 Token is missing eventId or userId');
      return res.status(401).json({ error: 'INVALID_TOKEN_PAYLOAD' });
    }

    req.eventId = decoded.eventId;
    req.userId = decoded.userId;
    console.log(`✅ Token verified. EventID: ${req.eventId}, UserID: ${req.userId}`);
    next();
  } catch (error) {
    console.error('🚫 Invalid token:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
};
