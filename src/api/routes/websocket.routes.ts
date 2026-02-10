/**
 * WebSocket Stats Routes
 * Provides monitoring endpoints for WebSocket connections
 */

import { Router, Request, Response } from 'express';
import { WebSocketService } from '../../infrastructure/services/websocket.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * GET /api/ws/stats
 * Get WebSocket connection statistics
 * (Authenticated endpoint for monitoring)
 */
router.get('/stats', authenticateToken, (req: Request, res: Response) => {
    try {
        const wsService = WebSocketService.getInstance();
        const stats = wsService.getStats();

        res.status(200).json(stats);
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to get WebSocket stats',
            message: error.message
        });
    }
});

export default router;
