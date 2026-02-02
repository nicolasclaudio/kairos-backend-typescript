
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

// Mock Auth Middleware
vi.mock('../../api/middleware/auth.middleware.js', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    }
}));

describe('Goal CRUD Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('PATCH /api/goals/:id', () => {
        it('should update goal title', async () => {
            const mockGoal = { id: 1, title: 'Updated', user_id: 1 };
            (query as any).mockResolvedValueOnce({ rows: [mockGoal] });

            const res = await request(app)
                .patch('/api/goals/1')
                .send({ title: 'Updated' });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Updated');
        });
    });

    describe('DELETE /api/goals/:id', () => {
        it('should fail if goal has tasks', async () => {
            // Mock finding tasks (TaskRepo.findByGoalId calls select * from tasks where goal_id...)
            // The controller calls taskRepo.findByGoalId.
            // We need to mock the query response for THAT call.
            // GoalController.deleteGoal flow:
            // 1. taskRepo.findByGoalId -> query(...)
            // 2. goalRepo.archive -> query(...)

            // Mock first query to return tasks
            const mockTasks = [{ id: 10, title: 'Task 1' }];
            (query as any).mockResolvedValueOnce({ rows: mockTasks });

            const res = await request(app)
                .delete('/api/goals/1')
                .send();

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Cannot delete goal');
        });

        it('should succeed if goal has NO tasks', async () => {
            // Mock first query (tasks) -> empty
            (query as any).mockResolvedValueOnce({ rows: [] });
            // Mock second query (archive goal) -> success (rowCount > 0)
            (query as any).mockResolvedValueOnce({ rowCount: 1 });

            const res = await request(app)
                .delete('/api/goals/1')
                .send();

            expect(res.status).toBe(204);
        });
    });
});
