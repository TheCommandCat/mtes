import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import asyncHandler from 'express-async-handler';
import { Parser } from '@json2csv/plainjs';
import * as db from '@mtes/database';

const router = express.Router({ mergeParams: true });

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const eventIdParamString = req.params.eventIdParam;
  if (!eventIdParamString) {
    console.error('❌ Event ID parameter (eventIdParam) is missing in GET /users');
    return res.status(400).json({ error: 'Event ID parameter is required.' });
  }
  try {
    const eventIdObjectId = new ObjectId(eventIdParamString);
    console.log(`⏬ Getting users for event ${eventIdObjectId}`);
    const users = await db.getEventUsers(eventIdObjectId);
    return res.json(users);
  } catch (error) {
    console.error(`❌ Invalid Event ID format in GET /users: ${eventIdParamString}`, error);
    return res.status(400).json({ error: 'Invalid Event ID format.' });
  }
}));

router.get(
  '/export',
  asyncHandler(async (req: Request, res: Response) => {
    const eventIdParamString = req.params.eventIdParam;
    if (!eventIdParamString) {
      console.error('❌ Event ID parameter (eventIdParam) is missing in GET /users/export');
      return res.status(400).json({ error: 'Event ID parameter is required.' });
    }
    let eventIdObjectId: ObjectId;
    try {
      eventIdObjectId = new ObjectId(eventIdParamString);
    } catch (error) {
      console.error(`❌ Invalid Event ID format in GET /users/export: ${eventIdParamString}`, error);
      return res.status(400).json({ error: 'Invalid Event ID format.' });
    }

    console.log(`⏬ Exporting user credentials for event ${eventIdObjectId}`);
    const usersWithAdmin = await db.getEventUsersWithCredentials(eventIdObjectId);

    // remove admin user
    const users = usersWithAdmin.filter(user => !user.isAdmin);

    const credentials = await Promise.all(
      users.map(async user => {
        const { role, password, roleAssociation } = user;

        return {
          role,
          value: roleAssociation ? roleAssociation.value : '',
          password
        };
      })
    );

    res.set(
      'Content-Disposition',
      `attachment; filename=event_${eventIdParamString}_passwords.csv` // Updated filename
    );
    res.set('Content-Type', 'text/csv');

    const opts = {
      fields: [
        {
          label: 'תפקיד',
          value: 'role'
        },
        {
          label: 'ערך תפקיד',
          value: 'value'
        },
        {
          label: 'סיסמה',
          value: 'password'
        }
      ]
    };
    const parser = new Parser(opts);
    res.send(`\ufeff${parser.parse(credentials)}`);
  })
);

// This route fetches a global user profile by userId, eventIdParam is not used for DB query.
router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
  const userIdString = req.params.userId;
  const eventIdParamString = req.params.eventIdParam; // Available due to mergeParams
  
  if (!userIdString) {
    console.error(`❌ User ID parameter is missing in GET /users/:userId (Event context: ${eventIdParamString || 'N/A'})`);
    return res.status(400).json({ error: 'User ID parameter is required.' });
  }
  try {
    const userIdObjectId = new ObjectId(userIdString);
    console.log(`⏬ Getting user ${userIdObjectId} (Event context: ${eventIdParamString || 'N/A'})`);
    // db.getUser is designed to fetch a user globally, not scoped by eventId
    const user = await db.getUser({ _id: userIdObjectId }); 
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json(user);
  } catch (error) {
    console.error(`❌ Invalid User ID format in GET /users/:userId: ${userIdString} (Event context: ${eventIdParamString || 'N/A'})`, error);
    return res.status(400).json({ error: 'Invalid User ID format.' });
  }
}));

export default router;
