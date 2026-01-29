/**
 * Validation Middleware
 * Validates request bodies for API endpoints
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Validate user registration request
 */
export function validateUserRegistration(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const { telegramId, timezone, workStartTime, workEndTime, initialVelocityMultiplier } = req.body;

    // Required fields
    if (!telegramId) {
        res.status(400).json({ error: 'telegramId is required' });
        return;
    }

    if (!timezone) {
        res.status(400).json({ error: 'timezone is required' });
        return;
    }

    if (!workStartTime) {
        res.status(400).json({ error: 'workStartTime is required' });
        return;
    }

    if (!workEndTime) {
        res.status(400).json({ error: 'workEndTime is required' });
        return;
    }

    if (initialVelocityMultiplier === undefined) {
        res.status(400).json({ error: 'initialVelocityMultiplier is required' });
        return;
    }

    // Type validations
    if (typeof telegramId !== 'string') {
        res.status(400).json({ error: 'telegramId must be a string' });
        return;
    }

    if (typeof timezone !== 'string') {
        res.status(400).json({ error: 'timezone must be a string' });
        return;
    }

    if (typeof initialVelocityMultiplier !== 'number') {
        res.status(400).json({ error: 'initialVelocityMultiplier must be a number' });
        return;
    }

    // Format validations
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(workStartTime)) {
        res.status(400).json({ error: 'workStartTime must be in HH:MM format' });
        return;
    }

    if (!timeRegex.test(workEndTime)) {
        res.status(400).json({ error: 'workEndTime must be in HH:MM format' });
        return;
    }

    next();
}
