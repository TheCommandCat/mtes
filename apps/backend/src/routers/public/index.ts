import express, { Request, Response } from 'express';
import * as db from '@mtes/database';

const router = express.Router({ mergeParams: true });

router.get('/events', (req: Request, res: Response) => {
  db.getAllElectionEvents().then(events => {
    res.json(
      events.map(event => {
        return event;
      })
    );
  });
});

router.get('/event', (req: Request, res: Response) => {
  db.getElectionEvent().then(event => {
    res.status(200).json(event);
  });
});

// router.use('/divisions', divisionsRouter);

// router.use('/portal', portalRouter);

export default router;
