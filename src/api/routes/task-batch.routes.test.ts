
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { pool } from '../../config/database.js';

// Mock DB
vi.mock('../../config/database.js', () => ({
    query: vi.fn(),
    pool: {
        query: vi.fn(),
        connect: vi.fn(),
        end: vi.fn()
    }
}));

import { query } from '../../config/database.js';

// Mock Auth Middleware to bypass JWT check and inject user
vi.mock('../../api/middleware/auth.middleware.js', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    }
}));

describe('Task Batch Operations Routes', () => {
    let mockClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock pool.connect() to return a mock client
        mockClient = {
            query: vi.fn(),
            release: vi.fn()
        };
        (pool.connect as any) = vi.fn().mockResolvedValue(mockClient);
    });

    describe('POST /api/tasks/batch', () => {
        it('should create multiple tasks successfully', async () => {
            // Mock goal validation
            const mockGoals = [
                { id: 1, user_id: 1, title: ' Goal 1', meta_score: 8 },
                { id: 2, user_id: 1, title: 'Goal 2', meta_score: 7 }
            ];
            (query as any).mockResolvedValueOnce({ rows: mockGoals });

            // Mock transaction queries
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ // First task insert
                    rows: [{
                        id: 10,
                        user_id: 1,
                        goal_id: 1,
                        title: 'Batch Task 1',
                        estimated_minutes: 30,
                        status: 'pending',
                        priority_override: 3,
                        is_fixed: false,
                        required_energy: 3
                    }]
                })
                .mockResolvedValueOnce({ // Second task insert
                    rows: [{
                        id: 11,
                        user_id: 1,
                        goal_id: 2,
                        title: 'Batch Task 2',
                        estimated_minutes: 45,
                        status: 'pending',
                        priority_override: 3,
                        is_fixed: false,
                        required_energy: 3
                    }]
                })
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const res = await request(app)
                .post('/api/tasks/batch')
                .send({
                    tasks: [
                        {
                            goalId: 1,
                            title: 'Batch Task 1',
                            estimatedMinutes: 30
                        },
                        {
                            goalId: 2,
                            title: 'Batch Task 2',
                            estimatedMinutes: 45
                        }
                    ]
                });

            expect(res.status).toBe(201);
            expect(res.body.created).toBe(2);
            expect(res.body.tasks).toHaveLength(2);
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should limit to 50 tasks per batch', async () => {
            const tasks = Array(51).fill({
                goalId: 1,
                title: 'Task',
                estimatedMinutes: 30
            });

            const res = await request(app)
                .post('/api/tasks/batch')
                .send({ tasks });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Maximum 50 tasks');
        });

        it('should validate goalId ownership', async () => {
            // Mock goal validation - empty result means goal doesn't belong to user
            (query as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/tasks/batch')
                .send({
                    tasks: [{
                        goalId: 999,
                        title: 'Task',
                        estimatedMinutes: 30
                    }]
                });

            expect(res.status).toBe(403);
            expect(res.body.error).toContain('does not belong to this user');
        });

        it('should rollback on error', async () => {
            const mockGoals = [{ id: 1, user_id: 1, title: 'Goal 1', meta_score: 8 }];
            (query as any).mockResolvedValueOnce({ rows: mockGoals });

            // Mock transaction queries - first succeeds, second fails
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 10, user_id: 1, title: 'Task 1' }] }) // First insert
                .mockRejectedValueOnce(new Error('Database error')) // Second insert fails
                .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

            const res = await request(app)
                .post('/api/tasks/batch')
                .send({
                    tasks: [
                        { goalId: 1, title: 'Task 1', estimatedMinutes: 30 },
                        { goalId: 1, title: 'Task 2', estimatedMinutes: 30 }
                    ]
                });

            expect(res.status).toBe(500);
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('PATCH /api/tasks/batch/complete', () => {
        it('should mark multiple tasks as done', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // Validation
                .mockResolvedValueOnce({ rowCount: 3 }) // Update
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const res = await request(app)
                .patch('/api/tasks/batch/complete')
                .send({ ids: [1, 2, 3] });

            expect(res.status).toBe(200);
            expect(res.body.updated).toBe(3);
            expect(res.body.ids).toEqual([1, 2, 3]);
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should rollback if a task does not exist', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Validation - only 2 of 3 found
                .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

            const res = await request(app)
                .patch('/api/tasks/batch/complete')
                .send({ ids: [1, 2, 999] });

            expect(res.status).toBe(404); // Repository throws error when not all tasks found
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should limit to 100 IDs per batch', async () => {
            const ids = Array(101).fill(0).map((_, i) => i + 1);

            const res = await request(app)
                .patch('/api/tasks/batch/complete')
                .send({ ids });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('100');
        });

        it('should validate all IDs are positive integers', async () => {
            const res = await request(app)
                .patch('/api/tasks/batch/complete')
                .send({ ids: [1, -2, 3] });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('integer');
        });
    });

    describe('DELETE /api/tasks/batch', () => {
        it('should archive multiple tasks', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Validation
                .mockResolvedValueOnce({ rowCount: 2 }) // Archive
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const res = await request(app)
                .delete('/api/tasks/batch')
                .send({ ids: [1, 2] });

            expect(res.status).toBe(200);
            expect(res.body.deleted).toBe(2);
            expect(res.body.ids).toEqual([1, 2]);
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });

        it('should rollback if a task does not belong to user', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Validation - none found
                .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

            const res = await request(app)
                .delete('/api/tasks/batch')
                .send({ ids: [999, 1000] });

            expect(res.status).toBe(404); // Repository validates and returns 404
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        });

        it('should validate input is non-empty array', async () => {
            const res = await request(app)
                .delete('/api/tasks/batch')
                .send({ ids: [] });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('non-empty array');
        });
    });
});
