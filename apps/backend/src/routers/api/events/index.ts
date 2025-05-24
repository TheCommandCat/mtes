import express, { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import * as db from '@mtes/database';
import { ElectionState, Member, Positions, Round, ElectionEvent, Vote } from '@mtes/types';
import { extractEventIdMiddleware } from '../../../../middlewares/extractEventId';

const router = express.Router({ mergeParams: true });
router.use(extractEventIdMiddleware);

// Helper to create ObjectId and handle errors, though middleware should ensure eventId exists
const getEventIdFromRequest = (req: Request, res: Response): ObjectId | null => {
  const eventIdString = req.eventId;
  if (!eventIdString) {
    res.status(400).json({ ok: false, message: 'Event ID is missing from request.' });
    return null;
  }
  try {
    return new ObjectId(eventIdString);
  } catch (error) {
    res.status(400).json({ ok: false, message: 'Invalid Event ID format.' });
    return null;
  }
};

const WHITE_VOTE_ID = '000000000000000000000000';
const WHITE_VOTE_MEMBER: WithId<Member> = {
  _id: new ObjectId(WHITE_VOTE_ID),
  eventId: new ObjectId(0), // Placeholder, will be set dynamically if needed or ensure this member is event-agnostic
  name: 'פתק לבן',
  city: 'אין אמון באף אחד'
};


router.get('/rounds', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  console.log(`⏬ Getting rounds for event ${eventIdObjectId}...`);
  return res.json(await db.getRounds({}, eventIdObjectId));
});

router.post('/addRound', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const { round }: { round: Round } = req.body;

  console.log(`⏬ Adding Round for event ${eventIdObjectId}...`, JSON.stringify(round, null, 2));

  if (!round) {
    console.log(`❌ Round object is null or undefined for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round object is missing' });
  }
  if (round.eventId?.toString() !== eventIdObjectId.toString()) {
    console.log(`❌ Round eventId ${round.eventId} does not match token eventId ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round eventId mismatch' });
  }
  if (!round.name) {
    console.log(`❌ Round name is missing or empty for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round name is required' });
  }
  if (!round.roles) {
    console.log(`❌ Round roles are missing for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round roles must be specified' });
  }
  if (!round.allowedMembers) {
    console.log(`❌ Round allowedMembers is missing for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round allowed members must be specified' });
  }

  try {
    round.allowedMembers = await Promise.all(
      round.allowedMembers.map(async memberId => { // memberId is string from request
        const dbMember = await db.getMember({ _id: new ObjectId(memberId) }, eventIdObjectId);
        if (!dbMember) {
          console.log(`❌ Member with ID ${memberId} not found in event ${eventIdObjectId}`);
          // Consider throwing an error or returning a specific response
          return null; // Or handle as an error
        }
        return dbMember;
      })
    ).then(members => members.filter(m => m !== null) as WithId<Member>[]);


    round.roles = await Promise.all(
      round.roles.map(async role => {
        const contestants = await Promise.all(
          role.contestants.map(async contestantId => { // contestantId is string from request
            const dbContestant = await db.getMember({ _id: new ObjectId(contestantId) }, eventIdObjectId);
            if (!dbContestant) {
              console.log(`❌ Contestant with ID ${contestantId} in role ${role.role} not found in event ${eventIdObjectId}`);
              // This should ideally throw an error to be caught by the outer try-catch
              throw new Error(`Contestant with ID ${contestantId} not found`);
            }
            return dbContestant;
          })
        );
        if (role.whiteVote) {
          // Ensure WHITE_VOTE_MEMBER is correctly scoped or handled if it needs eventId
          const whiteVoteMemberForEvent = { ...WHITE_VOTE_MEMBER, eventId: eventIdObjectId, _id: new ObjectId(WHITE_VOTE_ID) };
          contestants.push(whiteVoteMemberForEvent);
        }
        return { ...role, contestants };
      })
    );
    
    round.eventId = eventIdObjectId; // Ensure eventId is set from token
    console.log(`⏬ Adding Round to db for event ${eventIdObjectId}...`, JSON.stringify(round, null, 2));
    const roundResult = await db.addRound(round);

    res.json({ ok: true, id: roundResult.insertedId });
  } catch (error) {
    console.error(`❌ Error adding round for event ${eventIdObjectId}:`, error);
    // If error is due to contestant not found, a more specific message might be good.
    if (error.message.includes('Contestant with ID')) {
        return res.status(400).json({ ok: false, message: error.message });
    }
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

// This route does not need eventId from token as it's for general active events
router.get('/active-events', async (req: Request, res: Response) => {
  try {
    console.log('⏬ Getting active election events...');
    const activeEvents: Array<WithId<ElectionEvent>> = await db.getAllActiveElectionEvents();
    return res.json(activeEvents);
  } catch (error) {
    console.error('❌ Error getting active election events:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.put('/updateRound', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const { roundId, round } = req.body as { roundId: string; round: Partial<Round> };

  if (!roundId) {
    console.log(`❌ Round ID is null or undefined for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round ID is missing' });
  }

  if (!round || Object.keys(round).length === 0) {
    console.log(`❌ Round update object is empty for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'No changes provided' });
  }
  // Prevent eventId from being updated if present in partial
  if (round.eventId) delete round.eventId;


  console.log(`⏬ Updating Round ${roundId} for event ${eventIdObjectId}...`);
  console.log('Changes:', round);

  const roundResult = await db.updateRound({ _id: new ObjectId(roundId) }, round, eventIdObjectId);

  if (!roundResult.acknowledged || roundResult.matchedCount === 0) {
    console.log(`❌ Could not update Round ${roundId} for event ${eventIdObjectId}`);
    return res.status(500).json({ ok: false, message: 'Could not update round or round not found for the event' });
  }

  res.json({ ok: true });
});

router.delete('/deleteRound', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const { roundId } = req.body as { roundId: string };
  if (!roundId) {
    console.log(`❌ Round ID is null or undefined for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round ID is missing' });
  }
  console.log(`⏬ Deleting Round ${roundId} for event ${eventIdObjectId}...`);

  const roundResult = await db.deleteRound({ _id: new ObjectId(roundId) }, eventIdObjectId);
  if (!roundResult.acknowledged || roundResult.deletedCount === 0) {
    console.log(`❌ Could not delete Round ${roundId} for event ${eventIdObjectId}`);
    return res.status(500).json({ ok: false, message: 'Could not delete round or round not found for the event' });
  }

  res.json({ ok: true });
});

router.get('/members', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  console.log(`⏬ Getting members for event ${eventIdObjectId}...`);
  return res.json(await db.getMembers({}, eventIdObjectId));
});

router.put('/members', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const { members } = req.body as { members: Member[] };

  if (!members || members.length === 0) {
    console.log(`❌ Members array is empty for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'No members provided' });
  }

  console.log(`⏬ Updating Members for event ${eventIdObjectId}...`);
  
  for (const member of members) {
    if (member.eventId?.toString() !== eventIdObjectId.toString()) {
      console.log(`❌ Member eventId ${member.eventId} does not match token eventId ${eventIdObjectId}`);
      return res.status(400).json({ ok: false, message: `Member ${member.name} eventId mismatch` });
    }
    member.eventId = eventIdObjectId; // Ensure eventId is set correctly
  }

  // Delete members specific to this event
  const deleteRes = await db.deleteMembers({}, eventIdObjectId);
  if (!deleteRes.acknowledged) {
    console.log(`❌ Could not delete members for event ${eventIdObjectId}`);
    // Not necessarily a 500, could be that no members existed for the event
  }

  const membersWithEventId = members.map(member => ({ ...member, _id: undefined, eventId: eventIdObjectId }));
  const addRes = await db.addMembers(membersWithEventId);

  if (!addRes.acknowledged) {
    console.log(`❌ Could not add members for event ${eventIdObjectId}`);
    return res.status(500).json({ ok: false, message: 'Could not add members' });
  }

  console.log(`⏬ Members updated for event ${eventIdObjectId}!`);
  res.json({ ok: true });
});

router.put('/members/:memberId/presence', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const { memberId } = req.params;
  const { isPresent } = req.body as { isPresent: boolean };

  if (!memberId) {
    console.log(`❌ Member ID is null or undefined for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Member ID is missing' });
  }

  if (typeof isPresent !== 'boolean') {
    console.log(`❌ isPresent is missing or not a boolean for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'isPresent field (boolean) is required' });
  }

  console.log(`⏬ Updating presence for member ${memberId} to ${isPresent} in event ${eventIdObjectId}`);

  try {
    const memberResult = await db.updateMember({ _id: new ObjectId(memberId) }, { isPresent }, eventIdObjectId);

    if (!memberResult.acknowledged || memberResult.matchedCount === 0) {
      console.log(
        `❌ Could not update presence for member ${memberId} in event ${eventIdObjectId}. Member not found or update failed.`
      );
      return res.status(404).json({
        ok: false,
        message: 'Could not update member presence. Member not found for the event or update failed.'
      });
    }

    console.log(`✅ Presence updated for member ${memberId} in event ${eventIdObjectId}`);
    res.json({ ok: true });
  } catch (error) {
    console.error(`❌ Error updating member presence for event ${eventIdObjectId}:`, error);
    return res
      .status(500)
      .json({ ok: false, message: 'Internal server error while updating member presence' });
  }
});

router.get('/state', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  console.log(`⏬ Getting Election state for event ${eventIdObjectId}`);
  try {
    const eventState = await db.getEventState(eventIdObjectId);
    res.json(eventState);
  } catch (error) {
    console.error(`❌ Error getting election state for event ${eventIdObjectId}:`, error);
    res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.put('/state', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const body: Partial<ElectionState> = { ...req.body };
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ ok: false, message: 'Request body is empty or missing' });
  }
  
  // Ensure eventId from body (if present) is not overriding token's eventId
  if (body.eventId) delete body.eventId;

  console.log(`⏬ Updating Election state for event ${eventIdObjectId}`);
  try {
    const task = await db.updateEventState(eventIdObjectId, body, true); // Upsert true
    if (task.acknowledged) {
      console.log(`✅ Election state updated for event ${eventIdObjectId}!`);
      return res.json({ ok: true, id: task.upsertedId || eventIdObjectId }); // If upsertedId is null, it means existing was updated
    } else {
      console.log(`❌ Could not update Election state for event ${eventIdObjectId}`);
      return res.status(500).json({ ok: false, message: 'Failed to update election state' });
    }
  } catch (error) {
    console.error(`❌ Error updating election state for event ${eventIdObjectId}:`, error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.post('/vote', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const { roundId, memberId, votes, votingStandId, signature } = req.body;

  if (!roundId || !memberId || !votes || votingStandId === undefined || signature === undefined) {
    console.log(`❌ Missing required vote data for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Missing required vote data' });
  }

  try {
    const roundObjectId = new ObjectId(roundId);
    const memberObjectId = new ObjectId(memberId);

    const round = await db.getRound({ _id: roundObjectId }, eventIdObjectId);
    if (!round) {
      console.log(`❌ Round with ID ${roundId} not found for event ${eventIdObjectId}`);
      return res.status(404).json({ ok: false, message: 'Round not found for this event' });
    }

    // Assuming members are also event-scoped
    const member = await db.getMember({ _id: memberObjectId }, eventIdObjectId);
    if (!member) {
      console.log(`❌ Member with ID ${memberId} not found for event ${eventIdObjectId}`);
      return res.status(404).json({ ok: false, message: 'Member not found for this event' });
    }

    // isRoundLocked, hasMemberVoted should implicitly use eventId via round object or explicit param
    const isLocked = await db.isRoundLocked(roundId); // This function might need eventId too if rounds aren't unique across events
    if (isLocked) {
      console.log(`❌ Round ${roundId} is locked for event ${eventIdObjectId}`);
      return res.status(400).json({ ok: false, message: 'Round is locked' });
    }

    const hasVoted = await db.hasMemberVoted(roundId, memberId, eventIdObjectId);
    if (hasVoted) {
      console.log(`❌ Member has already voted in this round for event ${eventIdObjectId}`);
      return res.status(400).json({ ok: false, message: 'Member has already voted' });
    }

    console.log(`⏬ Processing vote for ${member.name} in round - ${round.name} for event ${eventIdObjectId}`);

    const votePromises = Object.entries(votes).map(async ([role, contestantIds]) => {
      if (Array.isArray(contestantIds)) {
        return Promise.all(
          contestantIds.map(async (contestantIdString: string) => {
            console.log(`⏬ Processing vote for role ${role} and contestant ID ${contestantIdString} in event ${eventIdObjectId}`);
            
            const contestantObjectId = new ObjectId(contestantIdString);
            const contestant =
              contestantIdString === WHITE_VOTE_ID
                ? { ...WHITE_VOTE_MEMBER, eventId: eventIdObjectId, _id: new ObjectId(WHITE_VOTE_ID) } // Ensure white vote is event-scoped if necessary
                : await db.getMember({ _id: contestantObjectId }, eventIdObjectId);

            if (!contestant) {
              console.log(`❌ Contestant with ID ${contestantIdString} not found in event ${eventIdObjectId}`);
              throw new Error(`Contestant with ID ${contestantIdString} not found in this event.`);
            }

            const votePayload: Vote = {
              eventId: eventIdObjectId,
              round: roundObjectId,
              role: role as Positions,
              contestant: contestantObjectId
            };

            console.log('Vote:', JSON.stringify(votePayload));
            return db.addVote(votePayload);
          })
        );
      }
      return [];
    });

    await Promise.all((await Promise.all(votePromises)).flat());
    await db.markMemberVoted(roundId, memberId, signature, eventIdObjectId);

    console.log(`✅ Votes recorded successfully for event ${eventIdObjectId}`);
    return res.json({ ok: true });
  } catch (error) {
    console.error(`❌ Error processing vote for event ${eventIdObjectId}:`, error);
    if (error.message.startsWith('Contestant with ID')) {
        return res.status(404).json({ ok: false, message: error.message });
    }
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.get('/votedMembers/:roundId', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const { roundId } = req.params;
  if (!roundId) {
    console.log(`❌ Round ID is null or undefined for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round ID is missing' });
  }
  console.log(`⏬ Getting voted members for round ${roundId} in event ${eventIdObjectId}`);
  // First, ensure the round belongs to the event
  const round = await db.getRound({ _id: new ObjectId(roundId) }, eventIdObjectId);
    if (!round) {
      console.log(`❌ Round ${roundId} not found for event ${eventIdObjectId}`);
      return res.status(404).json({ ok: false, message: 'Round not found for this event' });
    }

  const votedMembers = await db.getVotedMembers(roundId, eventIdObjectId);
  // getVotedMembers already filters by eventId, so no further check needed for its direct output
  res.json({ ok: true, votedMembers });
});


router.post('/lockRound/:roundId', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const { roundId } = req.params;
  if (!roundId) {
    console.log(`❌ Round ID is null or undefined for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round ID is missing' });
  }

  try {
    const roundObjectId = new ObjectId(roundId);
    const round = await db.getRound({ _id: roundObjectId }, eventIdObjectId);
    if (!round) {
      console.log(`❌ Round ${roundId} not found for event ${eventIdObjectId}`);
      return res.status(404).json({ ok: false, message: 'Round not found for this event' });
    }

    if (round.isLocked) {
      console.log(`❌ Round ${roundId} is already locked for event ${eventIdObjectId}`);
      return res.status(400).json({ ok: false, message: 'Round is already locked' });
    }

    await db.lockRound(roundId); // lockRound itself doesn't need eventId as it operates on unique roundId
    console.log(`✅ Round ${roundId} locked successfully for event ${eventIdObjectId}`);
    return res.json({ ok: true });
  } catch (error) {
    console.error(`❌ Error locking round ${roundId} for event ${eventIdObjectId}:`, error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.get('/roundStatus/:roundId', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const { roundId } = req.params;
  if (!roundId) {
    console.log(`❌ Round ID is null or undefined for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round ID is missing' });
  }

  try {
    const roundObjectId = new ObjectId(roundId);
    const round = await db.getRound({ _id: roundObjectId }, eventIdObjectId);
    if (!round) {
      console.log(`❌ Round ${roundId} not found for event ${eventIdObjectId}`);
      return res.status(404).json({ ok: false, message: 'Round not found for this event' });
    }
    
    // isRoundLocked operates on roundId, which we've now confirmed belongs to the event.
    const isLocked = await db.isRoundLocked(roundId); 
    console.log(`✅ Round ${roundId} lock status retrieved for event ${eventIdObjectId}`);
    return res.json({ ok: true, isLocked });
  } catch (error) {
    console.error(`❌ Error getting round status for ${roundId} in event ${eventIdObjectId}:`, error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.get('/roundResults/:roundId', async (req: Request, res: Response) => {
  const eventIdObjectId = getEventIdFromRequest(req, res);
  if (!eventIdObjectId) return;

  const { roundId } = req.params;
  if (!roundId) {
    console.log(`❌ Round ID is null or undefined for event ${eventIdObjectId}`);
    return res.status(400).json({ ok: false, message: 'Round ID is missing' });
  }

  try {
    const roundObjectId = new ObjectId(roundId);
    const round = await db.getRound({ _id: roundObjectId }, eventIdObjectId);
    if (!round) {
      console.log(`❌ Round ${roundId} not found for event ${eventIdObjectId}`);
      return res.status(404).json({ ok: false, message: 'Round not found for this event' });
    }

    if (!round.isLocked) {
      console.log(`❌ Cannot view results for unlocked round ${roundId} in event ${eventIdObjectId}`);
      return res.status(400).json({ ok: false, message: 'Round must be locked to view results' });
    }

    // getRoundResults operates on roundId, which we've now confirmed belongs to the event.
    const results = await db.getRoundResults(roundId); 
    if (!results) { // Should not happen if round was found and locked, but good check
      console.log(`❌ Results for Round ${roundId} not found in event ${eventIdObjectId}`);
      return res.status(404).json({ ok: false, message: 'Round results not found' });
    }

    console.log(`✅ Round ${roundId} results retrieved for event ${eventIdObjectId}`);
    return res.json({ ok: true, results });
  } catch (error) {
    console.error(`❌ Error getting round results for ${roundId} in event ${eventIdObjectId}:`, error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

export default router;
