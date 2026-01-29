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
        is_fixed
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
            createdAt: row.created_at,
        };
    }
}
