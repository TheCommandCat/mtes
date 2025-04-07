import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import * as db from '@mtes/database';
import { ElectionState, Round } from '@mtes/types';

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

router.post('/vote', (req: Request, res: Response) => {
  const { vote } = req.body;
  console.log("vote data: " + JSON.stringify(vote));
  
  // if (!votes) return res.status(400).json({ ok: false });
  // console.log('⏬ Voting...');
  // console.log(votes);

});

export default router;
