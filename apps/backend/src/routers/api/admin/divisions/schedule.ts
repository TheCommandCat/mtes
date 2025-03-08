import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import fileUpload from 'express-fileupload';
import asyncHandler from 'express-async-handler';
import * as db from '@mtes/database';
import { getDivisionUsers } from '../../../../lib/schedule/division-users';
import { parseDivisionData, getInitialDivisionState } from '../../../../lib/schedule/parser';
import { cleanDivisionData } from '../../../../lib/schedule/cleaner';

const router = express.Router({ mergeParams: true });

router.post(
  '/parse',
  fileUpload(),
  asyncHandler(async (req: Request, res: Response) => {
    // const event = await db.getElectionEvent({ _id: division.eventId });
    const divisionState = await db.getDivisionState();
    if (divisionState) {
      res.status(400).json({ error: 'Could not parse schedule: Division has data' });
      return;
    }

    try {
      console.log('👓 Parsing file...');
      const timezone = req.body.timezone;
      const csvData = (req.files.file as fileUpload.UploadedFile)?.data.toString();

      const { members, contestants } = parseDivisionData(csvData);

      console.log('📄 Inserting members and contestants');

      if (!(await db.addMembers(members)).acknowledged) {
        res.status(500).json({ error: 'Could not insert members!' });
        return;
      }
      if (!(await db.addContestants(contestants)).acknowledged) {
        res.status(500).json({ error: 'Could not insert contestants!' });
        return;
      }

      console.log('✅ Inserted members and contestants');

      console.log('👤 Generating division users');
      const users = getDivisionUsers();
      console.log(users);

      if (!(await db.addUsers(users)).acknowledged) {
        res.status(500).json({ error: 'Could not create users!' });
        return;
      }
      console.log('✅ Generated division users');

      console.log('🔐 Creating division state');
      await db.addDivisionState(getInitialDivisionState());
      console.log('✅ Created division state');

      // await db.updateDivision({ _id: division._id }, { hasState: true });

      res.status(200).json({ ok: true });
    } catch (error) {
      console.log('❌ Error parsing data');
      console.log(error);
      await cleanDivisionData();
      console.log('✅ Deleted division data!');
      res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  })
);

router.post('/generate', (req: Request, res: Response) => {
  res.status(501).json({ error: 'NOT_IMPLEMENTED' });
});

export default router;
