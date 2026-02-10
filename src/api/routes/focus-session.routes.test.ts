import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import focusSessionRoutes from './focus-session.routes.js';
import { query } from '../../config/database.js';

vi.mock('../../config/database.js');
vi.mock('../middleware/auth.middleware.js', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 1 };
        next();
    }
}));

const app = express();
app.use(express.json());
app.use('/api/focus-sessions', focusSessionRoutes);

describe('Focus Session Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/focus-sessions', () => {
        it('should start a new focus session', async () => {
            const mockSession = {
                id: 1,
                user_id: 1,
                task_id: 5,
                started_at: new Date(),
                status: 'active',
                created_at: new Date(),
                updated_at: new Date()
            };

            // Mock findActiveByUser (no active session)
            (query as any).mockResolvedValueOnce({ rows: [] });
            // Mock create
            (query as any).mockResolvedValueOnce({ rows: [mockSession] });

            const res = await request(app)
                .post('/api/focus-sessions')
                .send({ taskId: 5 });

            expect(res.status).toBe(201);
            expect(res.body.taskId).toBe(5);
            expect(res.body.status).toBe('active');
        });

        it('should fail if user already has an active session', async () => {
            const activeSession = {
                id: 1,
                user_id: 1,
                task_id: 3,
                started_at: new Date(),
                status: 'active'
            };

            (query as any).mockResolvedValueOnce({ rows: [activeSession] });

            const res = await request(app)
                .post('/api/focus-sessions')
                .send({ taskId: 5 });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('active focus session');
        });

        it('should fail without taskId', async () => {
            const res = await request(app)
                .post('/api/focus-sessions')
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('PATCH /api/focus-sessions/:id/complete', () => {
        it('should complete a focus session', async () => {
            const completedSession = {
                id: 1,
                user_id: 1,
                task_id: 5,
                started_at: new Date(Date.now() - 30 * 60 * 1000),
                completed_at: new Date(),
                actual_minutes: 30,
                status: 'completed'
            };

            (query as any).mockResolvedValueOnce({ rows: [completedSession] });

            const res = await request(app)
                .patch('/api/focus-sessions/1/complete');

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('completed');
            expect(res.body.actualMinutes).toBe(30);
        });

        it('should return 404 if session not found', async () => {
            (query as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .patch('/api/focus-sessions/999/complete');

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/focus-sessions/stats', () => {
        it('should return focus session statistics', async () => {
            const dailyStats = [
                { date: '2026-02-09', total_minutes: 120, session_count: '4' }
            ];
            const weeklyStats = [
                { week: '2026-06', total_minutes: 450, session_count: '15' }
            ];

            (query as any).mockResolvedValueOnce({ rows: dailyStats });
            (query as any).mockResolvedValueOnce({ rows: weeklyStats });

            const res = await request(app).get('/api/focus-sessions/stats');

            expect(res.status).toBe(200);
            expect(res.body.daily).toHaveLength(1);
            expect(res.body.weekly).toHaveLength(1);
            expect(res.body.daily[0].totalMinutes).toBe(120);
        });
    });

    describe('GET /api/focus-sessions/active', () => {
        it('should return active session if exists', async () => {
            const activeSession = {
                id: 1,
                user_id: 1,
                task_id: 5,
                started_at: new Date(),
                status: 'active'
            };

            (query as any).mockResolvedValueOnce({ rows: [activeSession] });

            const res = await request(app).get('/api/focus-sessions/active');

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('active');
        });

        it('should return 404 if no active session', async () => {
            (query as any).mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/focus-sessions/active');

            expect(res.status).toBe(404);
        });
    });
});
