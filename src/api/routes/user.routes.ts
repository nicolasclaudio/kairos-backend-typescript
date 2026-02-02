/**
 * User Routes
 * API routes for user operations
 */

import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { UserRepository } from '../../infrastructure/repositories/user.repository.js';
import { validateUserRegistration } from '../middleware/validation.js';

const router = Router();
const userRepository = new UserRepository();
const userController = new UserController(userRepository);

/**
 * POST /api/users
 * Register a new user
 */
router.post('/users', validateUserRegistration, (req, res) =>
    userController.register(req, res)
);

export default router;
