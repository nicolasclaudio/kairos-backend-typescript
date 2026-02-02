/**
 * Goal Routes
 * API routes for goal operations
 */

import { Router } from 'express';
import { GoalController } from '../controllers/goal.controller.js';
import { GoalRepository } from '../../infrastructure/repositories/goal.repository.js';
import { validateGoalCreation } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { TaskRepository } from '../../infrastructure/repositories/task.repository.js'; // Added dependency

const router = Router();
const goalRepository = new GoalRepository();
const taskRepository = new TaskRepository(); // Instance
const goalController = new GoalController(goalRepository, taskRepository); // Injected

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
router.get('/goals', authenticateToken, (req, res) => goalController.getUserGoals(req, res));

/**
 * PATCH /api/goals/:id
 * Update a goal
 */
router.patch('/goals/:id', authenticateToken, (req, res) =>
    goalController.updateGoal(req, res)
);

/**
 * DELETE /api/goals/:id
 * Delete (archive) a goal
 */
router.delete('/goals/:id', authenticateToken, (req, res) =>
    goalController.deleteGoal(req, res)
);

export default router;
