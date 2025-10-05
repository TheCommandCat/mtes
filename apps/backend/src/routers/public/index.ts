import express, { Request, Response } from 'express';
import * as db from '@mtes/database';
import { ObjectId } from 'mongodb';

const router = express.Router({ mergeParams: true });

router.get('/event', (req: Request, res: Response) => {
  db.getElectionEvent(new ObjectId(req.params.eventId)).then(event => {
    res.status(200).json(event);
  });
});

router.get('/events', (req: Request, res: Response) => {
  db.getAllElectionEvents().then(events => {
    res.status(200).json(events);
  });
});

export default router;
