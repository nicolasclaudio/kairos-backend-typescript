/**
 * Task Repository
 * Handles CRUD operations for Task entity with PostgreSQL
 */

import { Task } from '../../domain/entities.js';
import { query } from '../../config/database.js';

export interface ITaskRepository {
    create(task: Omit<Task, 'id'>): Promise<Task>;
    findByGoalId(goalId: number): Promise<Task[]>;
    calculateTotalMinutesByGoal(goalId: number): Promise<number>;
    archiveLowPriorityTasks(userId: number, threshold: number): Promise<number>;
    rescheduleTasksToTomorrow(userId: number): Promise<number>;
    archive(taskId: number, userId: number): Promise<boolean>;
    markAsDone(taskId: number, userId: number): Promise<boolean>;
}

export class TaskRepository implements ITaskRepository {
    /**
     * Create a new task in the database
     * @param task Task data without ID
     * @returns Created task with ID
     */
    async create(task: Omit<Task, 'id'>): Promise<Task> {
        const sql = `
      INSERT INTO tasks (
        user_id,
        goal_id,
        project_id,
        title,
        estimated_minutes,
        status,
        priority_override,
        is_fixed,
        scheduled_start_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

        const values = [
            task.userId,
            task.goalId,
            task.projectId || null,
            task.title,
            task.estimatedMinutes || 30,
            task.status || 'pending',
            task.priorityOverride || 3,
            task.isFixed || false,
            task.scheduledStartTime || null
        ];

        const result = await query(sql, values);

        if (result.rows.length === 0) {
            throw new Error('Failed to create task');
        }

        return this.mapRowToTask(result.rows[0]);
    }

    /**
     * Find all pending tasks for a user including goal info
     */
    async findAllPendingWithGoalInfo(userId: number): Promise<any[]> {
        const sql = `
            SELECT t.*, g.title as goal_title, g.meta_score
            FROM tasks t
            LEFT JOIN goals g ON t.goal_id = g.id
            WHERE t.user_id = $1 AND t.status = 'pending'
        `;

        const result = await query(sql, [userId]);
        return result.rows.map(row => ({
            ...this.mapRowToTask(row),
            goalTitle: row.goal_title,
            goalMetaScore: row.meta_score || 0
        }));
    }

    /**
     * Find all tasks for a specific goal
     * @param goalId Goal ID
     * @returns Array of tasks for the goal
     */
    async findByGoalId(goalId: number): Promise<Task[]> {
        const sql = `
      SELECT * FROM tasks
      WHERE goal_id = $1
      ORDER BY created_at DESC
    `;

        const result = await query(sql, [goalId]);

        return result.rows.map((row) => this.mapRowToTask(row));
    }

    /**
     * Calculate total estimated minutes for a goal
     * @param goalId Goal ID
     * @returns Total estimated minutes
     */
    async calculateTotalMinutesByGoal(goalId: number): Promise<number> {
        const sql = `
      SELECT COALESCE(SUM(estimated_minutes), 0) as total
      FROM tasks
      WHERE goal_id = $1
    `;

        const result = await query(sql, [goalId]);

        return parseInt(result.rows[0].total, 10) || 0;
    }

    /**
     * Map database row (snake_case) to Task entity (camelCase)
     * @param row Database row
     * @returns Task entity
     */
    private mapRowToTask(row: any): Task {
        return {
            id: row.id,
            userId: row.user_id,
            goalId: row.goal_id,
            projectId: row.project_id,
            title: row.title,
            estimatedMinutes: row.estimated_minutes,
            status: row.status,
            priorityOverride: row.priority_override,
            isFixed: row.is_fixed,
            requiredEnergy: row.required_energy || 3,
            createdAt: row.created_at,
            scheduledStartTime: row.scheduled_start_time,
        };
    }

    /**
     * Mark a task as done
     */
    async markAsDone(taskId: number, userId: number): Promise<boolean> {
        const sql = `
            UPDATE tasks
            SET status = 'done'
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `;

        const result = await query(sql, [taskId, userId]);
        return (result.rowCount || 0) > 0;
    }

    async archive(taskId: number, userId: number): Promise<boolean> {
        const sql = `
            UPDATE tasks
            SET status = 'archived'
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `;
        const result = await query(sql, [taskId, userId]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Count pending tasks for a goal
     */
    async countPendingByGoalId(goalId: number): Promise<number> {
        const sql = `
            SELECT COUNT(*) as count FROM tasks
            WHERE goal_id = $1 AND status = 'pending'
        `;
        const result = await query(sql, [goalId]);
        return parseInt(result.rows[0].count, 10);
    }

    async getDailyStats(userId: number): Promise<{ completed: number }> {
        const sql = `
            SELECT COUNT(*) as count FROM tasks
            WHERE user_id = $1 
            AND status = 'done' 
            AND updated_at::date = CURRENT_DATE
        `;

        const result = await query(sql, [userId]);
        return { completed: parseInt(result.rows[0].count, 10) || 0 };
    }

    async getTotalRemainingMinutes(userId: number): Promise<number> {
        const sql = `
            SELECT COALESCE(SUM(estimated_minutes), 0) as total
            FROM tasks
            WHERE user_id = $1 AND status = 'pending'
        `;
        const result = await query(sql, [userId]);
        return parseInt(result.rows[0].total, 10) || 0;
    }

    /**
     * Sum estimated minutes for all pending tasks (alias for getTotalRemainingMinutes)
     */
    async sumPendingEstimatedMinutes(userId: number): Promise<number> {
        return this.getTotalRemainingMinutes(userId);
    }

    /**
     * Archive tasks with meta_score below threshold
     */
    async archiveLowPriorityTasks(userId: number, threshold: number): Promise<number> {
        const sql = `
            WITH tasks_to_archive AS (
                SELECT t.id
                FROM tasks t
                JOIN goals g ON t.goal_id = g.id
                WHERE t.user_id = $1 
                AND t.status = 'pending'
                AND g.meta_score < $2
            )
            UPDATE tasks
            SET status = 'archived'
            WHERE id IN (SELECT id FROM tasks_to_archive)
        `;
        const result = await query(sql, [userId, threshold]);
        return result.rowCount || 0;
    }

    /**
     * Reschedule tasks to tomorrow (Soft Reset)
     * For now, this just ensures they are pending and clears any today-specific scheduling if strict?
     * Or better: shift scheduled_start_time to tomorrow?
     * For V1 Soft Reset: We just assume 'pending' tasks without fixed dates are moved to backlog.
     * But if they HAVE scheduled_start_time today, we move them to tomorrow same time? 
     * Or just NULL the scheduled_start_time to throw them back to pool?
     * Let's decided: "Move to tomorrow" -> Set scheduled_start_time = scheduled_start_time + 24h OR set to tomorrow 9am?
     * Let's keep it simple: Remove scheduled_start_time (back to backlog pool) for non-fixed tasks.
     * Fixed tasks should arguably stay? "Reschedule non-priority tasks".
     * Let's strictly archive? No, Soft says "Move to tomorrow".
     * Implementing: Set scheduled_start_time to NULL for all pending tasks (except is_fixed?).
     * THIS puts them back in the general prioritization pool for next planning.
     */
    async rescheduleTasksToTomorrow(userId: number): Promise<number> {
        const sql = `
            UPDATE tasks
            SET scheduled_start_time = NULL
            WHERE user_id = $1 
            AND status = 'pending'
            AND is_fixed = false
        `;
        const result = await query(sql, [userId]);
        return result.rowCount || 0;
    }
}
