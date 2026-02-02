
import { Router, Request, Response } from 'express';
import { AuthService } from '../../domain/services/auth.service.js';
import { UserRepository } from '../../infrastructure/repositories/user.repository.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);

router.post('/auth/register', async (req: Request, res: Response) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/auth/login', async (req: Request, res: Response) => {
    try {
        const result = await authService.login(req.body);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

router.get('/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
    res.json(req.user);
});

export default router;
