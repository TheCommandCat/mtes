import express, { Request, Response } from 'express';
import roundsRouter from './rounds';
import membersRouter from './members';
import stateRouter from './state';
import voteRouter from './vote';
import mmMembersRouter from './mm-members';
import * as db from '@mtes/database';
import { ObjectId } from 'mongodb';

const router = express.Router({ mergeParams: true });

router.get('/:eventId', async (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  let event;
  try {
    event = await db.getElectionEvent(new ObjectId(eventId));
  } catch (err) {
    // Invalid ObjectId or db error
    return res.status(404).json({ ok: false, message: 'Event not found' });
  }
  if (!event) {
    return res.status(404).json({ ok: false, message: 'Event not found' });
  }
  res.json(event);
});

router.use('/:eventId/rounds', roundsRouter);
router.use('/:eventId/members', membersRouter);
router.use('/:eventId/mm-members', mmMembersRouter);
router.use('/:eventId/state', stateRouter);
router.use('/:eventId/vote', voteRouter);

export default router;
