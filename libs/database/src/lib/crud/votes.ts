import { Filter } from 'mongodb';
import { Vote } from '@mtes/types';
import db from '../database';

// Get multiple vote documents based on a filter (e.g., results for a round/role)
export const getVotes = (filter: Filter<Vote>) => {
  return db.collection<Vote>('votes').find(filter).toArray();
};

// Add a single vote document
export const addVote = (vote: Vote) => {
  return db.collection<Vote>('votes').insertOne(vote);
};

// Add multiple vote documents
export const addVotes = (votes: Vote[]) => {
  return db.collection<Vote>('votes').insertMany(votes);
};
