
import { Request, Response } from 'express';
import { AnalyticsService } from '../../domain/services/analytics.service.js';

export class AnalyticsController {
    constructor(private analyticsService: AnalyticsService) { }

    async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || req.body.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: User ID required' });
                return;
            }

            const metrics = await this.analyticsService.getDashboardMetrics(userId);
            res.json(metrics);
        } catch (error) {
            console.error('Error fetching dashboard metrics:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getVelocity(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || req.body.userId;
            const velocity = await this.analyticsService.calculateVelocity(userId);
            res.json({ velocity });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getImpact(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || req.body.userId;
            const impact = await this.analyticsService.calculateImpact(userId);
            res.json({ impact });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getStreak(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id || req.body.userId;
            const streak = await this.analyticsService.calculateStreak(userId);
            res.json({ streak });
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
