import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { ProjectRepository } from '../../infrastructure/repositories/project.repository.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();
const projectRepo = new ProjectRepository();
const projectController = new ProjectController(projectRepo);

// All routes are protected
router.use(authenticateToken);

router.post('/', (req, res) => projectController.createProject(req, res));
router.get('/', (req, res) => projectController.getProjects(req, res));
router.get('/:id/tasks', (req, res) => projectController.getProjectTasks(req, res));
router.patch('/:id', (req, res) => projectController.updateProject(req, res));
router.delete('/:id', (req, res) => projectController.deleteProject(req, res));

export default router;
