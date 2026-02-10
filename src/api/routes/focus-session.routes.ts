import { Router } from 'express';
import { FocusSessionController } from '../controllers/focus-session.controller.js';
import { FocusSessionRepository } from '../../infrastructure/repositories/focus-session.repository.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();
const focusSessionRepo = new FocusSessionRepository();
const focusSessionController = new FocusSessionController(focusSessionRepo);

// All routes are protected
router.use(authenticateToken);

router.post('/', (req, res) => focusSessionController.startSession(req, res));
router.patch('/:id/complete', (req, res) => focusSessionController.completeSession(req, res));
router.get('/stats', (req, res) => focusSessionController.getStats(req, res));
router.get('/active', (req, res) => focusSessionController.getActiveSession(req, res));

export default router;
