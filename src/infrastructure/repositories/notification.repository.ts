/**
 * Notification Repository
 * Handles CRUD operations for notifications and notification settings
 */

import { Notification, NotificationSettings } from '../../domain/entities.js';
import { query } from '../../config/database.js';

export interface INotificationRepository {
    // Notifications CRUD
    create(notification: Omit<Notification, 'id'>): Promise<Notification>;
    findByUserId(userId: number, includeRead?: boolean): Promise<Notification[]>;
    findById(id: number): Promise<Notification | null>;
    markAsRead(id: number, userId: number): Promise<boolean>;
    deleteById(id: number, userId: number): Promise<boolean>;

    // Settings CRUD
    getSettings(userId: number): Promise<NotificationSettings | null>;
    upsertSettings(settings: Partial<NotificationSettings> & { userId: number }): Promise<NotificationSettings>;
}

export class NotificationRepository implements INotificationRepository {
    /**
     * Create a new notification
     */
    async create(notification: Omit<Notification, 'id'>): Promise<Notification> {
        const result = await query(`
            INSERT INTO notifications (
                user_id, type, title, message,
                related_entity_type, related_entity_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            notification.userId,
            notification.type,
            notification.title,
            notification.message,
            notification.relatedEntityType || null,
            notification.relatedEntityId || null
        ]);

        return this.mapNotification(result.rows[0]);
    }

    /**
 * Get all notifications for a user
     */
    async findByUserId(userId: number, includeRead: boolean = false): Promise<Notification[]> {
        const readFilter = includeRead ? '' : 'AND is_read = FALSE';

        const result = await query(`
            SELECT * FROM notifications
            WHERE user_id = $1 ${readFilter}
            ORDER BY created_at DESC
            LIMIT 100
        `, [userId]);

        return result.rows.map(row => this.mapNotification(row));
    }

    /**
     * Get notification by ID
     */
    async findById(id: number): Promise<Notification | null> {
        const result = await query(`
            SELECT * FROM notifications
            WHERE id = $1
        `, [id]);

        return result.rows.length > 0 ? this.mapNotification(result.rows[0]) : null;
    }

    /**
     * Mark notification as read (with ownership validation)
     */
    async markAsRead(id: number, userId: number): Promise<boolean> {
        const result = await query(`
            UPDATE notifications
            SET is_read = TRUE, read_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [id, userId]);

        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Delete notification (with ownership validation)
     */
    async deleteById(id: number, userId: number): Promise<boolean> {
        const result = await query(`
            DELETE FROM notifications
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [id, userId]);

        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Get notification settings for user
     */
    async getSettings(userId: number): Promise<NotificationSettings | null> {
        const result = await query(`
            SELECT * FROM notification_settings
            WHERE user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapSettings(result.rows[0]);
    }

    /**
     * Insert or update notification settings (UPSERT)
     */
    async upsertSettings(settings: Partial<NotificationSettings> & { userId: number }): Promise<NotificationSettings> {
        const result = await query(`
            INSERT INTO notification_settings (
                user_id, 
                enable_task_reminders,
                enable_streak_celebrations,
                enable_low_impact_warnings,
                enable_goal_deadlines,
                quiet_hours_start,
                quiet_hours_end
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id) DO UPDATE SET
                enable_task_reminders = COALESCE($2, notification_settings.enable_task_reminders),
                enable_streak_celebrations = COALESCE($3, notification_settings.enable_streak_celebrations),
                enable_low_impact_warnings = COALESCE($4, notification_settings.enable_low_impact_warnings),
                enable_goal_deadlines = COALESCE($5, notification_settings.enable_goal_deadlines),
                quiet_hours_start = COALESCE($6, notification_settings.quiet_hours_start),
                quiet_hours_end = COALESCE($7, notification_settings.quiet_hours_end),
                updated_at = NOW()
            RETURNING *
        `, [
            settings.userId,
            settings.enableTaskReminders ?? null,
            settings.enableStreakCelebrations ?? null,
            settings.enableLowImpactWarnings ?? null,
            settings.enableGoalDeadlines ?? null,
            settings.quietHoursStart || null,
            settings.quietHoursEnd || null
        ]);

        return this.mapSettings(result.rows[0]);
    }

    /**
     * Map database row to Notification entity
     */
    private mapNotification(row: any): Notification {
        return {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            title: row.title,
            message: row.message,
            relatedEntityType: row.related_entity_type,
            relatedEntityId: row.related_entity_id,
            isRead: row.is_read,
            createdAt: new Date(row.created_at),
            readAt: row.read_at ? new Date(row.read_at) : undefined
        };
    }

    /**
     * Map database row to NotificationSettings entity
     */
    private mapSettings(row: any): NotificationSettings {
        return {
            id: row.id,
            userId: row.user_id,
            enableTaskReminders: row.enable_task_reminders,
            enableStreakCelebrations: row.enable_streak_celebrations,
            enableLowImpactWarnings: row.enable_low_impact_warnings,
            enableGoalDeadlines: row.enable_goal_deadlines,
            quietHoursStart: row.quiet_hours_start,
            quietHoursEnd: row.quiet_hours_end,
            createdAt: row.created_at ? new Date(row.created_at) : undefined,
            updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
        };
    }
}
