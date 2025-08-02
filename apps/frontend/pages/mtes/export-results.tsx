import { GetServerSideProps, NextPage } from 'next';
import { WithId } from 'mongodb';
import { Member, Round, VotingStatus } from '@mtes/types';
import { RoundResultsPdf } from '../../components/mtes/round-results-pdf';
import { apiFetch } from '../../lib/utils/fetch';
import {
  Box,
  Button,
  Container,
  Fab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography
} from '@mui/material';
import {
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  CheckCircleOutline
} from '@mui/icons-material';
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
          eventName={eventName ?? 'בחירות מועצות תלמידים'}
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
          display: 'flex',
          justifyContent: 'center',
          mb: 4
        }}
      >
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={handleGeneratePdf}
          startIcon={<PdfIcon />}
          sx={{ boxShadow: 3, padding: '12px 24px', fontSize: '1.2rem' }}
        >
          יצא ל-PDF
        </Button>
      </Box>

      {/* Instructions */}
      <Box
        className="no-print"
        sx={{
          mb: 4,
          p: 3,
          bgcolor: 'grey.100',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'grey.300'
        }}
      >
        <Typography
          variant="h5"
          component="h2"
          sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}
        >
          הוראות ליצירת קובץ PDF
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          כדי ליצור קובץ PDF של התוצאות, לחץ על הכפתור "יצא ל-PDF". פעולה זו תפתח את חלון ההדפסה של
          הדפדפן.
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          בחלון שייפתח, בחר באפשרות <strong>"שמור כ-PDF"</strong> (Save as PDF) כיעד ההדפסה.
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
          הגדרות מומלצות לקבלת התוצאה הטובה ביותר:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutline sx={{ color: 'success.main' }} />
            </ListItemIcon>
            <ListItemText primary="גודל נייר: A4" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutline sx={{ color: 'success.main' }} />
            </ListItemIcon>
            <ListItemText primary="כיוון הדף: לאורך (Portrait)" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutline sx={{ color: 'success.main' }} />
            </ListItemIcon>
            <ListItemText primary='שוליים: "ברירת מחדל" או "רגיל"' />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutline sx={{ color: 'success.main' }} />
            </ListItemIcon>
            <ListItemText primary="אפשר הדפסת גרפיקת רקע (Background graphics)" />
          </ListItem>
        </List>
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
            eventName={eventName ?? 'בחירות מועצות תלמידים'}
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
