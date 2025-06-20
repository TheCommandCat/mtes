import express, { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import * as db from '@mtes/database';
import { Member, Round } from '@mtes/types';

const router = express.Router({ mergeParams: true });

const WHITE_VOTE_ID = '000000000000000000000000';
const WHITE_VOTE_MEMBER: WithId<Member> = {
    _id: new ObjectId(WHITE_VOTE_ID),
    name: 'פתק לבן',
    city: 'אין אמון באף אחד',
    isPresent: true,
    isMM: false,
};

router.get('/', async (req: Request, res: Response) => {
    console.log('⏬ Getting rounds...');
    return res.json(await db.getRounds({}));
});

router.post('/add', async (req: Request, res: Response) => {
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
                    contestants.push(WHITE_VOTE_MEMBER);
                }
                return { ...role, contestants };
            })
        );

        console.log('⏬ Adding Round to db...', JSON.stringify(round, null, 2));
        const roundResult = await db.addRound(round);

        res.json({ ok: true, id: roundResult.insertedId });
    } catch (error: any) {
        console.error('❌ Error adding round:', error);
        return res.status(error.message.includes('not found') ? 400 : 500).json({ ok: false, message: error.message || 'Internal server error' });
    }
});

router.put('/update', async (req: Request, res: Response) => {
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

        await db.lockRound(roundId);
        console.log(`✅ Round ${roundId} locked successfully`);
        return res.json({ ok: true });
    } catch (error) {
        console.error('❌ Error locking round:', error);
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
