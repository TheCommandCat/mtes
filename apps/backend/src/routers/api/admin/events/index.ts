import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import divisionUsersRouter from './users';
import { ElectionEvent, ElectionState, User, Member } from '@mtes/types'; // Added Member
import * as db from '@mtes/database';
import { cleanEventTransactionalData } from 'apps/backend/src/lib/schedule/cleaner'; // Renamed import
import { CreateVotingStandUsers } from 'apps/backend/src/lib/schedule/voting-stands-users';
import { ObjectId } from 'mongodb'; // Imported ObjectId

const router = express.Router({ mergeParams: true });

// Base initial state, eventId will be added
function getBaseInitialEventState(): Omit<ElectionState, 'eventId'> {
  return {
    activeRound: null,
    completed: false
  };
}

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const eventData: Partial<ElectionEvent & { members: Array<Partial<Member>> }> = req.body;

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
      if (!Array.isArray(eventData.members)) {
        res.status(400).json({ error: 'השדה members חייב להיות מערך' });
        return;
      }
      const validMembers = eventData.members.every(m => m.name && m.city);
      if (!validMembers) {
        res.status(400).json({ error: 'כל החברים חייבים לכלול שם ועיר' });
        return;
      }
    }

    eventData.startDate = new Date(eventData.startDate);
    eventData.endDate = new Date(eventData.endDate);

    console.log('⏬ Creating Event...');
    // Ensure eventData being passed to addElectionEvent is strictly typed as ElectionEvent
    const electionEventPayload: ElectionEvent = {
        name: eventData.name,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        color: eventData.color,
        eventUsers: eventData.eventUsers || [], // Default to empty array if not provided
        votingStands: eventData.votingStands,
        hasState: eventData.hasState || false, // Default to false
    };

    const eventResult = await db.addElectionEvent(electionEventPayload);
    if (!eventResult.acknowledged || !eventResult.insertedId) {
      console.log('❌ Could not create Event');
      res.status(500).json({ ok: false, message: 'Could not create Event' });
      return;
    }
    const newEventId = eventResult.insertedId;
    console.log(`✅ Created Event with ID: ${newEventId}`);

    console.log(`🔐 Creating event state for event ${newEventId}`);
    const stateForEvent: ElectionState = { 
        ...getBaseInitialEventState(), 
        eventId: newEventId 
    };
    if (!(await db.addEventState(stateForEvent)).acknowledged) { // Assuming addEventState exists
      // Potentially roll back event creation or log critical error
      console.error(`Critical: Could not create event state for event ${newEventId}!`);
      // Not throwing error to prevent crash, but this is a serious issue.
      // Consider how to handle this failure, e.g., by deleting the created event.
    } else {
      console.log(`✅ Created event state for event ${newEventId}`);
    }
    

    if (eventData.members && Array.isArray(eventData.members)) {
      console.log(`👤 Creating members for event ${newEventId}`);
      const membersWithEventId = eventData.members.map(member => ({ 
        ...member, 
        eventId: newEventId 
      } as Member)); // Cast to Member
      const membersResult = await db.addMembers(membersWithEventId);
      if (!membersResult.acknowledged) {
        // Log error, but event creation was successful, so don't return 500 for this alone.
        console.error(`Could not create members for event ${newEventId}!`);
      } else {
        console.log(`✅ Created members for event ${newEventId}`);
      }
    }

    // User creation logic remains global for now
    console.log('👤 Generating voting stand users (global)');
    const users = CreateVotingStandUsers(eventData.votingStands);
    if (users.length > 0) {
        if (!(await db.addUsers(users)).acknowledged) {
          // Log error
          console.error('Could not create voting stand users!');
        } else {
          console.log('✅ Generated voting stand users');
        }
    }


    res.json({ ok: true, id: newEventId });
  })
);

router.put(
  '/:eventIdParam', // Changed route to include eventIdParam
  asyncHandler(async (req: Request, res: Response) => {
    const eventIdParamString = req.params.eventIdParam;
    let eventIdObjectId: ObjectId;
    try {
        eventIdObjectId = new ObjectId(eventIdParamString);
    } catch (error) {
        res.status(400).json({ error: 'Invalid Event ID format in URL parameter.' });
        return;
    }

    const body = req.body;

    if (body.startDate) body.startDate = new Date(body.startDate);
    if (body.endDate) body.endDate = new Date(body.endDate);

    // Construct a validElectionEvent object with only properties of ElectionEvent
    const validElectionEvent: Partial<ElectionEvent> = {};
    if (body.name !== undefined) validElectionEvent.name = body.name;
    if (body.eventUsers !== undefined) validElectionEvent.eventUsers = body.eventUsers;
    if (body.hasState !== undefined) validElectionEvent.hasState = body.hasState;
    if (body.votingStands !== undefined) validElectionEvent.votingStands = body.votingStands;
    if (body.startDate !== undefined) validElectionEvent.startDate = body.startDate;
    if (body.endDate !== undefined) validElectionEvent.endDate = body.endDate;
    if (body.color !== undefined) validElectionEvent.color = body.color;


    if (Object.keys(validElectionEvent).length === 0) {
        res.status(400).json({ error: 'No valid fields provided for update.' });
        return;
    }

    console.log(`⏬ Updating Event ${eventIdObjectId}`);
    // Pass false for upsert, as we are updating an existing event.
    const task = await db.updateElectionEvent(eventIdObjectId, validElectionEvent, false); 

    if (!task.acknowledged || task.matchedCount === 0) {
      console.log(`❌ Could not update Event ${eventIdObjectId}. Event not found or no changes made.`);
      // matchedCount === 0 means no document was found with that ID.
      // modifiedCount === 0 means a document was found, but no changes were made (e.g. same data sent).
      // For this case, if matchedCount is 0, it's more like a 404.
      if (task.matchedCount === 0) {
        return res.status(404).json({ ok: false, message: `Event with ID ${eventIdObjectId} not found.` });
      }
      return res.status(500).json({ ok: false, message: 'Could not update Event or no effective changes.' });
    }

    console.log(`✅ Event ${eventIdObjectId} updated!`);

    // TODO: Revisit user provisioning for event updates in a multi-event context.
    /*
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
    */

    res.json({ ok: true, id: eventIdObjectId }); // Return the eventIdObjectId used for the update
  })
);

router.delete(
  '/:eventIdParam/data', // Changed route to include eventIdParam
  asyncHandler(async (req: Request, res: Response) => {
    const eventIdParamString = req.params.eventIdParam;
    let eventIdObjectId: ObjectId;
    try {
        eventIdObjectId = new ObjectId(eventIdParamString);
    } catch (error) {
        res.status(400).json({ error: 'Invalid Event ID format in URL parameter.' });
        return;
    }

    console.log(`🚮 Deleting transactional data for event ${eventIdObjectId}`);
    try {
      await cleanEventTransactionalData(eventIdObjectId); // Use renamed function
    } catch (error) {
      console.error(`❌ Error deleting transactional data for event ${eventIdObjectId}:`, error);
      res.status(500).json({ message: error.message || 'Failed to delete event data.' });
      return;
    }
    console.log(`✅ Deleted transactional data for event ${eventIdObjectId}!`);
    res.status(200).json({ ok: true });
  })
);

router.use('/users', divisionUsersRouter);

export default router;
