/**
 * User Controller
 * Handles HTTP requests for user operations
 */

import { Request, Response } from 'express';
import { UserRepository } from '../../infrastructure/repositories/user.repository.js';

export class UserController {
    constructor(private userRepo: UserRepository) { }

    /**
     * Register a new user
     * POST /api/users
     */
    async register(req: Request, res: Response): Promise<void> {
        try {
            const { telegramId, username, timezone, workStartTime, workEndTime, initialVelocityMultiplier } = req.body;

            // Create user
            const user = await this.userRepo.create({
                telegramId,
                username: username || null,
                timezone,
                workStartTime,
                workEndTime,
                initialVelocityMultiplier,
                currentEnergy: 100 // Default initial energy
            });

            // Return 201 Created
            res.status(201).json(user);
        } catch (error: any) {
            // Handle duplicate telegram_id error
            if (error.code === '23505') {
                res.status(409).json({ error: 'User with this telegram ID already exists' });
                return;
            }

            // Generic error
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Update user profile (preferences)
     * PATCH /api/users/me
     */
    async updateProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const updates = req.body;

            // Whitelist allowed updates
            const allowedUpdates = ['workStartTime', 'workEndTime', 'timezone', 'initialVelocityMultiplier', 'username'];
            const filteredUpdates: any = {};

            for (const key of allowedUpdates) {
                if (updates[key] !== undefined) {
                    filteredUpdates[key] = updates[key];
                }
            }

            if (Object.keys(filteredUpdates).length === 0) {
                res.status(400).json({ error: 'No valid updates provided' });
                return;
            }

            // Calls repo update (we need to ensure repo has update method or implement it)
            // Assuming userRepo.update exists. If not, I'll check/add it.
            // Checking UserRepository next. 
            // For now, let's assume it has it or I will add it.
            const updatedUser = await this.userRepo.update(userId, filteredUpdates);

            if (!updatedUser) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json(updatedUser);
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
