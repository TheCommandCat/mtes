import express, { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import * as db from '@mtes/database';
import { Member, Round } from '@mtes/types';

const router = express.Router({ mergeParams: true });

const genrateWhireVoteMembers = (numWhiteVotes: number, eventId: ObjectId): WithId<Member>[] => {
  const whiteVotes: WithId<Member>[] = [];
  for (let i = 0; i < numWhiteVotes; i++) {
    whiteVotes.push({
      _id: new ObjectId(`00000000000000000000000${i + 1}`),
      eventId: eventId,
      name: `פתק לבן ${i + 1}`,
      city: 'אין אמון באף אחד',
      isPresent: true,
      isMM: false
    });
  }
  return whiteVotes;
};
router.get('/', async (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  if (!eventId) {
    console.log('❌ Event ID is null or undefined');
    return res.status(400).json({ ok: false, message: 'Event ID is missing' });
  }

  console.log('⏬ Getting rounds...');
  return res.json(
    await db.getRounds({
      eventId: new ObjectId(eventId)
    })
  );
});

router.post('/add', async (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  if (!eventId) {
    console.log('❌ Event ID is null or undefined');
    return res.status(400).json({ ok: false, message: 'Event ID is missing' });
  }

  const { round } = req.body;
  round.eventId = new ObjectId(eventId);

  console.log('⏬ Adding Round...', JSON.stringify(round, null, 2));

  if (!round) {
    console.log('❌ Round object is null or undefined');
    return res.status(400).json({ ok: false, message: 'Round object is missing' });
  }
  if (!round.name) {
    console.log('❌ Round name is missing or empty');
    return res.status(400).json({ ok: false, message: 'Round name is required' });
  }
  if (!round.roles) {
    console.log('❌ Round roles are missing');
    return res.status(400).json({ ok: false, message: 'Round roles must be specified' });
  }
  if (!round.allowedMembers) {
    console.log('❌ Round allowedMembers is missing');
    return res.status(400).json({ ok: false, message: 'Round allowed members must be specified' });
  }

  try {
    round.allowedMembers = await Promise.all(
      round.allowedMembers.map(async (member: string | { _id: string }) => {
        const memberId = typeof member === 'string' ? member : member._id;
        const dbMember = await db.getMember({ _id: new ObjectId(memberId) });
        if (!dbMember) {
          console.log(`❌ Member with ID ${memberId} not found`);
          // Decide how to handle this: throw error, return null and filter later, or return error response
          throw new Error(`Member with ID ${memberId} not found`);
        }
        return dbMember;
      })
    );

    round.roles = await Promise.all(
      round.roles.map(async (role: any) => {
        const contestants = await Promise.all(
          role.contestants.map(async (contestant: string | { _id: string }) => {
            const contestantId = typeof contestant === 'string' ? contestant : contestant._id;
            const dbContestant = await db.getMember({ _id: new ObjectId(contestantId) });
            if (!dbContestant) {
              console.log(`❌ Contestant with ID ${contestantId} in role ${role.role} not found`);
              throw new Error(`Contestant with ID ${contestantId} in role ${role.role} not found`);
            }
            return dbContestant;
          })
        );
        if (role.numWhiteVotes > 0) {
          contestants.push(...genrateWhireVoteMembers(role.numWhiteVotes, round.eventId));
        }
        return { ...role, contestants };
      })
    );

    console.log('⏬ Adding Round to db...', JSON.stringify(round, null, 2));
    const roundResult = await db.addRound(round);

    res.json({ ok: true, id: roundResult.insertedId });
  } catch (error: any) {
    console.error('❌ Error adding round:', error);
    return res
      .status(error.message.includes('not found') ? 400 : 500)
      .json({ ok: false, message: error.message || 'Internal server error' });
  }
});

// Type for the update request body - uses string IDs instead of full objects
interface UpdateRoundRequest {
  name?: string;
  allowedMembers?: string[];
  roles?: {
    role: string;
    contestants: string[];
    maxVotes: number;
    numWhiteVotes: number;
    numWinners: number;
  }[];
  startTime?: Date | null;
  endTime?: Date | null;
  isLocked?: boolean;
}

router.put('/update', async (req: Request, res: Response) => {
  const { roundId, round } = req.body as { roundId: string; round: UpdateRoundRequest };

  if (!roundId) {
    console.log('❌ Round ID is null or undefined');
    res.status(400).json({ ok: false, message: 'Round ID is missing' });
    return;
  }

  if (!round || Object.keys(round).length === 0) {
    console.log('❌ Round update object is empty');
    res.status(400).json({ ok: false, message: 'No changes provided' });
    return;
  }

  try {
    // Check if the round exists and hasn't started yet
    const existingRound = await db.getRound({ _id: new ObjectId(roundId) });
    if (!existingRound) {
      console.log(`❌ Round with ID ${roundId} not found`);
      return res.status(404).json({ ok: false, message: 'Round not found' });
    }

    // Prevent editing rounds that have already started
    if (existingRound.startTime) {
      console.log(`❌ Cannot edit round ${roundId} - round has already started`);
      return res
        .status(400)
        .json({ ok: false, message: 'Cannot edit round that has already started' });
    }

    // Prevent editing locked rounds
    if (existingRound.isLocked) {
      console.log(`❌ Cannot edit round ${roundId} - round is locked`);
      return res.status(400).json({ ok: false, message: 'Cannot edit locked round' });
    }

    // Check if round has any votes (active voting has occurred)
    const votedMembers = await db.getVotedMembers(roundId);
    if (votedMembers && votedMembers.length > 0) {
      console.log(`❌ Cannot edit round ${roundId} - round has active votes`);
      return res
        .status(400)
        .json({ ok: false, message: 'Cannot edit round that has active votes' });
    }

    console.log('⏬ Updating Round...');
    console.log('Changes:', round);

    // Create the processed round object for database update
    const processedRound: Partial<Round> = {};

    // Copy simple fields
    if (round.name !== undefined) processedRound.name = round.name;
    if (round.startTime !== undefined) processedRound.startTime = round.startTime;
    if (round.endTime !== undefined) processedRound.endTime = round.endTime;
    if (round.isLocked !== undefined) processedRound.isLocked = round.isLocked;

    // Process allowedMembers if they are being updated
    if (round.allowedMembers) {
      processedRound.allowedMembers = await Promise.all(
        round.allowedMembers.map(async (memberId: string) => {
          const dbMember = await db.getMember({ _id: new ObjectId(memberId) });
          if (!dbMember) {
            console.log(`❌ Member with ID ${memberId} not found`);
            throw new Error(`Member with ID ${memberId} not found`);
          }
          return dbMember;
        })
      );
    }

    // Process roles if they are being updated
    if (round.roles) {
      processedRound.roles = await Promise.all(
        round.roles.map(async (role: any) => {
          const contestants = await Promise.all(
            role.contestants.map(async (contestantId: string) => {
              const dbContestant = await db.getMember({ _id: new ObjectId(contestantId) });
              if (!dbContestant) {
                console.log(`❌ Contestant with ID ${contestantId} in role ${role.role} not found`);
                throw new Error(
                  `Contestant with ID ${contestantId} in role ${role.role} not found`
                );
              }
              return dbContestant;
            })
          );
          if (role.numWhiteVotes > 0) {
            contestants.push(...genrateWhireVoteMembers(role.numWhiteVotes, existingRound.eventId));
          }
          return { ...role, contestants };
        })
      );
    }

    const roundResult = await db.updateRound({ _id: new ObjectId(roundId) }, processedRound);

    if (!roundResult.acknowledged) {
      console.log(`❌ Could not update Round`);
      res.status(500).json({ ok: false, message: 'Could not update round' });
      return;
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error('❌ Error updating round:', error);
    return res.status(500).json({ ok: false, message: error.message || 'Internal server error' });
  }
});

router.delete('/delete', async (req: Request, res: Response) => {
  const { roundId } = req.body as { roundId: string };
  if (!roundId) {
    console.log('❌ Round ID is null or undefined');
    res.status(400).json({ ok: false, message: 'Round ID is missing' });
    return;
  }
  console.log('⏬ Deleting Round...');

  const roundResult = await db.deleteRound({ _id: new ObjectId(roundId) });
  if (!roundResult.acknowledged) {
    console.log(`❌ Could not delete Round`);
    res.status(500).json({ ok: false, message: 'Could not delete round' });
    return;
  }

  res.json({ ok: true });
});

router.post('/lock/:roundId', async (req: Request, res: Response) => {
  const { roundId } = req.params;

  if (!roundId) {
    console.log('❌ Round ID is null or undefined');
    res.status(400).json({ ok: false, message: 'Round ID is missing' });
    return;
  }

  try {
    const isLocked = await db.isRoundLocked(roundId);
    if (isLocked) {
      console.log(`❌ Round ${roundId} is already locked`);
      return res.status(400).json({ ok: false, message: 'Round is already locked' });
    }

    // Set both isLocked and endTime when locking a round
    await db.lockRound(roundId);
    await db.updateRound({ _id: new ObjectId(roundId) }, { endTime: new Date() });
    console.log(`✅ Round ${roundId} locked successfully`);
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ Error locking round:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.post('/unlock/:roundId', async (req: Request, res: Response) => {
  const { roundId } = req.params;

  if (!roundId) {
    console.log('❌ Round ID is null or undefined');
    res.status(400).json({ ok: false, message: 'Round ID is missing' });
    return;
  }

  try {
    const isLocked = await db.isRoundLocked(roundId);
    if (!isLocked) {
      console.log(`❌ Round ${roundId} is not locked`);
      return res.status(400).json({ ok: false, message: 'Round is not locked' });
    }

    // Unlock the round and clear endTime, but keep startTime
    await db.unlockRound(roundId);
    await db.updateRound({ _id: new ObjectId(roundId) }, { endTime: null });

    // Delete all votes for this round when unlocking
    await db.deleteRoundVotes(roundId);

    console.log(`✅ Round ${roundId} unlocked successfully`);
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ Error unlocking round:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.get('/status/:roundId', async (req: Request, res: Response) => {
  const { roundId } = req.params;

  if (!roundId) {
    console.log('❌ Round ID is null or undefined');
    res.status(400).json({ ok: false, message: 'Round ID is missing' });
    return;
  }

  try {
    const isLocked = await db.isRoundLocked(roundId);
    console.log(`✅ Round ${roundId} lock status retrieved`);
    return res.json({ ok: true, isLocked });
  } catch (error) {
    console.error('❌ Error getting round status:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.get('/results/:roundId', async (req: Request, res: Response) => {
  const { roundId } = req.params;

  if (!roundId) {
    console.log('❌ Round ID is null or undefined');
    res.status(400).json({ ok: false, message: 'Round ID is missing' });
    return;
  }

  try {
    const isLocked = await db.isRoundLocked(roundId);
    if (!isLocked) {
      console.log(`❌ Cannot view results for unlocked round ${roundId}`);
      return res.status(400).json({ ok: false, message: 'Round must be locked to view results' });
    }

    const results = await db.getRoundResults(roundId);
    if (!results) {
      console.log(`❌ Round ${roundId} not found`);
      return res.status(404).json({ ok: false, message: 'Round not found' });
    }

    console.log(`✅ Round ${roundId} results retrieved`);
    return res.json({ ok: true, results });
  } catch (error) {
    console.error('❌ Error getting round results:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.get('/votedMembers/:roundId', async (req: Request, res: Response) => {
  const { roundId } = req.params;
  if (!roundId) {
    console.log('❌ Round ID is null or undefined');
    res.status(400).json({ ok: false, message: 'Round ID is missing' });
    return;
  }
  console.log(`⏬ Getting voted members for round ${roundId}`);
  const votedMembers = await db.getVotedMembers(roundId);
  if (!votedMembers) {
    console.log(`❌ Could not get voted members`);
    res.status(500).json({ ok: false, message: 'Could not get voted members' });
    return;
  }
  res.json({ ok: true, votedMembers });
});

export default router;
