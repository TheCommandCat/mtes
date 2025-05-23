import express, { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import * as db from '@mtes/database';
import { ElectionState, Member, Positions, Round } from '@mtes/types';

const router = express.Router({ mergeParams: true });

const WHITE_VOTE_ID = '000000000000000000000000';
const WHITE_VOTE_MEMBER: WithId<Member> = {
  _id: new ObjectId(WHITE_VOTE_ID),
  name: 'פתק לבן',
  city: 'אין אמון באף אחד'
};

router.get('/rounds', async (req: Request, res: Response) => {
  console.log('⏬ Getting rounds...');
  return res.json(await db.getRounds({}));
});

router.post('/addRound', async (req: Request, res: Response) => {
  const { round } = req.body;

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
      round.allowedMembers.map(async member => {
        const dbMember = await db.getMember({ _id: new ObjectId(member) });
        if (!dbMember) {
          console.log(`❌ Member with ID ${member._id} not found`);
          return null;
        }
        return dbMember;
      })
    );

    round.roles = await Promise.all(
      round.roles.map(async role => {
        const contestants = await Promise.all(
          role.contestants.map(async contestant => {
            const dbContestant = await db.getMember({ _id: new ObjectId(contestant) });
            if (!dbContestant) {
              console.log(`❌ Contestant with ID ${contestant} in role ${role.role} not found`);
              return res.status(400).json({
                ok: false,
                message: `Contestant with ID ${contestant} in role ${role.role} not found`
              });
            }
            return dbContestant;
          })
        );
        // check if there is white vote
        if (role.whiteVote) {
          contestants.push(WHITE_VOTE_MEMBER);
        }
        return { ...role, contestants };
      })
    );

    console.log('⏬ Adding Round to db...', JSON.stringify(round, null, 2));
    const roundResult = await db.addRound(round);

    res.json({ ok: true, id: roundResult.insertedId });
  } catch (error) {
    console.error('❌ Error adding round:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.put('/updateRound', async (req: Request, res: Response) => {
  const { roundId, round } = req.body as { roundId: string; round: Partial<Round> };

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

  console.log('⏬ Updating Round...');
  console.log('Changes:', round);

  const roundResult = await db.updateRound({ _id: new ObjectId(roundId) }, round);

  if (!roundResult.acknowledged) {
    console.log(`❌ Could not update Round`);
    res.status(500).json({ ok: false, message: 'Could not update round' });
    return;
  }

  res.json({ ok: true });
});

router.delete('/deleteRound', async (req: Request, res: Response) => {
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

router.get('/members', async (req: Request, res: Response) => {
  console.log('⏬ Getting members...');

  return res.json(await db.getMembers({}));
});

router.put('/members', async (req: Request, res: Response) => {
  const { members } = req.body as { members: Member[] };

  if (!members || members.length === 0) {
    console.log('❌ Members array is empty');
    res.status(400).json({ ok: false, message: 'No members provided' });
    return;
  }

  console.log('⏬ Updating Members...');

  const deleteRes = await db.deleteMembers({});
  if (!deleteRes.acknowledged) {
    console.log('❌ Could not delete members');
    res.status(500).json({ ok: false, message: 'Could not delete members' });
    return;
  }

  const addRes = await db.addMembers(members.map(member => ({ ...member, _id: undefined })));
  if (!addRes.acknowledged) {
    console.log('❌ Could not add members');
    res.status(500).json({ ok: false, message: 'Could not add members' });
    return;
  }

  console.log('⏬ Members updated!');

  res.json({ ok: true });
});

router.put('/members/:memberId/presence', async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const { isPresent } = req.body as { isPresent: boolean };

  if (!memberId) {
    console.log('❌ Member ID is null or undefined');
    return res.status(400).json({ ok: false, message: 'Member ID is missing' });
  }

  if (typeof isPresent !== 'boolean') {
    console.log('❌ isPresent is missing or not a boolean');
    return res.status(400).json({ ok: false, message: 'isPresent field (boolean) is required' });
  }

  console.log(`⏬ Updating presence for member ${memberId} to ${isPresent}`);

  try {
    const memberResult = await db.updateMember({ _id: new ObjectId(memberId) }, { isPresent });

    if (!memberResult.acknowledged || memberResult.matchedCount === 0) {
      console.log(
        `❌ Could not update presence for member ${memberId}. Member not found or update failed.`
      );
      return res.status(404).json({
        ok: false,
        message: 'Could not update member presence. Member not found or update failed.'
      });
    }

    console.log(`✅ Presence updated for member ${memberId}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ Error updating member presence:', error);
    return res
      .status(500)
      .json({ ok: false, message: 'Internal server error while updating member presence' });
  }
});

router.get('/state', (req: Request, res: Response) => {
  console.log(`⏬ Getting Election state`);
  db.getElectionState().then(divisionState => res.json(divisionState));
});

router.put('/state', (req: Request, res: Response) => {
  const body: Partial<ElectionState> = { ...req.body };
  if (!body) return res.status(400).json({ ok: false });

  console.log(`⏬ Updating Election state`);
  db.updateElectionState(body).then(task => {
    if (task.acknowledged) {
      console.log('✅ Election state updated!');
      return res.json({ ok: true, id: task.upsertedId });
    } else {
      console.log('❌ Could not update Election state');
      return res.status(500).json({ ok: false });
    }
  });
});

router.post('/vote', async (req: Request, res: Response) => {
  const { roundId, memberId, votes, votingStandId, signature } = req.body;

  if (!roundId || !memberId || !votes || votingStandId === undefined || signature === undefined) {
    console.log('❌ Missing required vote data');
    return res.status(400).json({ ok: false, message: 'Missing required vote data' });
  }

  try {
    const round = await db.getRound({ _id: new ObjectId(roundId) });
    const member = await db.getMember({ _id: new ObjectId(memberId) });

    if (!round) {
      console.log(`❌ Round with ID ${roundId} not found`);
      return res.status(404).json({ ok: false, message: 'Round not found' });
    }

    if (!member) {
      console.log(`❌ Member with ID ${memberId} not found`);
      return res.status(404).json({ ok: false, message: 'Member not found' });
    }

    const isLocked = await db.isRoundLocked(roundId);
    if (isLocked) {
      console.log(`❌ Round ${roundId} is locked`);
      return res.status(400).json({ ok: false, message: 'Round is locked' });
    }

    const hasMemberVoted = await db.hasMemberVoted(round._id.toString(), member._id.toString());
    if (hasMemberVoted) {
      console.log(`❌ Member has already voted in this round`);
      return res.status(400).json({ ok: false, message: 'Member has already voted' });
    }

    console.log(`⏬ Processing vote for ${member.name} in round - ${round.name}`);

    const votePromises = Object.entries(votes).map(async ([role, contestantIds]) => {
      if (Array.isArray(contestantIds)) {
        return Promise.all(
          contestantIds.map(async contestantId => {
            console.log(`⏬ Processing vote for role ${role} and contestant ID ${contestantId}`);

            const contestant =
              contestantId === WHITE_VOTE_ID
                ? WHITE_VOTE_MEMBER
                : await db.getMember({ _id: new ObjectId(contestantId) });

            if (!contestant) {
              console.log(`❌ Contestant with ID ${contestantId} not found`);
              return null;
            }

            const vote = {
              round: round._id,
              role: role as Positions,
              contestant: contestant._id
            };

            console.log('Vote:', JSON.stringify(vote));

            return db.addVote(vote);
          })
        );
      }
      return [];
    });

    await Promise.all(votePromises);
    await db.markMemberVoted(round._id.toString(), member._id.toString(), signature);

    console.log('✅ Votes recorded successfully');
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ Error processing vote:', error);
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

router.post('/lockRound/:roundId', async (req: Request, res: Response) => {
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

    await db.lockRound(roundId);
    console.log(`✅ Round ${roundId} locked successfully`);
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ Error locking round:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

router.get('/roundStatus/:roundId', async (req: Request, res: Response) => {
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

router.get('/roundResults/:roundId', async (req: Request, res: Response) => {
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

export default router;
