import express, { Request, Response } from 'express';
import * as db from '@mtes/database';

const router = express.Router({ mergeParams: true });

router.get('/events', (req: Request, res: Response) => {
  db.getAllElectionEvents().then(events => {
    res.json(events);
  });
});



export default router;
