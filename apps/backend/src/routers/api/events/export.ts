import { getMtesWebpageAsPdf } from 'apps/backend/src/lib/export';
import { Router } from 'express';
import { Response, Request } from 'express';

const router = Router();

router.get('/pdf', async (req: Request, res: Response) => {

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="event-results.pdf"');

    const pdf = await getMtesWebpageAsPdf(
        "http://localhost:4200/mtes/election-manager",
    );
    res.send(pdf);
});

export default router;