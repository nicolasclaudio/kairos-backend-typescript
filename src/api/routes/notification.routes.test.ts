/**
 * Integration Tests for Notification Routes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

// Mock the database module
vi.mock('../../config/database.js', () => ({
    query: vi.fn(),
}));

// Mock the auth middleware
vi.mock('../middleware/auth.middleware.js', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'test@example.com' };
        next();
    },
}));

import { query } from '../../config/database.js';

describe('Notification Routes', () => {
    let mockQuery: any;

    beforeEach(() => {
        mockQuery = query as any;
        vi.clearAllMocks();
    });

    describe('GET /api/notifications', () => {
        it('should return unread notifications by default', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {
                        id: 1,
                        user_id: 1,
                        type: 'task_reminder',
                        title: 'Test Notification',
                        message: 'Test message',
                        related_entity_type: 'task',
                        related_entity_id: 5,
                        is_read: false,
                        created_at: new Date(),
                    },
                ],
            });

            const res = await request(app).get('/api/notifications');

            expect(res.status).toBe(200);
            expect(res.body.notifications).toHaveLength(1);
            expect(res.body.unreadCount).toBe(1);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('AND is_read = FALSE'),
                [1]
            );
        });

        it('should return all notifications when includeRead=true', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {
                        id: 1,
                        user_id: 1,
                        type: 'task_reminder',
                        title: 'Test',
                        message: 'Test',
                        is_read: true,
                        created_at: new Date(),
                        read_at: new Date(),
                    },
                ],
            });

            const res = await request(app).get(
                '/api/notifications?includeRead=true'
            );

            expect(res.status).toBe(200);
            expect(res.body.notifications).toHaveLength(1);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.not.stringContaining('AND is_read = FALSE'),
                [1]
            );
        });

        it('should return empty array for user with no notifications', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/notifications');

            expect(res.status).toBe(200);
            expect(res.body.notifications).toHaveLength(0);
            expect(res.body.unreadCount).toBe(0);
        });
    });

    describe('PATCH /api/notifications/:id/read', () => {
        it('should mark notification as read', async () => {
            mockQuery.mockResolvedValueOnce({ rowCount: 1 });

            const res = await request(app).patch('/api/notifications/1/read');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE notifications'),
                [1, 1]
            );
        });

        it('should return 404 for non-existent notification', async () => {
            mockQuery.mockResolvedValueOnce({ rowCount: 0 });

            const res = await request(app).patch('/api/notifications/999/read');

            expect(res.status).toBe(404);
            expect(res.body.error).toContain('not found');
        });

        it('should return 400 for invalid notification ID', async () => {
            const res = await request(app).patch('/api/notifications/abc/read');

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Invalid notification ID');
        });

        it('should not allow marking other user notifications', async () => {
            mockQuery.mockResolvedValueOnce({ rowCount: 0 });

            const res = await request(app).patch('/api/notifications/5/read');

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/notifications/:id', () => {
        it('should delete notification', async () => {
            mockQuery.mockResolvedValueOnce({ rowCount: 1 });

            const res = await request(app).delete('/api/notifications/1');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM notifications'),
                [1, 1]
            );
        });

        it('should return 404 for non-existent notification', async () => {
            mockQuery.mockResolvedValueOnce({ rowCount: 0 });

            const res = await request(app).delete('/api/notifications/999');

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/notifications/settings', () => {
        it('should return user notification settings', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {
                        id: 1,
                        user_id: 1,
                        enable_task_reminders: true,
                        enable_streak_celebrations: false,
                        enable_low_impact_warnings: true,
                        enable_goal_deadlines: true,
                        quiet_hours_start: null,
                        quiet_hours_end: null,
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            });

            const res = await request(app).get('/api/notifications/settings');

            expect(res.status).toBe(200);
            expect(res.body.enableTaskReminders).toBe(true);
            expect(res.body.enableStreakCelebrations).toBe(false);
        });

        it('should return default settings if none exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).get('/api/notifications/settings');

            expect(res.status).toBe(200);
            expect(res.body.enableTaskReminders).toBe(true);
            expect(res.body.enableStreakCelebrations).toBe(true);
            expect(res.body.enableLowImpactWarnings).toBe(true);
            expect(res.body.enableGoalDeadlines).toBe(true);
        });
    });

    describe('POST /api/notifications/settings', () => {
        it('should create/update notification settings', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {
                        id: 1,
                        user_id: 1,
                        enable_task_reminders: false,
                        enable_streak_celebrations: true,
                        enable_low_impact_warnings: true,
                        enable_goal_deadlines: false,
                        quiet_hours_start: '22:00',
                        quiet_hours_end: '08:00',
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            });

            const res = await request(app)
                .post('/api/notifications/settings')
                .send({
                    enableTaskReminders: false,
                    enableStreakCelebrations: true,
                    enableLowImpactWarnings: true,
                    enableGoalDeadlines: false,
                    quietHoursStart: '22:00',
                    quietHoursEnd: '08:00',
                });

            expect(res.status).toBe(200);
            expect(res.body.enableTaskReminders).toBe(false);
            expect(res.body.quietHoursStart).toBe('22:00');
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO notification_settings'),
                expect.arrayContaining([1, false, true, true, false, '22:00', '08:00'])
            );
        });

        it('should validate boolean fields', async () => {
            const res = await request(app)
                .post('/api/notifications/settings')
                .send({
                    enableTaskReminders: 'not a boolean',
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('boolean fields');
        });

        it('should validate quiet hours format', async () => {
            const res = await request(app)
                .post('/api/notifications/settings')
                .send({
                    quietHoursStart: '25:00', // Invalid hour
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('quietHoursStart');
        });

        it('should accept partial updates', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {
                        id: 1,
                        user_id: 1,
                        enable_task_reminders: false,
                        enable_streak_celebrations: true,
                        enable_low_impact_warnings: true,
                        enable_goal_deadlines: true,
                        created_at: new Date(),
                        updated_at: new Date(),
                    },
                ],
            });

            const res = await request(app)
                .post('/api/notifications/settings')
                .send({
                    enableTaskReminders: false,
                });

            expect(res.status).toBe(200);
            expect(res.body.enableTaskReminders).toBe(false);
        });
    });
});
