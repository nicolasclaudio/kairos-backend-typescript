/**
 * User Repository
 * Handles CRUD operations for User entity with PostgreSQL
 */

import { User } from '../../domain/entities.js';
import { query } from '../../config/database.js';

export interface IUserRepository {
    create(user: Omit<User, 'id'>): Promise<User>;
    findByTelegramId(telegramId: string): Promise<User | null>;
    updateEnergy(userId: number, energy: number): Promise<void>;
}

export class UserRepository implements IUserRepository {
    /**
     * Create a new user in the database
     * @param user User data without ID
     * @returns Created user with ID
     */
    async create(user: Omit<User, 'id'>): Promise<User> {
        const sql = `
      INSERT INTO users (
        telegram_id,
        username,
        timezone,
        work_start_time,
        work_end_time,
        initial_velocity_multiplier,
        current_energy
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

        const values = [
            user.telegramId,
            user.username || null,
            user.timezone,
            user.workStartTime,
            user.workEndTime,
            user.initialVelocityMultiplier,
            user.currentEnergy || 3
        ];

        const result = await query(sql, values);

        if (result.rows.length === 0) {
            throw new Error('Failed to create user');
        }

        return this.mapRowToUser(result.rows[0]);
    }

    /**
     * Find user by Telegram ID
     * @param telegramId Telegram user ID
     * @returns User or null if not found
     */
    async findByTelegramId(telegramId: string): Promise<User | null> {
        const sql = `
      SELECT * FROM users
      WHERE telegram_id = $1
    `;

        const result = await query(sql, [telegramId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToUser(result.rows[0]);
    }

    async updateEnergy(userId: number, energy: number): Promise<void> {
        const sql = `UPDATE users SET current_energy = $1 WHERE id = $2`;
        await query(sql, [energy, userId]);
    }

    /**
     * Map database row (snake_case) to User entity (camelCase)
     * @param row Database row
     * @returns User entity
     */
    private mapRowToUser(row: any): User {
        return {
            id: row.id,
            telegramId: row.telegram_id,
            username: row.username,
            timezone: row.timezone,
            workStartTime: row.work_start_time,
            workEndTime: row.work_end_time,
            initialVelocityMultiplier: parseFloat(row.initial_velocity_multiplier),
            currentEnergy: row.current_energy || 3 // Default fallback
        };
    }
}
