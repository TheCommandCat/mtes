import * as db from '@mtes/database';
import { ObjectId } from 'mongodb';

export const cleanEventTransactionalData = async (eventId: ObjectId) => {
  // Fetch all rounds for the event
  const rounds = await db.getRounds({}, eventId); // Assumes getRounds is updated for eventId

  // For each round, delete its votes and voting statuses
  for (const round of rounds) {
    // Ensure deleteRoundVotes is updated to use eventId internally for both collections
    await db.deleteRoundVotes(round._id.toString(), eventId); 
  }

  // Delete all Round documents for the event
  const deleteRoundsResult = await db.deleteRounds(eventId);
  if (!deleteRoundsResult.acknowledged) {
    console.warn(`Warning: deleteRounds for event ${eventId} was not acknowledged.`);
    // Depending on strictness, you might throw an error here
    // throw new Error(`Could not delete rounds for event ${eventId}`);
  }

  // Delete all Member documents for the event
  const deleteMembersResult = await db.deleteMembers({}, eventId); // Assumes deleteMembers is updated for eventId
  if (!deleteMembersResult.acknowledged) {
    console.warn(`Warning: deleteMembers for event ${eventId} was not acknowledged.`);
    // throw new Error(`Could not delete members for event ${eventId}`);
  }
  
  // Delete the ElectionState document for the event
  const deleteEventStateResult = await db.deleteEventState(eventId); // Assumes deleteEventState is updated for eventId
  if (!deleteEventStateResult.acknowledged) {
    console.warn(`Warning: deleteEventState for event ${eventId} was not acknowledged.`);
    // throw new Error(`Could not delete event state for event ${eventId}`);
  }

  console.log(`Successfully cleaned transactional data for event ${eventId}`);
};
