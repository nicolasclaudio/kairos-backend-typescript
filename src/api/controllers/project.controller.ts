import { Request, Response } from 'express';
import { ProjectRepository } from '../../infrastructure/repositories/project.repository.js';

export class ProjectController {
    constructor(private projectRepo: ProjectRepository) { }

    async createProject(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user.id;
            const { title, goalId, color, icon } = req.body;

            if (!title) {
                res.status(400).json({ error: 'Title is required' });
                return;
            }

            const project = await this.projectRepo.create(userId, {
                title,
                goalId,
                color,
                icon
            });
            res.status(201).json(project);
        } catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getProjects(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const projects = await this.projectRepo.findAll(userId);
            res.json(projects);
        } catch (error) {
            console.error('Error fetching projects:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getProjectTasks(req: Request, res: Response): Promise<void> {
        try {
            const projectId = parseInt(req.params.id as string, 10);

            if (isNaN(projectId)) {
                res.status(400).json({ error: 'Invalid project ID' });
                return;
            }

            const tasks = await this.projectRepo.getProjectTasks(projectId);
            res.json(tasks);
        } catch (error) {
            console.error('Error fetching project tasks:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateProject(req: Request, res: Response): Promise<void> {
        try {
            const projectId = parseInt(req.params.id as string, 10);
            const userId = (req as any).user?.id;
            const updates = req.body;

            if (isNaN(projectId) || !userId) {
                res.status(400).json({ error: 'Invalid parameters' });
                return;
            }

            const updatedProject = await this.projectRepo.update(projectId, userId, updates);

            if (!updatedProject) {
                res.status(404).json({ error: 'Project not found or permission denied' });
                return;
            }

            res.json(updatedProject);
        } catch (error) {
            console.error('Error updating project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async deleteProject(req: Request, res: Response): Promise<void> {
        try {
            const projectId = parseInt(req.params.id as string, 10);
            const userId = (req as any).user?.id;

            if (isNaN(projectId) || !userId) {
                res.status(400).json({ error: 'Invalid parameters' });
                return;
            }

            const deleted = await this.projectRepo.delete(projectId, userId);

            if (!deleted) {
                res.status(404).json({ error: 'Project not found or permission denied' });
                return;
            }

            res.status(204).send();
        } catch (error) {
            console.error('Error deleting project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
