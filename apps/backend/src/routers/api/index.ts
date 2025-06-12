import express from 'express';
import { authMiddleware } from '../../middlewares/auth';
import eventsRouter from './events/index';
import adminRouter from './admin/index';
import rootAuthRouter from '../auth'; // Import the main auth router

const router = express.Router({ mergeParams: true });

// --- Public API routes ---
// Mount the main authentication router at /api/auth
// This handles /api/auth/login, /api/auth/logout, etc. without prior auth.
router.use('/auth', rootAuthRouter);

// --- Protected API routes ---
// Apply authMiddleware to all routes defined below this point,
// or apply it individually to specific routers/routes.

// Example: Protecting /admin and /events routes
router.use('/admin', authMiddleware, adminRouter);
router.use('/events', authMiddleware, eventsRouter);

// Protect the /me route
router.get('/me', authMiddleware, (req, res) => {
  const user = req.user; // req.user is populated by authMiddleware
  // authMiddleware should handle the case where the user is not authenticated
  // and return 401. If it reaches here, user should be defined.
  return res.json(user);
});

export default router;
