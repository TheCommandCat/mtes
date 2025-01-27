import express, { Request, Response } from 'express';
import * as db from '@mtes/database';

const router = express.Router({ mergeParams: true });

router.get('/events', (req: Request, res: Response) => {
  db.getAllElectionEvents().then(events => {
    console.log(events);

    res.json(
      events.map(event => {
        event.divisions.forEach(division => {
          delete division.schedule;
          return division;
        });
        return event;
      })
    );
  });
});

export default router;
