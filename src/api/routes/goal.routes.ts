/**
 * Goal Routes
 * API routes for goal operations
 */

import { Router } from 'express';
import { GoalController } from '../controllers/goal.controller.js';
import { GoalRepository } from '../../infrastructure/repositories/goal.repository.js';
import { validateGoalCreation } from '../middleware/validation.js';

const router = Router();
const goalRepository = new GoalRepository();
const goalController = new GoalController(goalRepository);

/**
 * POST /api/goals
 * Create a new goal
 */
router.post('/goals', validateGoalCreation, (req, res) =>
    goalController.createGoal(req, res)
);

/**
 * GET /api/goals?userId={userId}
 * Get all goals for a user
 */
router.get('/goals', (req, res) => goalController.getUserGoals(req, res));

export default router;
