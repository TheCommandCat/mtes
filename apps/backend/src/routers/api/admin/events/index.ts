import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import divisionScheduleRouter from './schedule';
import divisionUsersRouter from './users';
import { ElectionEvent, ElectionState } from '@mtes/types';
import * as db from '@mtes/database';
import { cleanDivisionData } from 'apps/backend/src/lib/schedule/cleaner';

const router = express.Router({ mergeParams: true });

function getInitialDivisionState(): ElectionState {
  return {
    activeRound: null,
    completed: false
  };
}

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { divisions, ...body }: any = { ...req.body };
    if (!body) {
      res.status(400).json({ ok: false });
      return;
    }

    console.log(divisions, body);

    body.startDate = new Date(body.startDate);
    body.endDate = new Date(body.endDate);

    console.log('⏬ Creating Event...');
    const eventResult = await db.addElectionEvent(body);
    if (!eventResult.acknowledged) {
      console.log('❌ Could not create Event');
      res.status(500).json({ ok: false });
      return;
    }
    console.log('✅ Created Event!');
    console.log('🔐 Creating division state');
    if (!(await db.addElectionState(getInitialDivisionState())).acknowledged)
      throw new Error('Could not create division state!');
    console.log('✅ Created division state');

    res.json({ ok: true, id: eventResult.insertedId });
  })
);

router.put('/', (req: Request, res: Response) => {
  const body: Partial<ElectionEvent> = { ...req.body };
  if (!body) return res.status(400).json({ ok: false });

  if (body.startDate) body.startDate = new Date(body.startDate);
  if (body.endDate) body.endDate = new Date(body.endDate);

  console.log(`⏬ Updating Event ${req.params.eventId}`);
  db.updateElectionEvent(body, true).then(task => {
    if (task.acknowledged) {
      console.log('✅ Event updated!');
      return res.json({ ok: true, id: task.upsertedId });
    } else {
      console.log('❌ Could not update Event');
      return res.status(500).json({ ok: false });
    }
  });
});

router.delete(
  '/data',
  asyncHandler(async (req: Request, res: Response) => {
    console.log(`🚮 Deleting data from event`);
    try {
      await cleanDivisionData();
      // await db.updateDivision({ hasState: false });
    } catch (error) {
      res.status(500).json(error.message);
      return;
    }
    console.log('✅ Deleted event data!');
    res.status(200).json({ ok: true });
  })
);

router.use('/schedule', divisionScheduleRouter);
router.use('/users', divisionUsersRouter);
// router.use('/:divisionId/pit-map', divisionPitMapRouter);
// router.use('/:divisionId/awards', divisionAwardsRouter);

export default router;
