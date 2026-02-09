import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import projectRoutes from './project.routes.js';
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
app.use('/api/projects', projectRoutes);

describe('Project Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/projects', () => {
        it('should create a new project', async () => {
            const mockProject = {
                id: 1,
                user_id: 1,
                goal_id: 2,
                title: 'Rediseño Web',
                status: 'active',
                created_at: new Date(),
                updated_at: new Date()
            };

            (query as any).mockResolvedValueOnce({ rows: [mockProject] });

            const res = await request(app)
                .post('/api/projects')
                .send({ title: 'Rediseño Web', goalId: 2 });

            expect(res.status).toBe(201);
            expect(res.body.title).toBe('Rediseño Web');
            expect(res.body.goalId).toBe(2);
        });

        it('should fail without title', async () => {
            const res = await request(app)
                .post('/api/projects')
                .send({ goalId: 2 });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/projects', () => {
        it('should list all user projects', async () => {
            const mockProjects = [
                { id: 1, user_id: 1, title: 'Project 1', status: 'active' },
                { id: 2, user_id: 1, title: 'Project 2', status: 'active' }
            ];

            (query as any).mockResolvedValueOnce({ rows: mockProjects });

            const res = await request(app).get('/api/projects');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });
    });

    describe('GET /api/projects/:id/tasks', () => {
        it('should return tasks for a project', async () => {
            const mockTasks = [
                { id: 10, project_id: 1, title: 'Task 1' },
                { id: 11, project_id: 1, title: 'Task 2' }
            ];

            (query as any).mockResolvedValueOnce({ rows: mockTasks });

            const res = await request(app).get('/api/projects/1/tasks');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });
    });

    describe('PATCH /api/projects/:id', () => {
        it('should update project title', async () => {
            const mockUpdated = {
                id: 1,
                user_id: 1,
                title: 'Updated Title',
                status: 'active'
            };

            (query as any).mockResolvedValueOnce({ rows: [mockUpdated] });

            const res = await request(app)
                .patch('/api/projects/1')
                .send({ title: 'Updated Title' });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Updated Title');
        });
    });

    describe('DELETE /api/projects/:id', () => {
        it('should delete a project', async () => {
            (query as any).mockResolvedValueOnce({ rowCount: 1 });

            const res = await request(app).delete('/api/projects/1');

            expect(res.status).toBe(204);
        });

        it('should return 404 if project not found', async () => {
            (query as any).mockResolvedValueOnce({ rowCount: 0 });

            const res = await request(app).delete('/api/projects/999');

            expect(res.status).toBe(404);
        });
    });
});
