import express, { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import * as db from '@mtes/database';
import { Member } from '@mtes/types';

const router = express.Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response) => {
    console.log('⏬ Getting members...');
    return res.json(await db.getMembers({
        eventId: new ObjectId(req.params.eventId)
    }));
});

router.put('/', async (req: Request, res: Response) => {
    const eventId = req.params.eventId;
    if (!eventId) {
        console.log('❌ Event ID is null or undefined');
        return res.status(400).json({ ok: false, message: 'Event ID is missing' });
    }

    const { members } = req.body as { members: Member[] };
    if (!members || members.length === 0) {
        console.log('❌ Members array is empty');
        res.status(400).json({ ok: false, message: 'No members provided' });
        return;
    }

    console.log('⏬ Updating Members...');

    const deleteRes = await db.deleteMembers({
        eventId: new ObjectId(eventId)
    });
    if (!deleteRes.acknowledged) {
        console.log('❌ Could not delete members');
        res.status(500).json({ ok: false, message: 'Could not delete members' });
        return;
    }

    const addRes = await db.addMembers(members.map(member => ({ ...member, eventId: new ObjectId(eventId) })));
    if (!addRes.acknowledged) {
        console.log('❌ Could not add members');
        res.status(500).json({ ok: false, message: 'Could not add members' });
        return;
    }

    console.log('⏬ Members updated!');
    res.json({ ok: true });
});

router.put('/:memberId/presence', async (req: Request, res: Response) => {
    const { memberId } = req.params;
    const { isPresent, replacedBy } = req.body as { isPresent: boolean; replacedBy?: WithId<Member> };

    if (!memberId) {
        console.log('❌ Member ID is null or undefined');
        return res.status(400).json({ ok: false, message: 'Member ID is missing' });
    }

    if (typeof isPresent !== 'boolean' && replacedBy === undefined) {
        console.log('❌ isPresent is missing or not a boolean, and replacedBy is not provided');
        return res.status(400).json({ ok: false, message: 'isPresent field (boolean) or replacedBy field (string) is required' });
    }

    if (replacedBy && (typeof replacedBy !== 'object')) {
        console.log('❌ replacedBy is not a WithId<Member>');
        return res.status(400).json({ ok: false, message: 'replacedBy field must be a WithId<Member>' });
    }

    let updatePayload: { isPresent: boolean; replacedBy: WithId<Member> | null } = { isPresent, replacedBy: null };


    if (replacedBy) {
        console.log(`⏬ Member ${memberId} is being replaced by ${replacedBy._id}. Setting isPresent to true.`);
        updatePayload = { isPresent: true, replacedBy: replacedBy as WithId<Member> };
    } else {
        console.log(`⏬ Updating presence for member ${memberId} to ${isPresent}`);
        updatePayload = { isPresent, replacedBy: null };
    }


    try {
        const memberResult = await db.updateMember({ _id: new ObjectId(memberId) }, updatePayload as unknown as Partial<Member>);

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

export default router;
