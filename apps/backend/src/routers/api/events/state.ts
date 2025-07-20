import express, { Request, Response } from 'express';
import * as db from '@mtes/database';
import { ElectionState } from '@mtes/types';
import { ObjectId } from 'mongodb';

const router = express.Router({ mergeParams: true });

router.get('/', (req: Request, res: Response) => {

    const eventId = req.params.eventId;
    if (!eventId) {
        console.log('❌ Event ID is null or undefined');
        return res.status(400).json({ ok: false, message: 'Event ID is missing' });
    }

    console.log(`⏬ Getting Election state`);
    db.getElectionState({
        eventId: new ObjectId(eventId)
    }).then(divisionState => res.json(divisionState));
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
