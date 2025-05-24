import { WithId } from 'mongodb';
import { AwardNames, TicketType } from './constants';
import { Member } from './schemas/member';


export interface WSServerEmittedEvents {
  votingMemberLoaded: (member: WithId<Member>, votingStand: number) => void;
  roundLoaded: (roundId: string) => void;
}

export interface WSClientEmittedEvents {
  loadVotingMember: (
    eventId: string,
    member: WithId<Member>,
    votingStand: number,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  loadRound: (
    eventId: string,
    roundId: string,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  ping: (callback: (response: { ok: boolean; error?: string }) => void) => void;

  voteSubmitted: (
    eventId: string,
    member: WithId<Member>,
    votingStand: number,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  voteProcessed: (
    eventId: string,
    member: WithId<Member>,
    votingStand: number,
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
