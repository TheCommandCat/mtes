import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import asyncHandler from 'express-async-handler';
import { Parser } from '@json2csv/plainjs';
import * as db from '@mtes/database';

const router = express.Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  db.getEventUsers(new ObjectId(req.params.eventId)).then(users => {
    return res.json(users);
  });
});

router.get(
  '/credentials',
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = req.params.eventId;
    if (!eventId) {
      console.log('❌ Event ID is null or undefined');
      res.status(400).json({ ok: false, message: 'Event ID is missing' });
      return;
    }
    const usersWithAdmin = await db.getEventUsersWithCredentials(new ObjectId(eventId));
    const users = usersWithAdmin.filter(user => !user.isAdmin);

    res.json(users);
  })
);

router.get('/:userId', (req: Request, res: Response) => {
  db.getUser({
    _id: new ObjectId(req.params.userId)
  }).then(user => {
    return res.json(user);
  });
});

export default router;
