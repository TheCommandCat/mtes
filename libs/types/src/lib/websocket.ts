import { WithId } from 'mongodb';
import { AwardNames, TicketType } from './constants';
import { Member } from './schemas/member';
import { Round } from './schemas/round';


export interface WSServerEmittedEvents {
  votingMemberLoaded: (member: WithId<Member>, votingStand: number) => void;
  roundLoaded: (roundId: string) => void;
  memberPresenceUpdated: (
    memberId: string,
    isMM: boolean,
    isPresent: boolean,
    replacedBy: WithId<Member> | null
  ) => void;
  audienceDisplayUpdated: (
    view: { display: 'round' | 'presence' | 'voting'; roundId?: string }
  ) => void;
}

export interface WSClientEmittedEvents {
  loadVotingMember: (
    member: WithId<Member>,
    votingStand: number,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  loadRound: (
    roundId: string,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  updateMemberPresence: (
    memberId: string,
    isMM: boolean,
    isPresent: boolean,
    replacedBy: WithId<Member> | null,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  ping: (callback: (response: { ok: boolean; error?: string }) => void) => void;

  voteSubmitted: (
    member: WithId<Member>,
    votingStand: number,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  voteProcessed: (
    member: WithId<Member>,
    votingStand: number,
    callback: (response: { ok: boolean; error?: string }) => void
  ) => void;

  updateAudienceDisplay: (
    view: { display: 'round' | 'presence' | 'voting'; round?: WithId<Round> },
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
