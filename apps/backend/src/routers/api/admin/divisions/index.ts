import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Division } from '@mtes/types';
import * as db from '@mtes/database';
import divisionScheduleRouter from './schedule';
import divisionUsersRouter from './users';
import { cleanDivisionData } from '../../../../lib/schedule/cleaner';

const router = express.Router({ mergeParams: true });

router.put('/', (req: Request, res: Response) => {
  const body: Partial<Division> = { ...req.body };
  if (!body) return res.status(400).json({ ok: false });

  if (body.schedule)
    body.schedule = body.schedule.map(e => {
      return { ...e, startTime: new Date(e.startTime), endTime: new Date(e.endTime) };
    });

  console.log(`⏬ Updating Division ${req.params.divisionId}`);
  db.updateDivision(body, true).then(task => {
    if (task.acknowledged) {
      console.log('✅ Division updated!');
      return res.json({ ok: true, id: task.upsertedId });
    } else {
      console.log('❌ Could not update Division');
      return res.status(500).json({ ok: false });
    }
  });
});

router.delete(
  '/data',
  asyncHandler(async (req: Request, res: Response) => {
    console.log(`🚮 Deleting data from division ${req.params.divisionId}`);
    try {
      await cleanDivisionData();
      await db.updateDivision({ hasState: false });
    } catch (error) {
      res.status(500).json(error.message);
      return;
    }
    console.log('✅ Deleted division data!');
    res.status(200).json({ ok: true });
  })
);

router.use('/schedule', divisionScheduleRouter);
router.use('/users', divisionUsersRouter);
// router.use('/:divisionId/pit-map', divisionPitMapRouter);
// router.use('/:divisionId/awards', divisionAwardsRouter);

export default router;
