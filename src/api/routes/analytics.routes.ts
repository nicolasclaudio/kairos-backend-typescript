
import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { AnalyticsService } from '../../domain/services/analytics.service.js';
import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();
const taskRepo = new TaskRepository();
const analyticsService = new AnalyticsService(taskRepo);
const analyticsController = new AnalyticsController(analyticsService);

// Protected routes
router.use(authenticateToken);

router.get('/dashboard', (req, res) => analyticsController.getDashboard(req, res));
router.get('/velocity', (req, res) => analyticsController.getVelocity(req, res));
router.get('/impact', (req, res) => analyticsController.getImpact(req, res));
router.get('/streak', (req, res) => analyticsController.getStreak(req, res));

export default router;
