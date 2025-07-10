import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { Member, Round, VotingStatus } from '@mtes/types';
import { RoundResultsPdf } from '../../components/mtes/round-results-pdf';
import { apiFetch } from '../../lib/utils/fetch';
import { Box, Button, Container, Fab } from '@mui/material';
import { Print as PrintIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { useEffect, useState } from 'react';

interface RoleResult {
  contestant: WithId<Member>;
  votes: number;
}

interface VotingStatusWithMember extends WithId<VotingStatus> {
  member: WithId<Member>;
}

interface ExportResultsPageProps {
  round: WithId<Round>;
  results: Record<string, RoleResult[]>;
  votedMembers: VotingStatusWithMember[];
  totalMembers: number;
  eventName?: string;
  eventDate?: string;
}

const ExportResultsPage: NextPage<ExportResultsPageProps> = ({
  round,
  results,
  votedMembers,
  totalMembers,
  eventName,
  eventDate
}) => {
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Debug logging
  console.log('ExportResultsPage - Props received:', {
    hasRound: !!round,
    roundName: round?.name,
    hasResults: !!results,
    resultsKeys: results ? Object.keys(results) : [],
    votedMembersCount: votedMembers?.length || 0,
    totalMembers,
    eventName,
    eventDate
  });

  useEffect(() => {
    // Check if we're in print mode (URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    setIsPrintMode(urlParams.get('print') === 'true');
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleGeneratePdf = async () => {
    try {
      // Open the same page with print=true parameter for PDF generation
      const printUrl = `${window.location.origin}${
        window.location.pathname
      }?print=true&${window.location.search.substring(1)}`;

      // For client-side PDF generation, we'll open in new window with print dialog
      const printWindow = window.open(printUrl, '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // In print mode, hide control buttons and show only the PDF content
  if (isPrintMode) {
    return (
      <Container maxWidth={false} sx={{ p: 0, m: 0 }}>
        <RoundResultsPdf
          round={round}
          results={results}
          votedMembers={votedMembers}
          totalMembers={totalMembers}
          eventName={eventName!}
          eventDate={eventDate}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Control Buttons */}
      <Box
        className="no-print"
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          display: 'flex',
          gap: 2,
          flexDirection: 'column'
        }}
      >
        <Fab color="primary" onClick={handlePrint} sx={{ boxShadow: 3 }} title="הדפס">
          <PrintIcon />
        </Fab>
        <Fab color="secondary" onClick={handleGeneratePdf} sx={{ boxShadow: 3 }} title="יצא לPDF">
          <PdfIcon />
        </Fab>
      </Box>

      {/* Instructions */}
      <Box
        className="no-print"
        sx={{
          mb: 4,
          p: 3,
          bgcolor: 'info.light',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'info.main'
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', color: '#1976d2' }}>הוראות ליצוא PDF</h2>
        <ul style={{ margin: 0, paddingRight: 20 }}>
          <li>
            <strong>להדפסה ישירה:</strong> לחץ על כפתור ההדפסה הכחול
          </li>
          <li>
            <strong>לשמירה כ-PDF:</strong> לחץ על כפתור ה-PDF הסגול או השתמש בתפריט הדפסה ובחר "שמור
            כ-PDF"
          </li>
          <li>
            <strong>הגדרות מומלצות:</strong>
            <ul style={{ marginTop: 8 }}>
              <li>גודל נייר: A4</li>
              <li>כיוון: לאורך</li>
              <li>שוליים: רגיל</li>
              <li>צבעי רקע: מופעל</li>
            </ul>
          </li>
        </ul>
      </Box>

      {/* PDF Preview */}
      <Box
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 2,
          bgcolor: '#fafafa'
        }}
      >
        <h3
          className="no-print"
          style={{
            textAlign: 'center',
            margin: '0 0 20px 0',
            color: '#666'
          }}
        >
          תצוגה מקדימה של ה-PDF
        </h3>

        <Box
          sx={{
            bgcolor: 'white',
            minHeight: '297mm', // A4 height
            width: '100%',
            maxWidth: '210mm', // A4 width
            margin: '0 auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            p: '1cm' // Standard margin
          }}
        >
          <RoundResultsPdf
            round={round}
            results={results}
            votedMembers={votedMembers}
            totalMembers={totalMembers}
            eventName={eventName!}
            eventDate={eventDate}
          />
        </Box>
      </Box>
    </Container>
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
      console.error('Failed to fetch rounds:', roundResponse.status, roundResponse.statusText);
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
      console.error('Failed to fetch results:', resultsResponse.status, resultsResponse.statusText);
      // Continue with empty results rather than failing
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
      console.error(
        'Failed to fetch voting status:',
        votingStatusResponse.status,
        votingStatusResponse.statusText
      );
    }

    // Fetch total members count
    const membersResponse = await apiFetch(`/api/events/members`, undefined, context);
    let totalMembers = 0;
    if (membersResponse.ok) {
      const allMembers = await membersResponse.json();
      totalMembers = allMembers.filter((member: any) => member.isPresent).length;
    } else {
      console.error('Failed to fetch members:', membersResponse.status, membersResponse.statusText);
      // Use voted members count as fallback
      totalMembers = votedMembers.length;
    }

    // Fetch event details if eventId is provided
    let eventName = 'בחירות מועצות תלמידים אזוריות';
    let eventDate = '';

    if (eventId) {
      const eventResponse = await apiFetch(`/api/events/${eventId}`, undefined, context);
      if (eventResponse.ok) {
        const event = await eventResponse.json();
        eventName = event.name || eventName;
        eventDate = event.date ? new Date(event.date).toLocaleDateString('he-IL') : '';
      } else {
        console.error('Failed to fetch event:', eventResponse.status, eventResponse.statusText);
      }
    }

    // Log the data structure for debugging
    console.log('Export page data:', {
      roundId,
      roundName: round.name,
      roles: round.roles?.map((r: any) => r.role) || [],
      resultsKeys: Object.keys(results),
      votedMembersCount: votedMembers.length,
      totalMembers
    });

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

export default ExportResultsPage;
