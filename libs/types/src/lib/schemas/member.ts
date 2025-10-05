import { ObjectId, WithId } from 'mongodb';
import { Cities } from '../cities';
export interface Member {
  eventId: ObjectId;
  name: string;
  city: Cities | 'אין אמון באף אחד';
  isPresent: boolean;
  replacedBy?: WithId<Member> | null;
  isMM: boolean;
}
