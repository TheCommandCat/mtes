import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import * as db from '@mtes/database';
import { Round } from '@mtes/types';

const router = express.Router({ mergeParams: true });

// router.get('/:eventId', (req: Request, res: Response) => {
//   db.getElectionEvent({ _id: new ObjectId(req.params.eventId) }).then(event => {
//     res.json(event);
//   });
// });

router.get('/rounds', async (req: Request, res: Response) => {
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

router.get('/members', async (req: Request, res: Response) => {
  return res.json(await db.getMembers({}));
});

router.get('/:eventId/divisions', (req: Request, res: Response) => {
  db.getEventDivisions(new ObjectId(req.params.eventId)).then(divisions => {
    if (!req.query.withSchedule) {
      divisions = divisions.map(division => {
        delete division.schedule;
        return division;
      });
    }
    res.json(divisions);
  });
});

export default router;
