import { parse } from 'csv-parse/sync';
import { Member, ElectionState, Cities } from '@mtes/types';
import { Line, getBlock, extractBlocksFromFile } from '../csv';

const MEMBERS_BLOCK_ID = 1;
const STANDS_BLOCK_ID = 2;

const extractMembersFromBlock = (memberBlock: Line[]): Array<Member> => {
  const LINES_TO_SKIP = 1;
  memberBlock = (memberBlock || []).splice(LINES_TO_SKIP);

  return memberBlock.map(teamLine => ({
    name: teamLine[0],
    city: teamLine[1] as Cities
  }));
};

const extractStandsFromBlock = (standsBlock: Line[]): number => {
  return parseInt(standsBlock[0][1]);
};

export const parseDivisionData = (
  csvData: string
): { members: Array<Member>; numOfStands: number } => {
  const file = parse(csvData.trim());

  const blocks = extractBlocksFromFile(file);
  const numOfStands = extractStandsFromBlock(getBlock(blocks, STANDS_BLOCK_ID));
  const members = extractMembersFromBlock(getBlock(blocks, MEMBERS_BLOCK_ID));

  return { members, numOfStands };
};

export const getInitialElectionState = (): ElectionState => {
  return {
    activeRound: null,
    completed: false
  };
};
