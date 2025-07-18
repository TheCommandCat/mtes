import * as db from '@mtes/database';
import { ObjectId } from 'mongodb';

export const cleanDivisionData = async (eventId: ObjectId) => {
  if (!(await db.deleteElectionEvent(eventId))) throw new Error('Could not delete event!');
  if (!(await db.deleteUsers(
    { _id: eventId }
  )).acknowledged) throw new Error('Could not delete users!');
  if (!(await db.deleteElectionState(eventId)).acknowledged) {
    throw new Error('Could not delete Election state!');
  }

  if (!(await db.deleteMembers({
    _id: eventId
  })).acknowledged) throw new Error('Could not delete members!');
  if (!(await db.deleteContestants({
    _id: eventId
  })).acknowledged) throw new Error('Could not delete contestant!');
  if (!(await db.deleteRounds(
    { eventId }
  )).acknowledged) throw new Error('Could not delete rounds!');
  if (!(await db.deleteVotes({
    _id: eventId
  })).acknowledged) throw new Error('Could not delete votes!');
  if (!(await db.deleteVotingStatuses({
    _id: eventId
  })).acknowledged) throw new Error('Could not delete voting statuses!');
  if (!(await db.deleteCities({
    _id: eventId
  })).acknowledged) throw new Error('Could not delete cities!');
};
