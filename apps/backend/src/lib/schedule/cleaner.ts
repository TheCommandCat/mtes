import { WithId } from 'mongodb';
import * as db from '@mtes/database';
import { Division } from '@mtes/types';

export const cleanDivisionData = async (division: WithId<Division>) => {
  if (!(await db.deleteDivisionUsers(division._id)).acknowledged)
    throw new Error('Could not delete users!');

  const oldDivisionState = await db.getDivisionStateFromDivision(division._id);
  if (oldDivisionState) {
    if (!(await db.deleteDivisionState(oldDivisionState)).acknowledged)
      throw new Error('Could not delete division state!');
  }

  const oldMembers = await db.getDivisionMembers(division._id);
  const oldContestants = await db.getDivisionContestants(division._id);

  if (!(await db.deleteDivisionMembers(division._id)).acknowledged)
    throw new Error('Could not delete members!');
  if (!(await db.deleteDivisionContestants(division._id)).acknowledged)
    throw new Error('Could not delete contestant!');
};
