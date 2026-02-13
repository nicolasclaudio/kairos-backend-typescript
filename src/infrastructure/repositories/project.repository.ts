import { query } from '../../config/database.js';
import { Project } from '../../domain/entities.js';

export interface IProjectRepository {
    create(userId: number, data: { title: string; goalId?: number; color?: string; icon?: string }): Promise<Project>;
    findAll(userId: number): Promise<Project[]>;
    findById(projectId: number): Promise<Project | null>;
    update(projectId: number, userId: number, updates: Partial<Project>): Promise<Project | null>;
    delete(projectId: number, userId: number): Promise<boolean>;
    getProjectTasks(projectId: number): Promise<any[]>;
}

export class ProjectRepository implements IProjectRepository {
    async create(userId: number, data: { title: string; goalId?: number; color?: string; icon?: string }): Promise<Project> {
        const sql = `
            INSERT INTO projects (user_id, title, goal_id, color, icon)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await query(sql, [
            userId,
            data.title,
            data.goalId || null,
            data.color || '#6366f1',
            data.icon || null
        ]);
        return this.mapRowToProject(result.rows[0]);
    }

    async findAll(userId: number): Promise<Project[]> {
        const sql = `
            SELECT * FROM projects
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
        const result = await query(sql, [userId]);
        return result.rows.map((row: any) => this.mapRowToProject(row));
    }

    async findById(projectId: number): Promise<Project | null> {
        const sql = `SELECT * FROM projects WHERE id = $1`;
        const result = await query(sql, [projectId]);
        return result.rows.length > 0 ? this.mapRowToProject(result.rows[0]) : null;
    }

    async update(projectId: number, userId: number, updates: Partial<Project>): Promise<Project | null> {
        const allowedUpdates = ['title', 'goalId', 'status', 'color', 'icon'];
        const validUpdates = Object.keys(updates).filter(key => allowedUpdates.includes(key));

        if (validUpdates.length === 0) return null;

        const setClause = validUpdates.map((key, index) => {
            const dbCol = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            return `${dbCol} = $${index + 3}`;
        }).join(', ');

        const sql = `
            UPDATE projects
            SET ${setClause}, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;

        const values = [projectId, userId, ...validUpdates.map(key => (updates as any)[key])];
        const result = await query(sql, values);

        return result.rows.length > 0 ? this.mapRowToProject(result.rows[0]) : null;
    }

    async delete(projectId: number, userId: number): Promise<boolean> {
        const sql = `
            DELETE FROM projects
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `;
        const result = await query(sql, [projectId, userId]);
        return (result.rowCount || 0) > 0;
    }

    async getProjectTasks(projectId: number): Promise<any[]> {
        const sql = `
            SELECT t.*, g.meta_score, g.title as goal_title
            FROM tasks t
            JOIN goals g ON t.goal_id = g.id
            WHERE t.project_id = $1
            ORDER BY t.created_at DESC
        `;
        const result = await query(sql, [projectId]);
        return result.rows;
    }

    private mapRowToProject(row: any): Project {
        return {
            id: row.id,
            userId: row.user_id,
            goalId: row.goal_id,
            title: row.title,
            color: row.color,
            icon: row.icon,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
