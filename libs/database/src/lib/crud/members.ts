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
  const validMembers = members.map(member => {
    return {
      name: member.name,
      city: member.city,
      isPresent: member.isPresent ?? false,
      isMM: member.isMM ?? false
    };
  }
  )
  return db.collection<Member>('members').insertMany(validMembers);
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

export const deleteMembers = (filter: Filter<Member>) => {
  return db.collection<Member>('members').deleteMany(filter);
};
