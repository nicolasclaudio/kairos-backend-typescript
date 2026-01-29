/**
 * Goal Repository Tests
 * Unit tests for Goal Repository CRUD operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoalRepository } from './goal.repository.js';
import type { Goal } from '../../domain/entities.js';

// Mock the database query function
vi.mock('../../config/database.js', () => ({
    query: vi.fn(),
}));

import { query } from '../../config/database.js';

describe('GoalRepository', () => {
    let goalRepo: GoalRepository;

    beforeEach(() => {
        goalRepo = new GoalRepository();
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('should create a new goal and return it with generated ID', async () => {
            const newGoal: Omit<Goal, 'id'> = {
                userId: 1,
                title: 'Learn TypeScript',
                metaScore: 9,
                targetDate: '2024-12-31',
                status: 'active',
            };

            const mockDbRow = {
                id: 1,
                user_id: 1,
                title: 'Learn TypeScript',
                meta_score: 9,
                target_date: '2024-12-31',
                status: 'active',
            };

            (query as any).mockResolvedValue({ rows: [mockDbRow] });

            const result = await goalRepo.create(newGoal);

            expect(result).toEqual({
                id: 1,
                userId: 1,
                title: 'Learn TypeScript',
                metaScore: 9,
                targetDate: '2024-12-31',
                status: 'active',
            });

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO goals'),
                [1, 'Learn TypeScript', 9, '2024-12-31', 'active']
            );
        });

        it('should set status to active by default', async () => {
            const newGoal: Omit<Goal, 'id'> = {
                userId: 1,
                title: 'Test Goal',
                metaScore: 5,
                targetDate: null,
                status: 'active',
            };

            const mockDbRow = {
                id: 1,
                user_id: 1,
                title: 'Test Goal',
                meta_score: 5,
                target_date: null,
                status: 'active',
            };

            (query as any).mockResolvedValue({ rows: [mockDbRow] });

            const result = await goalRepo.create(newGoal);

            expect(result.status).toBe('active');
        });

        it('should throw error if goal creation fails', async () => {
            const newGoal: Omit<Goal, 'id'> = {
                userId: 1,
                title: 'Test Goal',
                metaScore: 5,
                targetDate: null,
                status: 'active',
            };

            (query as any).mockResolvedValue({ rows: [] });

            await expect(goalRepo.create(newGoal)).rejects.toThrow('Failed to create goal');
        });
    });

    describe('findByUserId', () => {
        it('should find and return all goals for a user', async () => {
            const mockDbRows = [
                {
                    id: 1,
                    user_id: 1,
                    title: 'Goal 1',
                    meta_score: 9,
                    target_date: '2024-12-31',
                    status: 'active',
                },
                {
                    id: 2,
                    user_id: 1,
                    title: 'Goal 2',
                    meta_score: 7,
                    target_date: '2024-06-30',
                    status: 'active',
                },
            ];

            (query as any).mockResolvedValue({ rows: mockDbRows });

            const result = await goalRepo.findByUserId(1);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                id: 1,
                userId: 1,
                title: 'Goal 1',
                metaScore: 9,
                targetDate: '2024-12-31',
                status: 'active',
            });
            expect(result[1]).toEqual({
                id: 2,
                userId: 1,
                title: 'Goal 2',
                metaScore: 7,
                targetDate: '2024-06-30',
                status: 'active',
            });

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM goals'),
                [1]
            );
        });

        it('should return empty array when user has no goals', async () => {
            (query as any).mockResolvedValue({ rows: [] });

            const result = await goalRepo.findByUserId(999);

            expect(result).toEqual([]);
        });
    });

    describe('camelCase to snake_case mapping', () => {
        it('should correctly map TypeScript fields to PostgreSQL fields', async () => {
            const newGoal: Omit<Goal, 'id'> = {
                userId: 1,
                title: 'Test',
                metaScore: 8,
                targetDate: '2024-12-31',
                status: 'active',
            };

            const mockDbRow = {
                id: 1,
                user_id: 1,
                title: 'Test',
                meta_score: 8,
                target_date: '2024-12-31',
                status: 'active',
            };

            (query as any).mockResolvedValue({ rows: [mockDbRow] });

            const result = await goalRepo.create(newGoal);

            // Verify the input was converted properly
            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([1, 'Test', 8, '2024-12-31', 'active'])
            );

            // Verify the output was mapped back properly
            expect(result.userId).toBe(1);
            expect(result.metaScore).toBe(8);
            expect(result.targetDate).toBe('2024-12-31');
        });
    });
});
