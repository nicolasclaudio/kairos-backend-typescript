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
}
