
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '../../domain/services/analytics.service.js';
import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';

// Mock dependencies
vi.mock('../../infrastructure/repositories/task.repository.js');

describe('AnalyticsService', () => {
    let analyticsService: AnalyticsService;
    let mockTaskRepo: any;

    beforeEach(() => {
        mockTaskRepo = {
            getCompletedTasks: vi.fn(),
            getCompletionDates: vi.fn(),
        } as unknown as TaskRepository;

        analyticsService = new AnalyticsService(mockTaskRepo);
    });

    describe('calculateVelocity', () => {
        it('should calculate average minutes per day over 7 days', async () => {
            // Mock 2 tasks of 30 mins and 60 mins completed in last 7 days
            mockTaskRepo.getCompletedTasks.mockResolvedValue([
                { estimatedMinutes: 30 },
                { estimatedMinutes: 60 }
            ]);

            const velocity = await analyticsService.calculateVelocity(1);
            // (30 + 60) / 7 = 12.85 -> 13
            expect(velocity).toBe(13);
        });

        it('should return 0 if no tasks completed', async () => {
            mockTaskRepo.getCompletedTasks.mockResolvedValue([]);
            const velocity = await analyticsService.calculateVelocity(1);
            expect(velocity).toBe(0);
        });
    });

    describe('calculateImpact', () => {
        it('should calculate percentage of high impact tasks', async () => {
            mockTaskRepo.getCompletedTasks.mockResolvedValue([
                { goalMetaScore: 8 }, // High
                { goalMetaScore: 5 }, // Low
                { goalMetaScore: 10 }, // High
                { goalMetaScore: 3 }  // Low
            ]);

            const impact = await analyticsService.calculateImpact(1);
            // 2 high impact out of 4 total = 50%
            expect(impact).toBe(50);
        });
    });

    describe('calculateStreak', () => {
        it('should verify correct streak counting', async () => {
            const today = new Date();
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            const dayBeforeYesterday = new Date(today); dayBeforeYesterday.setDate(today.getDate() - 2);

            // Mock consecutive days: Today, Yesterday, Day Before Yesterday
            mockTaskRepo.getCompletionDates.mockResolvedValue([
                today,
                yesterday,
                dayBeforeYesterday
            ]);

            const streak = await analyticsService.calculateStreak(1);
            expect(streak).toBe(3);
        });

        it('should break streak if gap exists', async () => {
            const today = new Date();
            const threeDaysAgo = new Date(today); threeDaysAgo.setDate(today.getDate() - 3);

            mockTaskRepo.getCompletionDates.mockResolvedValue([
                today,
                threeDaysAgo
            ]);

            const streak = await analyticsService.calculateStreak(1);
            expect(streak).toBe(1); // Only today counts
        });

        it('should count yesterday as active streak even if nothing done today', async () => {
            const today = new Date();
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

            mockTaskRepo.getCompletionDates.mockResolvedValue([
                yesterday
            ]);

            const streak = await analyticsService.calculateStreak(1);
            expect(streak).toBe(1);
        });
    });
});
