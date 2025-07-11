import { getMtesWebpageAsPdf } from 'apps/backend/src/lib/export';
import { Router } from 'express';
import { Response, Request } from 'express';

const router = Router();

router.get('/round-results-pdf/:roundId', async (req: Request, res: Response) => {
    try {
        const { roundId } = req.params;
        const { eventId, eventName, eventDate } = req.query;

        // Build query parameters for the export page
        const queryParams = new URLSearchParams({
            roundId,
            print: 'true',
            ...(eventId && { eventId: eventId as string }),
            ...(eventName && { eventName: eventName as string }),
            ...(eventDate && { eventDate: eventDate as string })
        });

        const frontendUrl = process.env.MTES_DOMAIN || 'http://localhost:4200';
        const exportUrl = `${frontendUrl}/mtes/export-pdf?${queryParams.toString()}`;

        console.log('Generating PDF from URL:', exportUrl);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="round-${roundId}-results.pdf"`);

        const pdf = await getMtesWebpageAsPdf(exportUrl, {
            format: 'A4',
            margin: { top: '1cm', bottom: '1cm', right: '1cm', left: '1cm' },
            printBackground: true,
            preferCSSPageSize: true
        });

        res.send(pdf);
    } catch (error) {
        console.error('Error generating PDF results:', error);
        res.status(500).json({ error: 'Failed to generate PDF results' });
    }
});

export default router;