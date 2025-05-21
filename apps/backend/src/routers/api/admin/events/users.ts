import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import asyncHandler from 'express-async-handler';
import { Parser } from '@json2csv/plainjs';
import * as db from '@mtes/database';

const router = express.Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
  db.getEventUsers().then(users => {
    return res.json(users);
  });
});

router.get(
  '/export',
  asyncHandler(async (req: Request, res: Response) => {
    const usersWithAdmin = await db.getEventUsersWithCredentials();

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
      `attachment; filename=division_${req.params.divisionId}_passwords.csv`
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

router.get('/:userId', (req: Request, res: Response) => {
  db.getUser({
    _id: new ObjectId(req.params.userId)
  }).then(user => {
    return res.json(user);
  });
});

export default router;
