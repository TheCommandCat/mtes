import { Positions } from '../positions';
import { Member } from './member';

export interface Contestant {
  member: Member;
  position: Positions;
  hidden: boolean;
}
