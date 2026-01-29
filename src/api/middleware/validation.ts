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

/**
 * Validate goal creation request
 */
export function validateGoalCreation(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const { userId, title, metaScore, targetDate } = req.body;

    // Required fields
    if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
    }

    if (!title) {
        res.status(400).json({ error: 'title is required' });
        return;
    }

    if (metaScore === undefined) {
        res.status(400).json({ error: 'metaScore is required' });
        return;
    }

    // Type validations
    if (typeof userId !== 'number') {
        res.status(400).json({ error: 'userId must be a number' });
        return;
    }

    if (typeof title !== 'string') {
        res.status(400).json({ error: 'title must be a string' });
        return;
    }

    if (typeof metaScore !== 'number') {
        res.status(400).json({ error: 'metaScore must be a number' });
        return;
    }

    // Range validation for metaScore
    if (metaScore < 1 || metaScore > 10) {
        res.status(400).json({ error: 'metaScore must be between 1 and 10' });
        return;
    }

    // Optional targetDate validation
    if (targetDate !== undefined && targetDate !== null) {
        const date = new Date(targetDate);
        if (isNaN(date.getTime())) {
            res.status(400).json({ error: 'targetDate must be a valid date' });
            return;
        }
    }

    next();
}

/**
 * Validate task creation request
 */
export function validateTaskCreation(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const { userId, goalId, title, estimatedMinutes } = req.body;

    // Required fields
    if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
    }

    if (!goalId) {
        res.status(400).json({ error: 'goalId is required' });
        return;
    }

    if (!title) {
        res.status(400).json({ error: 'title is required' });
        return;
    }

    if (estimatedMinutes === undefined) {
        res.status(400).json({ error: 'estimatedMinutes is required' });
        return;
    }

    // Type validations
    if (typeof userId !== 'number') {
        res.status(400).json({ error: 'userId must be a number' });
        return;
    }

    if (typeof goalId !== 'number') {
        res.status(400).json({ error: 'goalId must be a number' });
        return;
    }

    if (typeof title !== 'string') {
        res.status(400).json({ error: 'title must be a string' });
        return;
    }

    if (typeof estimatedMinutes !== 'number') {
        res.status(400).json({ error: 'estimatedMinutes must be a number' });
        return;
    }

    // Value validation
    if (estimatedMinutes <= 0) {
        res.status(400).json({ error: 'estimatedMinutes must be greater than 0' });
        return;
    }

    next();
}
