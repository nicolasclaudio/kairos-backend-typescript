import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsService', () => {
    let analytics: AnalyticsService;
    let mockTaskRepo: any;

    beforeEach(() => {
        mockTaskRepo = {
            getCompletedTasks: vi.fn()
        };
        analytics = new AnalyticsService(mockTaskRepo);
    });

    it('should calculate velocity correctly', async () => {
        // Mock 3 completed tasks in last 7 days. Total 210 mins.
        // Velocity = 210 / 7 = 30 mins/day.
        mockTaskRepo.getCompletedTasks.mockResolvedValue([
            { estimatedMinutes: 60, goalMetaScore: 5 },
            { estimatedMinutes: 90, goalMetaScore: 8 },
            { estimatedMinutes: 60, goalMetaScore: 5 }
        ]);

        const stats = await analytics.getWeeklyStats(1);
        expect(stats.velocity).toBe(30);
    });

    it('should calculate impact correctly', async () => {
        // 1 high impact (score 8) out of 3 tasks -> 33%
        mockTaskRepo.getCompletedTasks.mockResolvedValue([
            { estimatedMinutes: 60, goalMetaScore: 5 },
            { estimatedMinutes: 90, goalMetaScore: 8 },
            { estimatedMinutes: 60, goalMetaScore: 5 }
        ]);

        const stats = await analytics.getWeeklyStats(1);
        expect(stats.impactScore).toBe(33);
    });

    it('should handle zero tasks', async () => {
        mockTaskRepo.getCompletedTasks.mockResolvedValue([]);
        const stats = await analytics.getWeeklyStats(1);
        expect(stats.velocity).toBe(0);
        expect(stats.impactScore).toBe(0);
    });
});
