import { Positions } from '../positions';
import { Member } from './member';
import { Round } from './round';

export interface Vote {
  round: Round; 
  role: Positions;
  contestant: Member;
}
