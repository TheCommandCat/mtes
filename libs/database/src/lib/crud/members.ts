import { Filter, ObjectId } from 'mongodb';
import { Member } from '@mtes/types';
import db from '../database';

export const getMember = (filter: Filter<Member>, eventId?: ObjectId) => {
  const query = eventId ? { ...filter, eventId } : filter;
  return db.collection<Member>('members').findOne(query);
};

export const getMembers = (filter: Filter<Member>, eventId?: ObjectId) => {
  const query = eventId ? { ...filter, eventId } : filter;
  return db.collection<Member>('members').find(query).toArray();
};

export const addMember = (member: Member) => {
  return db.collection<Member>('members').insertOne(member);
};

export const addMembers = (members: Array<Member>) => {
  return db.collection<Member>('members').insertMany(members);
};

export const updateMember = (
  filter: Filter<Member>,
  newMember: Partial<Member>,
  eventId?: ObjectId,
  upsert = false
) => {
  const query = eventId ? { ...filter, eventId } : filter;
  return db.collection<Member>('members').updateOne(query, { $set: newMember }, { upsert });
};

export const deleteMember = (filter: Filter<Member>, eventId?: ObjectId) => {
  const query = eventId ? { ...filter, eventId } : filter;
  return db.collection<Member>('members').deleteOne(query);
};

export const deleteMembers = (filter: Filter<Member>, eventId: ObjectId) => {
  const query = { ...filter, eventId };
  return db.collection<Member>('members').deleteMany(query);
};
