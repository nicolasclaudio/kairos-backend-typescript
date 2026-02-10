/**
 * Notification Controller
 * Handles HTTP requests for notifications and settings
 */

import { Request, Response } from 'express';
import { INotificationRepository } from '../../infrastructure/repositories/notification.repository.js';

export class NotificationController {
    constructor(private notificationRepo: INotificationRepository) { }

    /**
     * GET /api/notifications
     * Get all notifications for authenticated user
     */
    async getNotifications(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: User ID required' });
                return;
            }

            const includeRead = req.query.includeRead === 'true';
            const notifications = await this.notificationRepo.findByUserId(userId, includeRead);

            const unreadCount = notifications.filter(n => !n.isRead).length;

            res.status(200).json({
                notifications,
                unreadCount
            });
        } catch (error: any) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * PATCH /api/notifications/:id/read
     * Mark notification as read
     */
    async markAsRead(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const notificationId = parseInt(String(req.params.id));

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: User ID required' });
                return;
            }

            if (isNaN(notificationId) || notificationId <= 0) {
                res.status(400).json({ error: 'Invalid notification ID' });
                return;
            }

            const success = await this.notificationRepo.markAsRead(notificationId, userId);

            if (!success) {
                res.status(404).json({
                    error: 'Notification not found or does not belong to user'
                });
                return;
            }

            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * DELETE /api/notifications/:id
     * Delete notification
     */
    async deleteNotification(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;
            const notificationId = parseInt(String(req.params.id));

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: User ID required' });
                return;
            }

            if (isNaN(notificationId) || notificationId <= 0) {
                res.status(400).json({ error: 'Invalid notification ID' });
                return;
            }

            const success = await this.notificationRepo.deleteById(notificationId, userId);

            if (!success) {
                res.status(404).json({
                    error: 'Notification not found or does not belong to user'
                });
                return;
            }

            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Error deleting notification:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * GET /api/notifications/settings
     * Get notification settings for user
     */
    async getSettings(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: User ID required' });
                return;
            }

            const settings = await this.notificationRepo.getSettings(userId);

            if (!settings) {
                // Return default settings if none exist
                res.status(200).json({
                    userId,
                    enableTaskReminders: true,
                    enableStreakCelebrations: true,
                    enableLowImpactWarnings: true,
                    enableGoalDeadlines: true
                });
                return;
            }

            res.status(200).json(settings);
        } catch (error: any) {
            console.error('Error fetching notification settings:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    /**
     * POST /api/notifications/settings
     * Update notification settings (upsert)
     */
    async updateSettings(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: User ID required' });
                return;
            }

            const {
                enableTaskReminders,
                enableStreakCelebrations,
                enableLowImpactWarnings,
                enableGoalDeadlines,
                quietHoursStart,
                quietHoursEnd
            } = req.body;

            // Validate boolean fields if provided
            const booleanFields = [
                enableTaskReminders,
                enableStreakCelebrations,
                enableLowImpactWarnings,
                enableGoalDeadlines
            ];

            for (const field of booleanFields) {
                if (field !== undefined && typeof field !== 'boolean') {
                    res.status(400).json({
                        error: 'Invalid settings: boolean fields must be true or false'
                    });
                    return;
                }
            }

            // Validate time format (HH:mm) if provided
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (quietHoursStart && !timeRegex.test(quietHoursStart)) {
                res.status(400).json({
                    error: 'Invalid quietHoursStart format. Expected HH:mm'
                });
                return;
            }
            if (quietHoursEnd && !timeRegex.test(quietHoursEnd)) {
                res.status(400).json({
                    error: 'Invalid quietHoursEnd format. Expected HH:mm'
                });
                return;
            }

            const settings = await this.notificationRepo.upsertSettings({
                userId,
                enableTaskReminders,
                enableStreakCelebrations,
                enableLowImpactWarnings,
                enableGoalDeadlines,
                quietHoursStart,
                quietHoursEnd
            });

            res.status(200).json(settings);
        } catch (error: any) {
            console.error('Error updating notification settings:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }
}
