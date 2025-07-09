import express from 'express';
import roundsRouter from './rounds';
import membersRouter from './members';
import stateRouter from './state';
import voteRouter from './vote';
import mmMembersRouter from './mm-members';
import exportRouter from './export';

const router = express.Router({ mergeParams: true });

router.use('/rounds', roundsRouter);
router.use('/members', membersRouter);
router.use('/mm-members', mmMembersRouter);
router.use('/state', stateRouter);
router.use('/vote', voteRouter);
router.use('/export', exportRouter);

export default router;
