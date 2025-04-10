import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import * as db from '@mtes/database';
import { ElectionState, Positions, Round } from '@mtes/types';

const router = express.Router({ mergeParams: true });

router.get('/rounds', async (req: Request, res: Response) => {
  console.log('⏬ Getting rounds...');
  return res.json(await db.getRounds({}));
});

router.post('/addRound', async (req: Request, res: Response) => {
  const { round } = req.body as { round: Round };
  if (!round) {
    console.log('❌ Round object is null or undefined');
    res.status(400).json({ ok: false, message: 'Round object is missing' });
    return;
  }
  if (!round.name) {
    console.log('❌ Round name is missing or empty');
    res.status(400).json({ ok: false, message: 'Round name is required' });
    return;
  }
  if (!round.roles) {
    console.log('❌ Round roles are missing');
    res.status(400).json({ ok: false, message: 'Round roles must be specified' });
    return;
  }
  if (!round.allowedMembers) {
    console.log('❌ Round allowedMembers is missing');
    res.status(400).json({ ok: false, message: 'Round allowed members must be specified' });
    return;
  }

  console.log('⏬ Adding Round...');
  const roundResult = await db.addRound(round);
  if (!roundResult.acknowledged) {
    console.log(`❌ Could not add Round`);
    res.status(500).json({ ok: false, message: 'Could not add round' });
    return;
  }

  res.json({ ok: true, id: roundResult.insertedId });
});

router.delete('/deleteRound', async (req: Request, res: Response) => {
  const { roundId } = req.body as { roundId: string };
  console.log(`Round ID: ${roundId}`);
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
  const { roundId, memberId, votes } = req.body;
  
  if (!roundId || !memberId || !votes) {
    console.log('❌ Missing required vote data');
    return res.status(400).json({ ok: false, message: 'Missing required vote data' });
  }

  try {
    // Get the round and member objects
    const round = await db.getRound({_id: new ObjectId(roundId)});
    const member = await db.getMember({_id: new ObjectId(memberId)});
    
    if (!round) {
      console.log(`❌ Round with ID ${roundId} not found`);
      return res.status(404).json({ ok: false, message: 'Round not found' });
    }
    
    if (!member) {
      console.log(`❌ Member with ID ${memberId} not found`);
      return res.status(404).json({ ok: false, message: 'Member not found' });
    }

    console.log(`⏬ Processing vote for ${member.name} in round ${round.name}`);
    
    // Here you would process the votes and save them to the database
    // For each role and its selected contestants in the votes object
    const votePromises = Object.entries(votes).map(async ([role, contestantIds]) => {
      // If contestantIds is an array, process each contestant
      if (Array.isArray(contestantIds)) {
        return Promise.all(contestantIds.map(async (contestantId) => {
          const contestant = await db.getMember({_id: new ObjectId(contestantId)});
          if (!contestant) {
            console.log(`❌ Contestant with ID ${contestantId} not found`);
            return null;
          }
          
          const vote = {
            round: round._id,
            role: role as Positions,
            contestant: contestant._id,
          };

          console.log('Vote:', JSON.stringify(vote));
          
          
          return db.addVote(vote);
        }));
      }
      return [];
    });
    
    await Promise.all(votePromises);
    
    console.log('✅ Votes recorded successfully');
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ Error processing vote:', error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

export default router;
