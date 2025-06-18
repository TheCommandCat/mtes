import * as db from '@mtes/database';

export const cleanDivisionData = async () => {
  if (!(await db.deleteElectionEvent())) throw new Error('Could not delete event!');
  if (!(await db.deleteUsers(
    { isAdmin: { $ne: true } }
  )).acknowledged) throw new Error('Could not delete users!');
  if (!(await db.deleteElectionState()).acknowledged) {
    throw new Error('Could not delete Election state!');
  }

  if (!(await db.deleteMembers({})).acknowledged) throw new Error('Could not delete members!');
  if (!(await db.deleteContestants()).acknowledged) throw new Error('Could not delete contestant!');
  if (!(await db.deleteRounds()).acknowledged) throw new Error('Could not delete rounds!');
  if (!(await db.deleteVotes()).acknowledged) throw new Error('Could not delete votes!');
  if (!(await db.deleteVotingStatuses()).acknowledged) throw new Error('Could not delete voting statuses!');
  if (!(await db.deleteCities()).acknowledged) throw new Error('Could not delete cities!');
};
