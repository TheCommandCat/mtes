import express, { Request, Response } from 'express';
import * as db from '@mtes/database';
import { ElectionState } from '@mtes/types';

const router = express.Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {
    console.log(`⏬ Getting Election state`);
    db.getElectionState().then(divisionState => res.json(divisionState));
});

router.put('/', (req: Request, res: Response) => {
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

export default router;
