import { Filter, ObjectId } from 'mongodb';
import { Vote, VotingStatus, Round } from '@mtes/types';
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
export function markMemberVoted(roundId: string, memberId: string, signature: object) {
  return db.collection<VotingStatus>('votingStatus').insertOne({
    memberId: new ObjectId(memberId),
    roundId: new ObjectId(roundId),
    votedAt: new Date(),
    signature: signature
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

// Get voted members for a round
export function getVotedMembers(roundId: string) {
  return db
    .collection<VotingStatus>('votingStatus')
    .find({ roundId: new ObjectId(roundId) })
    .toArray();
}

// Lock a round
export async function lockRound(roundId: string) {
  return db
    .collection<Round>('rounds')
    .updateOne({ _id: new ObjectId(roundId) }, { $set: { isLocked: true } });
}

// Unlock a round
export async function unlockRound(roundId: string) {
  return db
    .collection<Round>('rounds')
    .updateOne({ _id: new ObjectId(roundId) }, { $set: { isLocked: false } });
}

// Delete all votes for a round
export async function deleteRoundVotes(roundId: string) {
  await db.collection<Vote>('votes').deleteMany({ round: new ObjectId(roundId) });
  await db.collection<VotingStatus>('votingStatus').deleteMany({ roundId: new ObjectId(roundId) });
}

// Delete all votes
export const deleteVotes = () => {
  return db.collection<Vote>('votes').deleteMany({});
};

// Delete all voting statuses
export const deleteVotingStatuses = () => {
  return db.collection<VotingStatus>('votingStatus').deleteMany({});
};

// Check if round is locked
export async function isRoundLocked(roundId: string) {
  const round = await db.collection<Round>('rounds').findOne({ _id: new ObjectId(roundId) });
  return round?.isLocked || false;
}

// Get round results
export async function getRoundResults(roundId: string) {
  const round = await db.collection<Round>('rounds').findOne({ _id: new ObjectId(roundId) });
  if (!round) return null;

  const votes = await db
    .collection<Vote>('votes')
    .find({ round: new ObjectId(roundId) })
    .toArray();

  const results: Record<string, Array<{ contestant: any; votes: number }>> = {};

  // Initialize results object with all roles and contestants
  round.roles.forEach(role => {
    results[role.role] = role.contestants.map(contestant => ({
      contestant,
      votes: 0
    }));
  });

  // Count votes for each contestant in each role
  votes.forEach(vote => {
    const roleResults = results[vote.role];
    if (roleResults) {
      const contestantResult = roleResults.find(
        r => r.contestant._id.toString() === vote.contestant.toString()
      );
      if (contestantResult) {
        contestantResult.votes++;
      }
    }
  });

  // Sort results by vote count
  Object.keys(results).forEach(role => {
    results[role].sort((a, b) => b.votes - a.votes);
  });

  return results;
}
