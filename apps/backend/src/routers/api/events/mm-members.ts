import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import * as db from '@mtes/database';
import { Member } from '@mtes/types';

const router = express.Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response) => {
    console.log('⏬ Getting mm-members...');
    return res.json(await db.getMmMembers({}));
});

router.put('/', async (req: Request, res: Response) => {
    const { mmMembers } = req.body as { mmMembers: Member[] };

    if (!mmMembers || mmMembers.length === 0) {
        console.log('❌ mmMembers array is empty');
        res.status(400).json({ ok: false, message: 'No mm-members provided' });
        return;
    }

    console.log('⏬ Updating mm-members...');

    const deleteRes = await db.deleteMmMembers({});
    if (!deleteRes.acknowledged) {
        console.log('❌ Could not delete mm-members');
        res.status(500).json({ ok: false, message: 'Could not delete mm-members' });
        return;
    }

    const addRes = await db.addMmMembers(mmMembers.map(member => ({ ...member, _id: undefined })));
    if (!addRes.acknowledged) {
        console.log('❌ Could not add mm-members');
        res.status(500).json({ ok: false, message: 'Could not add mm-members' });
        return;
    }

    console.log('⏬ mm-members updated!');
    res.json({ ok: true });
});

router.put('/:mmMemberId/presence', async (req: Request, res: Response) => {
    const { mmMemberId } = req.params;
    const { isPresent } = req.body as { isPresent: boolean };

    if (!mmMemberId) {
        console.log('❌ mmMember ID is null or undefined');
        return res.status(400).json({ ok: false, message: 'mmMember ID is missing' });
    }

    if (typeof isPresent !== 'boolean') {
        console.log('❌ isPresent is missing or not a boolean');
        return res.status(400).json({ ok: false, message: 'isPresent field (boolean) is required' });
    }

    console.log(`⏬ Updating presence for mm-member ${mmMemberId} to ${isPresent}`);

    try {
        const memberResult = await db.updateMmMember({ _id: new ObjectId(mmMemberId) }, { isPresent });

        if (!memberResult.acknowledged || memberResult.matchedCount === 0) {
            console.log(
                `❌ Could not update presence for mm-member ${mmMemberId}. mm-member not found or update failed.`
            );
            return res.status(404).json({
                ok: false,
                message: 'Could not update mm-member presence. mm-member not found or update failed.'
            });
        }

        console.log(`✅ Presence updated for mm-member ${mmMemberId}`);
        res.json({ ok: true });
    } catch (error) {
        console.error('❌ Error updating mm-member presence:', error);
        return res
            .status(500)
            .json({ ok: false, message: 'Internal server error while updating mm-member presence' });
    }
});

export default router;
