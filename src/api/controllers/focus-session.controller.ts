import { Request, Response } from 'express';
import { FocusSessionRepository } from '../../infrastructure/repositories/focus-session.repository.js';

export class FocusSessionController {
    constructor(private focusSessionRepo: FocusSessionRepository) { }

    async startSession(req: Request, res: Response): Promise<void> {
        try {
            const { taskId } = req.body;
            const userId = (req as any).user?.id;

            if (!userId || !taskId) {
                res.status(400).json({ error: 'Missing required fields: taskId' });
                return;
            }

            // Check if user already has an active session
            const activeSession = await this.focusSessionRepo.findActiveByUser(userId);
            if (activeSession) {
                res.status(400).json({
                    error: 'You already have an active focus session. Complete it before starting a new one.',
                    activeSession
                });
                return;
            }

            const session = await this.focusSessionRepo.create(userId, taskId);
            res.status(201).json(session);
        } catch (error) {
            console.error('Error starting focus session:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async completeSession(req: Request, res: Response): Promise<void> {
        try {
            const sessionId = parseInt(req.params.id as string, 10);
            const userId = (req as any).user?.id;

            if (isNaN(sessionId) || !userId) {
                res.status(400).json({ error: 'Invalid parameters' });
                return;
            }

            const completedSession = await this.focusSessionRepo.complete(sessionId, userId);

            if (!completedSession) {
                res.status(404).json({ error: 'Active session not found or permission denied' });
                return;
            }

            res.json(completedSession);
        } catch (error) {
            console.error('Error completing focus session:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getStats(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { startDate, endDate } = req.query;
            const start = startDate ? new Date(startDate as string) : undefined;
            const end = endDate ? new Date(endDate as string) : undefined;

            const stats = await this.focusSessionRepo.getStats(userId, start, end);
            res.json(stats);
        } catch (error) {
            console.error('Error fetching focus session stats:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getActiveSession(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const activeSession = await this.focusSessionRepo.findActiveByUser(userId);

            if (!activeSession) {
                res.status(404).json({ error: 'No active session found' });
                return;
            }

            res.json(activeSession);
        } catch (error) {
            console.error('Error fetching active session:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getHistory(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const page = parseInt(req.query.page as string, 10) || 1;
            const limit = parseInt(req.query.limit as string, 10) || 20;
            const offset = (page - 1) * limit;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const history = await this.focusSessionRepo.findHistory(userId, limit, offset);
            res.json(history);
        } catch (error) {
            console.error('Error fetching session history:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
