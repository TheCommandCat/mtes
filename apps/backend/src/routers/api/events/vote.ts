import express, { Request, Response } from 'express';
import { ObjectId, WithId } from 'mongodb';
import * as db from '@mtes/database';
import { Member, Positions } from '@mtes/types';

const router = express.Router({ mergeParams: true });

const getWhiteVoteMember = (id: string, eventId?: string): WithId<Member> => {
    return {
        _id: new ObjectId(id),
        eventId: eventId ? new ObjectId(eventId) : new ObjectId(), // Provide eventId or fallback
        name: `פתק לבן ${Number(id)}`,
        city: 'אין אמון באף אחד',
        isPresent: true,
        isMM: false,
    };
}

router.post('/', async (req: Request, res: Response) => {
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
                    contestantIds.map(async (contestantId: string) => {
                        console.log(`⏬ Processing vote for role ${role} and contestant ID ${contestantId}`);
                        const contestant =
                            contestantId.startsWith('00000000000000000000') // 20 times '0' for white vote as a white vote id is 24(last 4 characters are for id)
                                ? getWhiteVoteMember(contestantId, round?.eventId?.toString())
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
            return []; // Ensure a promise is always returned
        });

        await Promise.all(votePromises.flat()); // flat might be needed if inner promises are nested
        await db.markMemberVoted(round._id.toString(), member._id.toString(), signature);

        console.log('✅ Votes recorded successfully');
        return res.json({ ok: true });
    } catch (error) {
        console.error('❌ Error processing vote:', error);
        return res.status(500).json({ ok: false, message: 'Internal server error' });
    }
});

export default router;
