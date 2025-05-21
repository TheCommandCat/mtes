import * as db from '@mtes/database';

export const cleanDivisionData = async () => {
  if (!(await db.deleteElectionEvent())) throw new Error('Could not delete event!');
  if (!(await db.deleteUsers({})).acknowledged) throw new Error('Could not delete users!');
  const result = await db.addUser({
    username: 'admin',
    isAdmin: true,
    password: 'admin',
    lastPasswordSetDate: new Date()
  });
  if (!result.acknowledged) {
    throw new Error('Could not add admin user!');
  }
  if (!(await db.deleteElectionState()).acknowledged) {
    throw new Error('Could not delete Election state!');
  }

  if (!(await db.deleteMembers({})).acknowledged) throw new Error('Could not delete members!');
  if (!(await db.deleteContestants()).acknowledged) throw new Error('Could not delete contestant!');
};
