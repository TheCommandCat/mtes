import { ObjectId, WithId } from 'mongodb';
import { Cities } from '../cities';
export interface Member {
  name: string;
  city: Cities | 'אין אמון באף אחד';
  isPresent: boolean;
  replacedBy?: ObjectId | null;
  isMM: boolean;
}