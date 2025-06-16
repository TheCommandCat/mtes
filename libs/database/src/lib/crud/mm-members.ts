import { Filter, ObjectId } from 'mongodb';
import { Member } from '@mtes/types';
import db from '../database';

export const getMmMember = (filter: Filter<Member>) => {
    return db.collection<Member>('mm-members').findOne(filter);
};

export const getMmMembers = (filter: Filter<Member>) => {
    return db.collection<Member>('mm-members').find(filter).toArray();
};

export const addMmMember = (mmMember: Member) => {
    return db.collection<Member>('mm-members').insertOne(mmMember);
};

export const addMmMembers = (mmMembers: Array<Member>) => {
    const validMmMembers = mmMembers.map(mmMember => {
        return {
            name: mmMember.name,
            city: mmMember.city,
            isPresent: mmMember.isPresent ?? false,
            isMM: mmMember.isMM ?? false
        };
    });
    return db.collection<Member>('mm-members').insertMany(validMmMembers);
};

export const updateMmMember = (
    filter: Filter<Member>,
    newMmMember: Partial<Member>,
    upsert = false
) => {
    return db.collection<Member>('mm-members').updateOne(filter, { $set: newMmMember }, { upsert });
};

export const deleteMmMember = (filter: Filter<Member>) => {
    return db.collection<Member>('mm-members').deleteOne(filter);
};

export const deleteMmMembers = (filter: Filter<Member>) => {
    return db.collection<Member>('mm-members').deleteMany(filter);
};
