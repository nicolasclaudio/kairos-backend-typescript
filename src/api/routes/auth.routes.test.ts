
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { pool } from '../../config/database.js';

// Mock database query to avoid hitting real DB during tests
vi.mock('../../config/database.js', () => ({
    query: vi.fn(),
    pool: {
        query: vi.fn(),
        end: vi.fn()
    }
}));

import { query } from '../../config/database.js';

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            (query as any).mockResolvedValueOnce({ rows: [] }); // findByEmail - no user
            (query as any).mockResolvedValueOnce({ // create
                rows: [{
                    id: 1,
                    telegram_id: null,
                    username: 'tester',
                    timezone: 'UTC',
                    work_start_time: '09:00',
                    work_end_time: '17:00',
                    initial_velocity_multiplier: 1.0,
                    current_energy: 3,
                    email: 'test@kairos.com',
                    password_hash: 'hashedpassword'
                }]
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@kairos.com',
                    password: 'password123',
                    username: 'tester'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('email', 'test@kairos.com');
        });

        it('should fail if email is missing', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    password: 'password123'
                });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            // Mock findByEmail to return a user with a hashed password
            // We need a real hash for bcrypt.compare to work if we weren't mocking bcrypt,
            // but we are running in an environment where we might want to mock bcrypt too?
            // Actually, we are integration testing the route, so we want the service to run.
            // The service uses bcrypt. Let's mock the DB response with a hash that matches 'password123'.
            // To make it easier, we can mock bcrypt.compare or just generate a real hash in setup.
            // For unit/integration tests with mocks, it's safer to not rely on real bcrypt if we can avoid it for speed,
            // but here let's rely on AuthService logic.

            // Wait, I can't easily generate a valid bcrypt hash that matches 'password123' without importing bcrypt here.
            // Let's import bcrypt to generate a hash.
            const bcrypt = await import('bcrypt');
            const hash = await bcrypt.hash('password123', 10);

            (query as any).mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    email: 'test@kairos.com',
                    password_hash: hash,
                    telegram_id: '123'
                }]
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@kairos.com',
                    password: 'password123'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should fail with incorrect password', async () => {
            const bcrypt = await import('bcrypt');
            const hash = await bcrypt.hash('password123', 10);

            (query as any).mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    email: 'test@kairos.com',
                    password_hash: hash
                }]
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@kairos.com',
                    password: 'wrongpassword'
                });

            expect(res.status).toBe(401);
        });
    });
});
