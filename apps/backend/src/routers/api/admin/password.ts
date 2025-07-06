import express, { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import * as db from '@mtes/database';

const router = express.Router({ mergeParams: true });

// Update admin password
router.put(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({
                error: 'MISSING_FIELDS',
                message: 'Current password and new password are required'
            });
            return;
        }

        if (newPassword.length < 4) {
            res.status(400).json({
                error: 'WEAK_PASSWORD',
                message: 'New password must be at least 4 characters long'
            });
            return;
        }

        try {
            // Ensure the user is authenticated and is an admin
            if (!req.user || !req.user.isAdmin) {
                res.status(403).json({
                    error: 'FORBIDDEN',
                    message: 'Only admin users can change passwords'
                });
                return;
            }

            // Get the current admin user
            const adminUser = await db.getUserWithCredentials({
                _id: req.user?._id,
                isAdmin: true
            });

            if (!adminUser) {
                res.status(404).json({
                    error: 'USER_NOT_FOUND',
                    message: 'Admin user not found'
                });
                return;
            }

            // Verify current password
            if (adminUser.password !== currentPassword) {
                res.status(401).json({
                    error: 'INVALID_CURRENT_PASSWORD',
                    message: 'Current password is incorrect'
                });
                return;
            }

            // Update password
            const updateResult = await db.updateUser(
                { _id: adminUser._id },
                {
                    password: newPassword,
                    lastPasswordSetDate: new Date()
                }
            );

            if (!updateResult.acknowledged || updateResult.matchedCount === 0) {
                res.status(500).json({
                    error: 'UPDATE_FAILED',
                    message: 'Failed to update password'
                });
                return;
            }

            console.log('✅ Admin password updated successfully');
            res.json({
                ok: true,
                message: 'Password updated successfully'
            });

        } catch (error) {
            console.error('❌ Error updating admin password:', error);
            res.status(500).json({
                error: 'INTERNAL_ERROR',
                message: 'Internal server error while updating password'
            });
        }
    })
);

export default router;
