/**
 * Task Repository
 * Handles CRUD operations for Task entity with PostgreSQL
 */

import { Task } from '../../domain/entities.js';
import { query, pool } from '../../config/database.js';
import type { PoolClient } from 'pg';

export interface ITaskRepository {
    create(task: Omit<Task, 'id'>): Promise<Task>;
    findByGoalId(goalId: number): Promise<Task[]>;
    calculateTotalMinutesByGoal(goalId: number): Promise<number>;
    archiveLowPriorityTasks(userId: number, threshold: number): Promise<number>;
    rescheduleTasksToTomorrow(userId: number): Promise<number>;
    archive(taskId: number, userId: number): Promise<boolean>;
    delete(taskId: number, userId: number): Promise<boolean>;
    markAsDone(taskId: number, userId: number): Promise<boolean>;
    getCompletedTasks(userId: number, startDate: Date): Promise<any[]>;
    update(taskId: number, userId: number, updates: Partial<Task>): Promise<Task | null>;
    findAll(userId: number, filters?: { status?: string; priority?: number; goalId?: number }): Promise<Task[]>;
    // Batch Operations
    batchCreate(tasks: Omit<Task, 'id'>[], client?: PoolClient): Promise<Task[]>;
    batchMarkAsDone(taskIds: number[], userId: number, client?: PoolClient): Promise<number>;
    batchDelete(taskIds: number[], userId: number, client?: PoolClient): Promise<number>;
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
            completedAt: row.completed_at,
        };
    }

    /**
     * Mark a task as done
     */
    async markAsDone(taskId: number, userId: number): Promise<boolean> {
        const sql = `
            UPDATE tasks
            SET status = 'done', completed_at = NOW()
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

    /**
     * Get completed tasks since a specific date
     */
    async getCompletedTasks(userId: number, startDate: Date): Promise<any[]> {
        const sql = `
            SELECT t.*, g.meta_score
            FROM tasks t
            JOIN goals g ON t.goal_id = g.id
            WHERE t.user_id = $1 
            AND t.status = 'done'
            AND t.completed_at >= $2
        `;
        const result = await query(sql, [userId, startDate]);
        return result.rows.map(row => ({
            ...this.mapRowToTask(row),
            goalMetaScore: row.meta_score || 0
        }));
    }

    /**
     * Update task fields
     */
    async update(taskId: number, userId: number, updates: Partial<Task>): Promise<Task | null> {
        const allowedUpdates = [
            'title', 'estimatedMinutes', 'status', 'priorityOverride',
            'isFixed', 'executedMinutes', 'projectId'
        ];

        const validUpdates = Object.keys(updates).filter(key => allowedUpdates.includes(key));

        if (validUpdates.length === 0) return null;

        const setClause = validUpdates.map((key, index) => {
            const dbCol = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            return `${dbCol} = $${index + 3}`;
        }).join(', ');

        const sql = `
            UPDATE tasks
            SET ${setClause}, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;

        const values = [taskId, userId, ...validUpdates.map(key => (updates as any)[key])];

        const result = await query(sql, values);

        if (result.rows.length === 0) return null;
        return this.mapRowToTask(result.rows[0]);
    }

    /**
     * Soft delete a task (archive)
     */
    async delete(taskId: number, userId: number): Promise<boolean> {
        return this.archive(taskId, userId);
    }

    /**
     * Find all tasks with filters
     */
    async findAll(userId: number, filters: { status?: string; priority?: number; goalId?: number } = {}): Promise<Task[]> {
        let sql = `
            SELECT t.*, g.meta_score
            FROM tasks t
            LEFT JOIN goals g ON t.goal_id = g.id
            WHERE t.user_id = $1
        `;

        const params: any[] = [userId];
        let paramCount = 1;

        if (filters.status) {
            paramCount++;
            sql += ` AND t.status = $${paramCount}`;
            params.push(filters.status);
        } else {
            // Default: exclude archived unless specifically requested?
            // Usually findAll (GET /tasks) should assume pending if no status?
            // Or return all?
            // "Refactor de GET /api/tasks: Debe aceptar filtros como ?status=pending".
            // If no filter, maybe return all NON-ARCHIVED?
            sql += ` AND t.status != 'archived'`;
        }

        if (filters.priority) {
            // Priority logic is complex (MetaScore vs PriorityOverride), 
            // but user asks for simple filtering.
            // If priorityOverride exists, use it? Or just filter by override?
            // "priority=high" might map to a number range or specific override.
            // For strict filtering:
            paramCount++;
            sql += ` AND t.priority_override = $${paramCount}`;
            params.push(filters.priority);
        }

        if (filters.goalId) {
            paramCount++;
            sql += ` AND t.goal_id = $${paramCount}`;
            params.push(filters.goalId);
        }

        sql += ` ORDER BY t.created_at DESC`;

        const result = await query(sql, params);
        return result.rows.map(row => this.mapRowToTask(row));
    }
    /**
     * Get distinct completion dates for a user
     */
    async getCompletionDates(userId: number): Promise<Date[]> {
        const sql = `
            SELECT DISTINCT date_trunc('day', completed_at)::date as completion_date
            FROM tasks
            WHERE user_id = $1 
            AND status = 'done'
            AND completed_at IS NOT NULL
            ORDER BY completion_date DESC
        `;
        const result = await query(sql, [userId]);
        return result.rows.map(row => new Date(row.completion_date));
    }

    /**
     * Batch create multiple tasks in a single transaction
     * @param tasks Array of tasks to create
     * @param client Optional PoolClient for external transaction management
     * @returns Array of created tasks with IDs
     */
    async batchCreate(tasks: Omit<Task, 'id'>[], client?: PoolClient): Promise<Task[]> {
        const shouldManageTransaction = !client;
        const dbClient = client || await pool.connect();

        try {
            if (shouldManageTransaction) {
                await dbClient.query('BEGIN');
            }

            const createdTasks: Task[] = [];

            for (const task of tasks) {
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
                        required_energy,
                        scheduled_start_time
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
                    task.requiredEnergy || 3,
                    task.scheduledStartTime || null
                ];

                const result = await dbClient.query(sql, values);

                if (result.rows.length === 0) {
                    throw new Error(`Failed to create task: ${task.title}`);
                }

                createdTasks.push(this.mapRowToTask(result.rows[0]));
            }

            if (shouldManageTransaction) {
                await dbClient.query('COMMIT');
            }

            return createdTasks;
        } catch (error) {
            if (shouldManageTransaction) {
                await dbClient.query('ROLLBACK');
            }
            throw error;
        } finally {
            if (shouldManageTransaction) {
                dbClient.release();
            }
        }
    }

    /**
     * Batch mark multiple tasks as done in a single transaction
     * @param taskIds Array of task IDs to mark as done
     * @param userId User ID for ownership validation
     * @param client Optional PoolClient for external transaction management
     * @returns Number of tasks updated
     */
    async batchMarkAsDone(taskIds: number[], userId: number, client?: PoolClient): Promise<number> {
        const shouldManageTransaction = !client;
        const dbClient = client || await pool.connect();

        try {
            if (shouldManageTransaction) {
                await dbClient.query('BEGIN');
            }

            // First, validate that all tasks belong to the user
            const validationSql = `
                SELECT COUNT(*) as count
                FROM tasks
                WHERE id = ANY($1::int[]) AND user_id = $2
            `;
            const validationResult = await dbClient.query(validationSql, [taskIds, userId]);
            const validCount = parseInt(validationResult.rows[0].count, 10);

            if (validCount !== taskIds.length) {
                throw new Error(`Not all tasks belong to user or some tasks do not exist. Expected ${taskIds.length}, found ${validCount}`);
            }

            // Update all tasks to done
            const updateSql = `
                UPDATE tasks
                SET status = 'done', completed_at = NOW()
                WHERE id = ANY($1::int[]) AND user_id = $2
            `;
            const updateResult = await dbClient.query(updateSql, [taskIds, userId]);

            if (shouldManageTransaction) {
                await dbClient.query('COMMIT');
            }

            return updateResult.rowCount || 0;
        } catch (error) {
            if (shouldManageTransaction) {
                await dbClient.query('ROLLBACK');
            }
            throw error;
        } finally {
            if (shouldManageTransaction) {
                dbClient.release();
            }
        }
    }

    /**
     * Batch delete (archive) multiple tasks in a single transaction
     * @param taskIds Array of task IDs to delete
     * @param userId User ID for ownership validation
     * @param client Optional PoolClient for external transaction management
     * @returns Number of tasks deleted
     */
    async batchDelete(taskIds: number[], userId: number, client?: PoolClient): Promise<number> {
        const shouldManageTransaction = !client;
        const dbClient = client || await pool.connect();

        try {
            if (shouldManageTransaction) {
                await dbClient.query('BEGIN');
            }

            // First, validate that all tasks belong to the user
            const validationSql = `
                SELECT COUNT(*) as count
                FROM tasks
                WHERE id = ANY($1::int[]) AND user_id = $2
            `;
            const validationResult = await dbClient.query(validationSql, [taskIds, userId]);
            const validCount = parseInt(validationResult.rows[0].count, 10);

            if (validCount !== taskIds.length) {
                throw new Error(`Not all tasks belong to user or some tasks do not exist. Expected ${taskIds.length}, found ${validCount}`);
            }

            // Archive all tasks
            const archiveSql = `
                UPDATE tasks
                SET status = 'archived'
                WHERE id = ANY($1::int[]) AND user_id = $2
            `;
            const archiveResult = await dbClient.query(archiveSql, [taskIds, userId]);

            if (shouldManageTransaction) {
                await dbClient.query('COMMIT');
            }

            return archiveResult.rowCount || 0;
        } catch (error) {
            if (shouldManageTransaction) {
                await dbClient.query('ROLLBACK');
            }
            throw error;
        } finally {
            if (shouldManageTransaction) {
                dbClient.release();
            }
        }
    }
}

