import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import divisionUsersRouter from './users';
import { ElectionEvent, ElectionState, User } from '@mtes/types';
import * as db from '@mtes/database';
import { cleanDivisionData } from 'apps/backend/src/lib/schedule/cleaner';
import { CreateVotingStandUsers } from 'apps/backend/src/lib/schedule/voting-stands-users';

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
    const users = CreateVotingStandUsers(eventData.votingStands);

    if (!(await db.addUsers(users)).acknowledged) {
      res.status(500).json({ error: 'Could not create users!' });
      return;
    }
    console.log('✅ Generated division users');

    res.json({ ok: true, id: eventResult.insertedId });
  })
);

router.put(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
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
    const task = await db.updateElectionEvent(validElectionEvent, true);

    if (!task.acknowledged) {
      console.log('❌ Could not update Event');
      res.status(500).json({ ok: false });
      return;
    }

    console.log('✅ Event updated!');

    if (body.votingStands) {
      console.log('🚮 Removing old users');
      const deleteTask = await db.deleteUsers({ role: 'voting-stand' });

      if (!deleteTask.acknowledged) {
        console.log('❌ Could not remove old users');
        res.status(500).json({ ok: false });
        return;
      }

      const userCreationTasks = Array.from({ length: body.votingStands }, (_, i) =>
        db.addUser({
          isAdmin: false,
          role: 'voting-stand',
          password: 'admin',
          lastPasswordSetDate: new Date(),
          roleAssociation: {
            type: 'stand',
            value: i + 1
          }
        } as User)
      );

      const results = await Promise.all(userCreationTasks);

      if (results.some(result => !result.acknowledged)) {
        console.log('❌ Could not add new users');
        res.status(500).json({ ok: false });
        return;
      }

      console.log('✅ Users updated!');
    }

    res.json({ ok: true, id: task.upsertedId });
  })
);

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
