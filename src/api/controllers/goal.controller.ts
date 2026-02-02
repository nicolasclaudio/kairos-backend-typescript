/**
 * Goal Controller
 * Handles HTTP requests for goal operations
 */

import { Request, Response } from 'express';
import { GoalRepository } from '../../infrastructure/repositories/goal.repository.js';
import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';

export class GoalController {
    constructor(
        private goalRepo: GoalRepository,
        private taskRepo: TaskRepository
    ) { }

    /**
     * Create a new goal
     * POST /api/goals
     */
    async createGoal(req: Request, res: Response): Promise<void> {
        try {
            const { userId, title, metaScore, targetDate } = req.body;

            // Create goal
            const goal = await this.goalRepo.create({
                userId,
                title,
                metaScore,
                targetDate: targetDate || null,
                status: 'active',
            });

            // Return 201 Created
            res.status(201).json(goal);
        } catch (error: any) {
            // Generic error
            console.error('Error creating goal:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get all goals for a user
     * GET /api/goals?userId={userId}
     */
    async getUserGoals(req: Request, res: Response): Promise<void> {
        try {
            // Prefer auth user if available
            const authUserId = (req as any).user?.id;
            const queryUserId = parseInt(req.query.userId as string, 10);

            // Validation: Must have at least one valid user ID
            if (!authUserId && isNaN(queryUserId)) {
                res.status(400).json({ error: 'User ID required' });
                return;
            }

            // Trust auth user over query param if both exist? Or support admin view?
            // For US#14 strictness: USE auth user if present.
            const userId = authUserId || queryUserId;

            // Get user goals
            const goals = await this.goalRepo.findByUserId(userId);

            // Return 200 OK
            res.status(200).json(goals);
        } catch (error: any) {
            // Generic error
            console.error('Error fetching goals:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Update a goal
     * PATCH /api/goals/:id
     */
    async updateGoal(req: Request, res: Response): Promise<void> {
        try {
            const goalId = parseInt(req.params.id as string, 10);
            const { userId, ...updates } = req.body;
            const effectiveUserId = (req as any).user?.id || userId;

            if (isNaN(goalId) || !effectiveUserId) {
                res.status(400).json({ error: 'Invalid parameters' });
                return;
            }

            const updatedGoal = await this.goalRepo.update(goalId, effectiveUserId, updates);

            if (!updatedGoal) {
                res.status(404).json({ error: 'Goal not found or permission denied' });
                return;
            }

            res.status(200).json(updatedGoal);
        } catch (error) {
            console.error('Error updating goal:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Delete a goal
     * DELETE /api/goals/:id
     */
    async deleteGoal(req: Request, res: Response): Promise<void> {
        try {
            const goalId = parseInt(req.params.id as string, 10);
            const userId = (req as any).user?.id || req.body.userId;

            if (isNaN(goalId) || !userId) {
                res.status(400).json({ error: 'Invalid parameters' });
                return;
            }

            // Validation: Check if goal has tasks
            const tasks = await this.taskRepo.findByGoalId(goalId);

            // Allow deletion if all tasks are archived

            // Allow deletion if all tasks are archived
            const activeTasks = tasks.filter(t => t.status !== 'archived');

            if (activeTasks.length > 0) {
                res.status(400).json({
                    error: 'Cannot delete goal with associated tasks. Delete or reassign tasks first.'
                });
                return;
            }

            const success = await this.goalRepo.archive(goalId, userId);

            if (!success) {
                res.status(404).json({ error: 'Goal not found or permission denied' });
                return;
            }

            res.status(204).send();
        } catch (error) {
            console.error('Error deleting goal:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
