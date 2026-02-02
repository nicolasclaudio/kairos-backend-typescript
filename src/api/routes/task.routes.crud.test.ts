
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { pool } from '../../config/database.js';

// Mock DB
vi.mock('../../config/database.js', () => ({
    query: vi.fn(),
    pool: {
        query: vi.fn(),
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

describe('Task CRUD Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('PATCH /api/tasks/:id', () => {
        it('should update task title and return updated task', async () => {
            const mockUpdatedTask = {
                id: 1,
                user_id: 1,
                title: 'Updated Title',
                status: 'pending',
                updated_at: new Date()
            };

            (query as any).mockResolvedValueOnce({ rows: [mockUpdatedTask] });

            const res = await request(app)
                .patch('/api/tasks/1')
                .send({ title: 'Updated Title' });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Updated Title');
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE tasks'),
                expect.arrayContaining(['Updated Title', 1, 1]) // taskId, userId, title
            );
        });

        it('should return 404 if task not found', async () => {
            (query as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .patch('/api/tasks/999')
                .send({ title: 'New' });

            expect(res.status).toBe(404);
        });
    });

    describe('PATCH /api/tasks/:id/complete', () => {
        it('should mark task as done', async () => {
            const mockDoneTask = {
                id: 1,
                user_id: 1,
                title: 'Task',
                status: 'done',
                completed_at: new Date()
            };
            (query as any)
                .mockResolvedValueOnce({ rowCount: 1 }) // First call: markAsDone
                .mockResolvedValueOnce({ rows: [mockDoneTask] }); // Second call: update (to fetch/return)

            const res = await request(app)
                .patch('/api/tasks/1/complete')
                .send();

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('done');
        });
    });

    describe('DELETE /api/tasks/:id', () => {
        it('should soft delete (archive) task', async () => {
            (query as any).mockResolvedValueOnce({ rowCount: 1 }); // Update success

            const res = await request(app)
                .delete('/api/tasks/1')
                .send();

            expect(res.status).toBe(204);
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining("status = 'archived'"),
                expect.arrayContaining([1, 1])
            );
        });
    });

    describe('GET /api/tasks', () => {
        it('should return tasks filtered by status', async () => {
            const mockTasks = [
                { id: 1, title: 'Task 1', status: 'pending', user_id: 1 },
                { id: 2, title: 'Task 2', status: 'pending', user_id: 1 }
            ];
            (query as any).mockResolvedValueOnce({ rows: mockTasks });

            const res = await request(app)
                .get('/api/tasks?status=pending')
                .send();

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE t.user_id = $1'),
                expect.arrayContaining([1, 'pending'])
            );
        });
    });
});
