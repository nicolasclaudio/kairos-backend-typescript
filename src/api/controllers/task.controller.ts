/**
 * Task Controller
 * Handles HTTP requests for task operations with goal ownership validation
 */

import { Request, Response } from 'express';
import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';
import { GoalRepository } from '../../infrastructure/repositories/goal.repository.js';

export class TaskController {
    constructor(
        private taskRepo: TaskRepository,
        private goalRepo: GoalRepository
    ) { }

    /**
     * Create a new task
     * POST /api/tasks
     * 
     * Validates that goalId (if provided) belongs to the user
     */
    async createTask(req: Request, res: Response): Promise<void> {
        try {
            const { userId, goalId, projectId, title, estimatedMinutes, priorityOverride, isFixed } = req.body;

            // goalId is required - validate ownership
            const userGoals = await this.goalRepo.findByUserId(userId);
            const goalExists = userGoals.some(goal => goal.id === goalId);

            if (!goalExists) {
                res.status(403).json({
                    error: 'Forbidden: Goal does not belong to this user'
                });
                return;
            }

            // Create task
            const task = await this.taskRepo.create({
                userId,
                goalId,
                projectId: projectId || null,
                title,
                estimatedMinutes: estimatedMinutes || 30,
                status: 'pending',
                priorityOverride: priorityOverride || 3,
                isFixed: isFixed || false,
                createdAt: new Date().toISOString(),
            });

            // Return 201 Created
            res.status(201).json(task);
        } catch (error: any) {
            // Generic error
            console.error('Error creating task:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get all tasks for a goal with total minutes
     * GET /api/tasks/goal/:goalId
     */
    async getTasksByGoal(req: Request, res: Response): Promise<void> {
        try {
            const goalIdParam = req.params.goalId as string;
            const goalId = parseInt(goalIdParam, 10);

            if (isNaN(goalId)) {
                res.status(400).json({ error: 'Invalid goalId parameter' });
                return;
            }

            // Get tasks and total minutes
            const [tasks, totalMinutes] = await Promise.all([
                this.taskRepo.findByGoalId(goalId),
                this.taskRepo.calculateTotalMinutesByGoal(goalId),
            ]);

            // Return 200 OK
            res.status(200).json({
                tasks,
                totalMinutes,
            });
        } catch (error: any) {
            // Generic error
            console.error('Error fetching tasks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
