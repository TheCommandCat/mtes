import express, { Request, Response } from 'express';
import * as db from '@mtes/database';

const router = express.Router({ mergeParams: true });

router.get('/event', (req: Request, res: Response) => {
  db.getElectionEvent().then(event => {
    res.status(200).json(event);
  });
});

export default router;
