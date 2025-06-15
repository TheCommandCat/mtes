import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as db from '@mtes/database';
import { City } from '@mtes/types';

const router = express.Router({ mergeParams: true });

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    console.log('⏬ Getting cities...');
    const cities = await db.getCities({});
    res.json(cities);
}
));

router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const cityData: City = req.body;

        if (!cityData?.name || cityData?.numOfVoters === undefined) {
            res.status(400).json({ error: 'Missing required fields: name and numOfVoters' });
            return;
        }

        if (typeof cityData.numOfVoters !== 'number' || cityData.numOfVoters < 0) {
            res.status(400).json({ error: 'Invalid numOfVoters: must be a non-negative number' });
            return;
        }

        try {
            const result = await db.addCity(cityData);
            if (result.insertedId) {
                res.status(201).json({ message: 'City added successfully', cityId: result.insertedId });
            } else {
                res.status(500).json({ error: 'Failed to add city, no ID returned' });
            }
        } catch (error) {
            console.error('Error adding city:', error);
            if (error.code === 11000) {
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

        if (!cities || !Array.isArray(cities)) {
            console.log('❌ Cities array is missing or not an array');
            res.status(400).json({ ok: false, message: 'Cities data is missing or invalid' });
            return;
        }

        if (cities.length === 0) {
            console.log('❌ Cities array is empty');
        }

        console.log('⏬ Updating Cities...');

        const processedCities = cities.map(city => {
            const numVoters = Number(city.numOfVoters);
            return {
                ...city,
                numOfVoters: numVoters
            };
        });

        for (const city of processedCities) {
            if (isNaN(city.numOfVoters)) {
                console.warn(`⚠️ numOfVoters for city '${city.name}' was NaN after conversion.`);
            }
        }

        const deleteRes = await db.deleteCities();
        if (!deleteRes.acknowledged) {
            console.log('❌ Could not delete cities');
            res.status(500).json({ ok: false, message: 'Could not delete cities' });
            return;
        }

        if (processedCities.length > 0) {
            const addRes = await db.addCities(processedCities.map(city => ({ ...city, _id: undefined })));
            if (!addRes.acknowledged) {
                console.log('❌ Could not add cities');
                res.status(500).json({ ok: false, message: 'Could not add cities' });
                return;
            }
        } else {
            console.log('ℹ️ No cities to add after processing (or initial array was empty).');
        }

        console.log('✅ Cities updated!');
        res.json({ ok: true });
    })
);

export default router;
