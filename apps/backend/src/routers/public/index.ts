import express, { Request, Response } from 'express';
import * as db from '@mtes/database';

const router = express.Router({ mergeParams: true });

router.get('/events', (req: Request, res: Response) => {
  db.getAllElectionEvents().then(events => {
    res.json(
      events.map(event => {
        delete event.schedule;
        return event;
      })
    );
  });
});

// router.use('/divisions', divisionsRouter);

// router.use('/portal', portalRouter);

export default router;
