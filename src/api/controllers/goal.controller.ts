/**
 * Goal Controller
 * Handles HTTP requests for goal operations
 */

import { Request, Response } from 'express';
import { GoalRepository } from '../../infrastructure/repositories/goal.repository.js';

export class GoalController {
    constructor(private goalRepo: GoalRepository) { }

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
            const userId = parseInt(req.query.userId as string, 10);

            if (isNaN(userId)) {
                res.status(400).json({ error: 'userId query parameter is required and must be a number' });
                return;
            }

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
}
