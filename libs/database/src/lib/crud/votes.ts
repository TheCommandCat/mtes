import { Filter, ObjectId } from 'mongodb';
import { Vote, VotingStatus } from '@mtes/types';
import db from '../database';

// Get multiple vote documents based on a filter (e.g., results for a round/role)
export const getVotes = (filter: Filter<Vote>) => {
  return db.collection<Vote>('votes').find(filter).toArray();
};

// Add a single vote document
export const addVote = (vote: Vote) => {
  return db.collection<Vote>('votes').insertOne(vote);
};

// Mark member as voted
export function markMemberVoted(roundId: string, memberId: string) {
  return db.collection<VotingStatus>('votingStatus').insertOne({
    memberId: new ObjectId(memberId),
    roundId: new ObjectId(roundId),
    votedAt: new Date()
  });
}

// Remove voting status
export function removeVotingStatus(roundId: string, memberId: string) {
  return db.collection<VotingStatus>('votingStatus').deleteOne({
    memberId: new ObjectId(memberId),
    roundId: new ObjectId(roundId)
  });
}

// Check if member has voted
export async function hasMemberVoted(roundId: string, memberId: string) {
  const status = await db.collection<VotingStatus>('votingStatus').findOne({
    memberId: new ObjectId(memberId),
    roundId: new ObjectId(roundId)
  });

  return status !== null;
}

export function getVotedMembers(roundId: string) {
  return db
    .collection<VotingStatus>('votingStatus')
    .find({ roundId: new ObjectId(roundId) })
    .toArray();
}
