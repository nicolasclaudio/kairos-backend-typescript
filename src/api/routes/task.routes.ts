/**
 * Task Routes
 * API routes for task operations
 */

import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';
import { GoalRepository } from '../../infrastructure/repositories/goal.repository.js';
import { validateTaskCreation } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.middleware.js'; // Import auth

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

/**
 * PATCH /api/tasks/:id
 * Update a task
 */
router.patch('/tasks/:id', authenticateToken, (req, res) =>
    taskController.updateTask(req, res)
);

/**
 * PATCH /api/tasks/:id/complete
 * Mark task as complete
 */
router.patch('/tasks/:id/complete', authenticateToken, (req, res) =>
    taskController.completeTask(req, res)
);

/**
 * DELETE /api/tasks/:id
 * Delete (archive) a task
 */
router.delete('/tasks/:id', authenticateToken, (req, res) =>
    taskController.deleteTask(req, res)
);

/**
 * GET /api/tasks
 * Get all tasks with filters
 */
router.get('/tasks', authenticateToken, (req, res) =>
    taskController.getTasks(req, res)
);

export default router;
