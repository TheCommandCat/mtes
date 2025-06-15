import express from 'express';
import roundsRouter from './rounds';
import membersRouter from './members';
import stateRouter from './state';
import voteRouter from './vote';

const router = express.Router({ mergeParams: true });

router.use('/rounds', roundsRouter);
router.use('/members', membersRouter);
router.use('/state', stateRouter);
router.use('/vote', voteRouter);

export default router;
