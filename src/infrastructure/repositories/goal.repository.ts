/**
 * Goal Repository
 * Handles CRUD operations for Goal entity with PostgreSQL
 */

import { Goal } from '../../domain/entities.js';
import { query } from '../../config/database.js';

export interface IGoalRepository {
    create(goal: Omit<Goal, 'id'>): Promise<Goal>;
    findByUserId(userId: number): Promise<Goal[]>;
    update(goalId: number, userId: number, updates: Partial<Goal>): Promise<Goal | null>;
    archive(goalId: number, userId: number): Promise<boolean>;
}

export class GoalRepository implements IGoalRepository {
    /**
     * Create a new goal in the database
     * @param goal Goal data without ID
     * @returns Created goal with ID
     */
    async create(goal: Omit<Goal, 'id'>): Promise<Goal> {
        const sql = `
      INSERT INTO goals (
        user_id,
        title,
        meta_score,
        target_date,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

        const values = [
            goal.userId,
            goal.title,
            goal.metaScore,
            goal.targetDate || null,
            'active', // Default status
        ];

        const result = await query(sql, values);

        if (result.rows.length === 0) {
            throw new Error('Failed to create goal');
        }

        return this.mapRowToGoal(result.rows[0]);
    }

    /**
     * Find all goals for a specific user
     * @param userId User ID
     * @returns Array of goals for the user
     */
    async findByUserId(userId: number): Promise<Goal[]> {
        const sql = `
      SELECT * FROM goals
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

        const result = await query(sql, [userId]);

        return result.rows.map((row) => this.mapRowToGoal(row));
    }

    /**
     * Archive a goal
     */
    async archive(goalId: number, userId: number): Promise<boolean> {
        const sql = `
            UPDATE goals
            SET status = 'archived'
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `;
        const result = await query(sql, [goalId, userId]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Update a goal
     */
    async update(goalId: number, userId: number, updates: Partial<Goal>): Promise<Goal | null> {
        const allowedUpdates = ['title', 'metaScore', 'targetDate', 'status'];
        const validUpdates = Object.keys(updates).filter(key => allowedUpdates.includes(key));

        if (validUpdates.length === 0) return null;

        const setClause = validUpdates.map((key, index) => {
            const dbCol = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            return `${dbCol} = $${index + 3}`;
        }).join(', ');

        const sql = `
            UPDATE goals
            SET ${setClause}, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;

        const values = [goalId, userId, ...validUpdates.map(key => (updates as any)[key])];

        const result = await query(sql, values);

        if (result.rows.length === 0) return null;
        return this.mapRowToGoal(result.rows[0]);
    }

    /**
     * Map database row (snake_case) to Goal entity (camelCase)
     * @param row Database row
     * @returns Goal entity
     */
    private mapRowToGoal(row: any): Goal {
        return {
            id: row.id,
            userId: row.user_id,
            title: row.title,
            metaScore: row.meta_score,
            targetDate: row.target_date,
            status: row.status,
        };
    }
}
