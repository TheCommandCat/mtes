import * as db from '@mtes/database';

export const cleanDivisionData = async () => {
  if (!(await db.deleteElectionEvent())) throw new Error('Could not delete event!');
  if (!(await db.deleteUsers({})).acknowledged) throw new Error('Could not delete users!');
  else
    db.addUser({
      username: 'admin',
      isAdmin: true,
      password: 'admin',
      lastPasswordSetDate: new Date()
    });

  //   throw new Error('Could not delete non-admin users!');

  // const oldState = await db.getState();
  // if (oldState) {
  if (!(await db.deleteState()).acknowledged) throw new Error('Could not delete division state!');
  // }

  if (!(await db.deleteMembers()).acknowledged) throw new Error('Could not delete members!');
  if (!(await db.deleteContestants()).acknowledged) throw new Error('Could not delete contestant!');
};
