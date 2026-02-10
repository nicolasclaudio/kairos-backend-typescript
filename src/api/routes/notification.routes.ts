/**
 * Notification Routes
 * Routes for managing user notifications and notification settings
 */

import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { NotificationRepository } from '../../infrastructure/repositories/notification.repository.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();
const notificationRepo = new NotificationRepository();
const notificationController = new NotificationController(notificationRepo);

/**
 * GET /api/notifications
 * Get all notifications for authenticated user
 * Query params: ?includeRead=true (optional, default: false)
 */
router.get('/notifications', authenticateToken, (req, res) =>
    notificationController.getNotifications(req, res)
);

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
router.patch('/notifications/:id/read', authenticateToken, (req, res) =>
    notificationController.markAsRead(req, res)
);

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
router.delete('/notifications/:id', authenticateToken, (req, res) =>
    notificationController.deleteNotification(req, res)
);

/**
 * GET /api/notifications/settings
 * Get notification settings for authenticated user
 */
router.get('/notifications/settings', authenticateToken, (req, res) =>
    notificationController.getSettings(req, res)
);

/**
 * POST /api/notifications/settings
 * Update notification settings for authenticated user
 */
router.post('/notifications/settings', authenticateToken, (req, res) =>
    notificationController.updateSettings(req, res)
);

export default router;
