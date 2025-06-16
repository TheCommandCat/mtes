import { Cities } from '../cities';

export interface Member {
  name: string;
  city: Cities | 'אין אמון באף אחד';
  isPresent: boolean;
  isMM?: boolean; // Added isMM field
}
