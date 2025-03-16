import { WithId } from 'mongodb';
import { AwardNames, TicketType } from './constants';
import { Member } from './schemas/member';
import { RoleConfig, VotingConfig } from './schemas/voting';

export type WSVotingStandName = 'voting' | 'audience-display';

interface DivisionsMap {
  [division: string]: any;
}

type DivisionNames<Map extends DivisionsMap> = keyof Map & (string | symbol);

export interface WSServerEmittedEvents {
  votingMemberLoaded: (member: WithId<Member>) => void;
}

export interface WSClientEmittedEvents {
  loadVotingMember: (
    votingConf: VotingConfig,
    member: Member,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  ping: (callback: (response: { ok: boolean; error?: string }) => void) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
export interface WSInterServerEvents {
  // ...
}

export interface WSSocketData {
  votingStands: Array<WSVotingStandName>;
}

export interface WSEventListener {
  name: keyof WSServerEmittedEvents | keyof WSClientEmittedEvents;
  handler: (...args: any[]) => void | Promise<void>;
}
