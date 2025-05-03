import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import divisionUsersRouter from './users';
import { ElectionEvent, ElectionState } from '@mtes/types';
import * as db from '@mtes/database';
import { cleanDivisionData } from 'apps/backend/src/lib/schedule/cleaner';
import { getDivisionUsers } from 'apps/backend/src/lib/schedule/division-users';

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
    const eventData = req.body;

    // Validate required fields
    if (!eventData?.name || !eventData?.votingStands) {
      res.status(400).json({ error: 'שם האירוע ומספר עמדות הצבעה הם שדות חובה' });
      return;
    }

    // Validate dates
    if (!eventData.startDate || !eventData.endDate) {
      res.status(400).json({ error: 'תאריכי התחלה וסיום הם שדות חובה' });
      return;
    }

    // Validate members format if provided
    if (eventData.members) {
      const validMembers = eventData.members.every(m => m.name && m.city);
      if (!validMembers) {
        res.status(400).json({ error: 'כל החברים חייבים לכלול שם ועיר' });
        return;
      }
    }

    eventData.startDate = new Date(eventData.startDate);
    eventData.endDate = new Date(eventData.endDate);

    console.log('⏬ Creating Event...');
    const eventResult = await db.addElectionEvent(eventData as ElectionEvent);
    if (!eventResult.acknowledged) {
      console.log('❌ Could not create Event');
      res.status(500).json({ ok: false });
      return;
    }
    console.log('✅ Created Event!');

    console.log('🔐 Creating division state');
    if (!(await db.addElectionState(getInitialDivisionState())).acknowledged) {
      throw new Error('Could not create division state!');
    }
    console.log('✅ Created division state');

    console.log('👤 Creating division members');
    const membersResult = await db.addMembers(eventData.members);
    if (!membersResult.acknowledged) {
      res.status(500).json({ error: 'Could not create members!' });
      return;
    }

    console.log('👤 Generating division users');
    const users = getDivisionUsers(eventData.votingStands);
    console.log(users);

    if (!(await db.addUsers(users)).acknowledged) {
      res.status(500).json({ error: 'Could not create users!' });
      return;
    }
    console.log('✅ Generated division users');

    res.json({ ok: true, id: eventResult.insertedId });
  })
);

router.put('/', (req: Request, res: Response) => {
  const body = req.body;

  if (body.startDate) body.startDate = new Date(body.startDate);
  if (body.endDate) body.endDate = new Date(body.endDate);

  const validElectionEvent = {
    name: body.name,
    eventUsers: body.eventUsers,
    hasState: body.hasState,
    votingStands: body.votingStands,
    startDate: body.startDate,
    endDate: body.endDate
  };

  console.log(`⏬ Updating Event`);
  db.updateElectionEvent(validElectionEvent, true).then(task => {
    if (task.acknowledged) {
      console.log('✅ Event updated!');

      if (body.votingStands) {
        // remove old users
        console.log('🚮 Removing old users');
        db.deleteUsers({
          isAdmin: { $ne: true }
        });

        const users = getDivisionUsers(body.votingStands);
        db.addUsers(users);
      }

      if (body.members) {
        db.deleteMembers();
        db.addMembers(body.members);
      }

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
    } catch (error) {
      res.status(500).json(error.message);
      return;
    }
    console.log('✅ Deleted event data!');
    res.status(200).json({ ok: true });
  })
);

router.use('/users', divisionUsersRouter);

export default router;
