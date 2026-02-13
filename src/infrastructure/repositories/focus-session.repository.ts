import { query } from '../../config/database.js';
import { FocusSession } from '../../domain/entities.js';

export interface IFocusSessionRepository {
    create(userId: number, taskId: number): Promise<FocusSession>;
    complete(sessionId: number, userId: number): Promise<FocusSession | null>;
    findActiveByUser(userId: number): Promise<FocusSession | null>;
    getStats(userId: number, startDate?: Date, endDate?: Date): Promise<any>;
    findHistory(userId: number, limit: number, offset: number): Promise<{ sessions: FocusSession[], total: number }>;
}

export class FocusSessionRepository implements IFocusSessionRepository {
    async create(userId: number, taskId: number): Promise<FocusSession> {
        const sql = `
            INSERT INTO focus_sessions (user_id, task_id, started_at, status)
            VALUES ($1, $2, NOW(), 'active')
            RETURNING *
        `;
        const result = await query(sql, [userId, taskId]);
        return this.mapRowToFocusSession(result.rows[0]);
    }

    async complete(sessionId: number, userId: number): Promise<FocusSession | null> {
        const sql = `
            UPDATE focus_sessions
            SET 
                completed_at = NOW(),
                actual_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60,
                status = 'completed',
                updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND status = 'active'
            RETURNING *
        `;
        const result = await query(sql, [sessionId, userId]);
        return result.rows.length > 0 ? this.mapRowToFocusSession(result.rows[0]) : null;
    }

    async findActiveByUser(userId: number): Promise<FocusSession | null> {
        const sql = `
            SELECT * FROM focus_sessions
            WHERE user_id = $1 AND status = 'active'
            ORDER BY started_at DESC
            LIMIT 1
        `;
        const result = await query(sql, [userId]);
        return result.rows.length > 0 ? this.mapRowToFocusSession(result.rows[0]) : null;
    }

    async findHistory(userId: number, limit: number, offset: number): Promise<{ sessions: FocusSession[], total: number }> {
        const sql = `
            SELECT * FROM focus_sessions
            WHERE user_id = $1 AND status = 'completed'
            ORDER BY started_at DESC
            LIMIT $2 OFFSET $3
        `;
        const countSql = `
            SELECT COUNT(*) as count FROM focus_sessions
            WHERE user_id = $1 AND status = 'completed'
        `;

        const [result, countResult] = await Promise.all([
            query(sql, [userId, limit, offset]),
            query(countSql, [userId])
        ]);

        return {
            sessions: result.rows.map(row => this.mapRowToFocusSession(row)),
            total: parseInt(countResult.rows[0].count, 10)
        };
    }

    async getStats(userId: number, startDate?: Date, endDate?: Date): Promise<any> {
        const params: any[] = [userId];
        let dateFilter = '';

        if (startDate && endDate) {
            dateFilter = 'AND started_at BETWEEN $2 AND $3';
            params.push(startDate, endDate);
        } else if (startDate) {
            dateFilter = 'AND started_at >= $2';
            params.push(startDate);
        }

        // Daily stats
        const dailySQL = `
            SELECT 
                DATE(started_at) as date,
                SUM(actual_minutes)::INTEGER as total_minutes,
                COUNT(*) as session_count
            FROM focus_sessions
            WHERE user_id = $1 AND status = 'completed' ${dateFilter}
            GROUP BY DATE(started_at)
            ORDER BY date DESC
        `;
        const dailyResult = await query(dailySQL, params);

        // Weekly stats
        const weeklySQL = `
            SELECT 
                TO_CHAR(started_at, 'IYYY-IW') as week,
                SUM(actual_minutes)::INTEGER as total_minutes,
                COUNT(*) as session_count
            FROM focus_sessions
            WHERE user_id = $1 AND status = 'completed' ${dateFilter}
            GROUP BY TO_CHAR(started_at, 'IYYY-IW')
            ORDER BY week DESC
        `;
        const weeklyResult = await query(weeklySQL, params);

        return {
            daily: dailyResult.rows.map((row: any) => ({
                date: row.date,
                totalMinutes: row.total_minutes || 0,
                sessionCount: parseInt(row.session_count, 10)
            })),
            weekly: weeklyResult.rows.map((row: any) => ({
                week: row.week,
                totalMinutes: row.total_minutes || 0,
                sessionCount: parseInt(row.session_count, 10)
            }))
        };
    }

    private mapRowToFocusSession(row: any): FocusSession {
        return {
            id: row.id,
            userId: row.user_id,
            taskId: row.task_id,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            actualMinutes: row.actual_minutes,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
