import { Filter, ObjectId } from 'mongodb';
import { Member } from '@mtes/types';
import db from '../database';

export const getMember = (filter: Filter<Member>) => {
  return db.collection<Member>('members').findOne(filter);
};

export const getMembers = (filter: Filter<Member>) => {
  return db.collection<Member>('members').find(filter).toArray();
};

export const addMember = (team: Member) => {
  return db.collection<Member>('members').insertOne(team);
};

export const addMembers = (members: Array<Member>) => {
  return db.collection<Member>('members').insertMany(members);
};

export const updateMember = (
  filter: Filter<Member>,
  newMember: Partial<Member>,
  upsert = false
) => {
  return db.collection<Member>('members').updateOne(filter, { $set: newMember }, { upsert });
};

export const deleteMember = (filter: Filter<Member>) => {
  return db.collection<Member>('members').deleteOne(filter);
};

export const deleteMembers = () => {
  return db.collection<Member>('members').deleteMany();
};
