import dayjs from 'dayjs';
import { ObjectId, WithId } from 'mongodb';
import { parse } from 'csv-parse/sync';
import {
  ElectionEvent,
  Member,
  Division,
  DivisionState,
  Cities,
  Contestant
} from '@mtes/types';
import { Line, getBlock, extractBlocksFromFile } from '../csv';
import { Positions } from 'libs/types/src/lib/positions';

const MEMBERS_BLOCK_ID = 1;
const Contestants_BLOCK_ID = 2;
const JUDGING_SESSIONS_BLOCK_ID = 3;
const RANKING_MATCHES_BLOCK_ID = 4;

const extractMembersFromBlock = (
  memberBlock: Line[],
  division: WithId<Division>
): Array<Member> => {
  const LINES_TO_SKIP = 1;
  memberBlock = (memberBlock || []).splice(LINES_TO_SKIP);

  return memberBlock.map(teamLine => ({
    divisionId: division._id,
    name: teamLine[0],
    city: teamLine[1] as Cities
  }));
};

const extractContestantsFromBlock = (
  contestantsBlock: Line[],
  division: WithId<Division>
): Array<Contestant> => {
  const LINES_TO_SKIP = 1;

  contestantsBlock = (contestantsBlock || []).splice(LINES_TO_SKIP);

  return contestantsBlock.map(name => ({
    divisionId: division._id,
    member: {
      name: name[0],
      city: name[1] as Cities
    } as Member,
    position: name[2] as Positions,
    hidden: name[3] === 'true'
  }));
};

export const parseDivisionData = (
  division: WithId<Division>,
  csvData: string
): { members: Array<Member>; contestants: Array<Contestant>; } => {
  const file = parse(csvData.trim());
  const version = parseInt(file.shift()?.[1]); // Version number: 2nd cell of 1st row.
  if (version !== 2) Promise.reject('MTES can only parse version 2 Data');

  const blocks = extractBlocksFromFile(file);
  const members = extractMembersFromBlock(getBlock(blocks, MEMBERS_BLOCK_ID), division);
  const contestants = extractContestantsFromBlock(getBlock(blocks, Contestants_BLOCK_ID), division);

  return { members, contestants };
};

export const getInitialDivisionState = (division: WithId<Division>): DivisionState => {

  return {
    divisionId: division._id,
    activeRound: null,
    currentRoundPosition: null,
    currentRound: null,
    audienceDisplay: {
      screen: 'attendance',
      message: '',
    },
    completed: false,
    allowTeamExports: false,
  };
};
