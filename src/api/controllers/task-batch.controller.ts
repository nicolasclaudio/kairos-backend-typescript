/**
 * Task Batch Controller
 * Handles HTTP requests for batch task operations with transaction support
 */

import { Request, Response } from 'express';
import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';
import { GoalRepository } from '../../infrastructure/repositories/goal.repository.js';

export class TaskBatchController {
    constructor(
        private taskRepo: TaskRepository,
        private goalRepo: GoalRepository
    ) { }

    /**
     * Batch create multiple tasks
     * POST /api/tasks/batch
     * 
     * Request body: { tasks: Array<{ goalId, title, estimatedMinutes, ... }> }
     */
    async batchCreateTasks(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { tasks } = req.body;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: User ID required' });
                return;
            }

            if (!Array.isArray(tasks) || tasks.length === 0) {
                res.status(400).json({ error: 'tasks must be a non-empty array' });
                return;
            }

            if (tasks.length > 50) {
                res.status(400).json({ error: 'Maximum 50 tasks per batch' });
                return;
            }

            // Validate each task has required fields
            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                if (!task.goalId || !task.title || !task.estimatedMinutes) {
                    res.status(400).json({
                        error: `Task at index ${i} is missing required fields: goalId, title, or estimatedMinutes`
                    });
                    return;
                }
            }

            // Validate all goalIds belong to the user
            const userGoals = await this.goalRepo.findByUserId(userId);
            const userGoalIds = new Set(userGoals.map(g => g.id));

            for (let i = 0; i < tasks.length; i++) {
                if (!userGoalIds.has(tasks[i].goalId)) {
                    res.status(403).json({
                        error: `Forbidden: Goal ID ${tasks[i].goalId} at index ${i} does not belong to this user`
                    });
                    return;
                }
            }

            // Prepare tasks for creation (add userId to each)
            const tasksToCreate = tasks.map(task => ({
                userId,
                goalId: task.goalId,
                projectId: task.projectId || null,
                title: task.title,
                estimatedMinutes: task.estimatedMinutes,
                status: task.status || 'pending',
                priorityOverride: task.priorityOverride || 3,
                isFixed: task.isFixed || false,
                requiredEnergy: task.requiredEnergy || 3,
                scheduledStartTime: task.scheduledStartTime || undefined,
            }));

            // Create tasks in batch (transactional)
            const createdTasks = await this.taskRepo.batchCreate(tasksToCreate);

            res.status(201).json({
                created: createdTasks.length,
                tasks: createdTasks
            });
        } catch (error: any) {
            console.error('Error in batch create:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Batch mark multiple tasks as complete
     * PATCH /api/tasks/batch/complete
     * 
     * Request body: { ids: number[] }
     */
    async batchCompleteTasks(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { ids } = req.body;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: User ID required' });
                return;
            }

            if (!Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({ error: 'ids must be a non-empty array' });
                return;
            }

            if (ids.length > 100) {
                res.status(400).json({ error: 'Maximum 100 IDs per batch' });
                return;
            }

            // Validate all IDs are positive integers
            if (!ids.every(id => Number.isInteger(id) && id > 0)) {
                res.status(400).json({ error: 'All IDs must be positive integers' });
                return;
            }

            // Execute batch completion (transactional with ownership validation)
            const updatedCount = await this.taskRepo.batchMarkAsDone(ids, userId);

            res.status(200).json({
                updated: updatedCount,
                ids: ids
            });
        } catch (error: any) {
            console.error('Error in batch complete:', error);

            // Check if error is about ownership/not found
            if (error.message.includes('Not all tasks belong to user')) {
                res.status(404).json({
                    error: 'Not found: Some tasks do not exist or do not belong to this user',
                    message: error.message
                });
                return;
            }

            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * Batch delete multiple tasks
     * DELETE /api/tasks/batch
     * 
     * Request body: { ids: number[] }
     */
    async batchDeleteTasks(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const { ids } = req.body;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: User ID required' });
                return;
            }

            if (!Array.isArray(ids) || ids.length === 0) {
                res.status(400).json({ error: 'ids must be a non-empty array' });
                return;
            }

            if (ids.length > 100) {
                res.status(400).json({ error: 'Maximum 100 IDs per batch' });
                return;
            }

            // Validate all IDs are positive integers
            if (!ids.every(id => Number.isInteger(id) && id > 0)) {
                res.status(400).json({ error: 'All IDs must be positive integers' });
                return;
            }

            // Execute batch deletion (transactional with ownership validation)
            const deletedCount = await this.taskRepo.batchDelete(ids, userId);

            res.status(200).json({
                deleted: deletedCount,
                ids: ids
            });
        } catch (error: any) {
            console.error('Error in batch delete:', error);

            // Check if error is about ownership/not found
            if (error.message.includes('Not all tasks belong to user')) {
                res.status(404).json({
                    error: 'Not found: Some tasks do not exist or do not belong to this user',
                    message: error.message
                });
                return;
            }

            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }
}
