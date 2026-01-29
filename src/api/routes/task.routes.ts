/**
 * Task Routes
 * API routes for task operations
 */

import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';
import { GoalRepository } from '../../infrastructure/repositories/goal.repository.js';
import { validateTaskCreation } from '../middleware/validation.js';

const router = Router();
const taskRepository = new TaskRepository();
const goalRepository = new GoalRepository();
const taskController = new TaskController(taskRepository, goalRepository);

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/tasks', validateTaskCreation, (req, res) =>
    taskController.createTask(req, res)
);

/**
 * GET /api/tasks/goal/:goalId
 * Get all tasks for a goal with total minutes
 */
router.get('/tasks/goal/:goalId', (req, res) =>
    taskController.getTasksByGoal(req, res)
);

export default router;
