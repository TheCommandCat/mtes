import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import divisionScheduleRouter from './schedule';
import divisionUsersRouter from './users';
import { ElectionEvent } from '@mtes/types';
import * as db from '@mtes/database';
import { cleanDivisionData } from 'apps/backend/src/lib/schedule/cleaner';

const router = express.Router({ mergeParams: true });

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
      console.log(`❌ Could not create Event ${body.name}`);
      res.status(500).json({ ok: false });
      return;
    }

    console.log('⏬ Creating Event divisions...');
    divisions.forEach(async division => {
      const divisionResult = await db.addDivision({
        ...division,
        eventId: eventResult.insertedId,
        hasState: false
      });
      if (divisionResult.acknowledged) {
        console.log(`✅ Division ${divisionResult.insertedId} created!`);
      } else {
        console.log(`❌ Could not create division ${division.name}`);
        res.status(500).json({ ok: false });
        return;
      }
    });

    res.json({ ok: true, id: eventResult.insertedId });
  })
);

router.put('/', (req: Request, res: Response) => {
  const body: Partial<ElectionEvent> = { ...req.body };
  if (!body) return res.status(400).json({ ok: false });

  if (body.startDate) body.startDate = new Date(body.startDate);
  if (body.endDate) body.endDate = new Date(body.endDate);

  if (body.schedule) {
    body.schedule = body.schedule.map(e => {
      return { ...e, startTime: new Date(e.startTime), endTime: new Date(e.endTime) };
    });
  }

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
    console.log(`🚮 Deleting data from event}`);
    try {
      await cleanDivisionData();
      await db.updateDivision({ hasState: false });
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
