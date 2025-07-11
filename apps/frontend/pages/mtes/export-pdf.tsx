import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { Member, Round, VotingStatus } from '@mtes/types';
import { RoundResultsPdf } from '../../components/mtes/round-results-pdf';
import { apiFetch } from '../../lib/utils/fetch';
import Head from 'next/head';

interface RoleResult {
  contestant: WithId<Member>;
  votes: number;
}

interface VotingStatusWithMember extends WithId<VotingStatus> {
  member: WithId<Member>;
}

interface ExportPdfPageProps {
  round: WithId<Round>;
  results: Record<string, RoleResult[]>;
  votedMembers: VotingStatusWithMember[];
  totalMembers: number;
  eventName: string;
  eventDate?: string;
}

const ExportPdfPage: NextPage<ExportPdfPageProps> = ({
  round,
  results,
  votedMembers,
  totalMembers,
  eventName,
  eventDate
}) => {
  return (
    <>
      <Head>
        <title>{eventName || 'תוצאות הצבעה - PDF'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @media print {
            html, body {
              direction: rtl !important;
              font-family: "Segoe UI", Tahoma, Arial, sans-serif !important;
            }
            @page {
              size: A4;
              margin: 0.5cm;
            }
          }
        `}</style>
      </Head>
      <RoundResultsPdf
        round={round}
        results={results}
        votedMembers={votedMembers}
        totalMembers={totalMembers}
        eventName={eventName}
        eventDate={eventDate}
      />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async context => {
  const { roundId, eventId } = context.query;

  try {
    // Verify authentication
    const user = await apiFetch(`/api/me`, undefined, context).then(res =>
      res.ok ? res.json() : null
    );

    if (!user) {
      return {
        redirect: {
          destination: '/login',
          permanent: false
        }
      };
    }

    // Fetch all rounds to find the specific round
    const roundResponse = await apiFetch(`/api/events/rounds`, undefined, context);
    if (!roundResponse.ok) {
      console.error('Failed to fetch rounds:', roundResponse.status);
      return { notFound: true };
    }
    const allRounds = await roundResponse.json();
    const round = allRounds.find((r: any) => r._id.toString() === roundId);

    if (!round) {
      console.error('Round not found:', roundId);
      return { notFound: true };
    }

    // Fetch results
    const resultsResponse = await apiFetch(
      `/api/events/rounds/results/${roundId}`,
      undefined,
      context
    );
    let results = {};
    if (resultsResponse.ok) {
      const resultsData = await resultsResponse.json();
      results = resultsData.results || {};
    } else {
      console.error('Failed to fetch results:', resultsResponse.status);
    }

    // Fetch voting status with member details
    const votingStatusResponse = await apiFetch(
      `/api/events/rounds/votedMembersWithDetails/${roundId}`,
      undefined,
      context
    );
    let votedMembers = [];
    if (votingStatusResponse.ok) {
      const votedData = await votingStatusResponse.json();
      votedMembers = votedData.votedMembers || [];
    } else {
      console.error('Failed to fetch voting status:', votingStatusResponse.status);
    }

    // Fetch total members count
    const membersResponse = await apiFetch(`/api/events/members`, undefined, context);
    let totalMembers = 0;
    if (membersResponse.ok) {
      const allMembers = await membersResponse.json();
      totalMembers = allMembers.filter((member: any) => member.isPresent).length;
    } else {
      console.error('Failed to fetch members:', membersResponse.status);
      totalMembers = votedMembers.length;
    }

    // Fetch event details
    let eventName = 'תוצאות הצבעה';
    let eventDate = '';

    // Try to get the current event (there seems to be only one event at a time)
    const eventResponse = await apiFetch(`/public/event`, undefined, context);
    if (eventResponse.ok) {
      const event = await eventResponse.json();
      eventName = event.name || eventName;
      eventDate = event.date ? new Date(event.date).toLocaleDateString('he-IL') : '';
    }

    return {
      props: {
        round,
        results,
        votedMembers,
        totalMembers,
        eventName,
        eventDate
      }
    };
  } catch (error) {
    console.error('Error fetching export data:', error);
    return { notFound: true };
  }
};

export default ExportPdfPage;
