import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as db from '@mtes/database';
import { City } from '@mtes/types';

const router = express.Router({ mergeParams: true });

router.get('/', asyncHandler(async (req: Request, res: Response) => {
    console.log('⏬ Getting cities...');
    const cities = await db.getCities({});
    res.json(cities);
}
));

router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const cityData: City = req.body;

        // Validate required fields
        if (!cityData?.name || cityData?.numOfVoters === undefined) {
            res.status(400).json({ error: 'Missing required fields: name and numOfVoters' });
            return;
        }

        // Validate numOfVoters
        if (typeof cityData.numOfVoters !== 'number' || cityData.numOfVoters < 0) {
            res.status(400).json({ error: 'Invalid numOfVoters: must be a non-negative number' });
            return;
        }

        try {
            const result = await db.addCity(cityData);
            // In MongoDB, insertOne returns an object with an insertedId property
            if (result.insertedId) {
                res.status(201).json({ message: 'City added successfully', cityId: result.insertedId });
            } else {
                // Fallback or error if insertedId is not present, though typically it should be
                res.status(500).json({ error: 'Failed to add city, no ID returned' });
            }
        } catch (error) {
            console.error('Error adding city:', error);
            if (error.code === 11000) { // MongoDB duplicate key error code
                res.status(409).json({ error: 'City with this name already exists' });
                return;
            }
            res.status(500).json({ error: 'Failed to add city due to an internal error' });
        }
        res.status(500).json({ error: 'Failed to add city due to an internal error' });
    })
);

router.put(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const { cities } = req.body as { cities: City[] };

        if (!cities || cities.length === 0) {
            console.log('❌ Cities array is empty');
            res.status(400).json({ ok: false, message: 'No cities provided' });
            return;
        }

        console.log('⏬ Updating Cities...');

        const deleteRes = await db.deleteCities();
        if (!deleteRes.acknowledged) {
            console.log('❌ Could not delete cities');
            res.status(500).json({ ok: false, message: 'Could not delete cities' });
            return;
        }

        const addRes = await db.addCities(cities.map(city => ({ ...city, _id: undefined })));
        if (!addRes.acknowledged) {
            console.log('❌ Could not add cities');
            res.status(500).json({ ok: false, message: 'Could not add cities' });
            return;
        }

        console.log('⏬ Cities updated!');
        res.json({ ok: true });
    })
);

export default router;
