import { WithId } from 'mongodb';
import { AwardNames, TicketType } from './constants';
import { Member } from './schemas/member';


export interface WSServerEmittedEvents {
  votingMemberLoaded: (member: WithId<Member>) => void;
  roundLoaded: (roundId: string) => void;
}

export interface WSClientEmittedEvents {
  loadVotingMember: (
    member: WithId<Member>,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  loadRound: (
    roundId: string,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  ping: (callback: (response: { ok: boolean; error?: string }) => void) => void;

  voteSubmitted: (
    member: WithId<Member>,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  voteProcessed: (
    member: WithId<Member>,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
export interface WSInterServerEvents {
  // ...
}
export interface WSEventListener {
  name: keyof WSServerEmittedEvents | keyof WSClientEmittedEvents;
  handler: (...args: any[]) => void | Promise<void>;
}
