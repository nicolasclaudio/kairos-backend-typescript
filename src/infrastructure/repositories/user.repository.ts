/**
 * User Repository
 * Handles CRUD operations for User entity with PostgreSQL
 */

import { User } from '../../domain/entities.js';
import { query } from '../../config/database.js';

export interface IUserRepository {
    create(user: Omit<User, 'id'>): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findByTelegramId(telegramId: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    updateEnergy(userId: number, energy: number): Promise<void>;
    update(userId: number, updates: Partial<User>): Promise<User | null>;
}

export class UserRepository implements IUserRepository {
    /**
     * Create a new user in the database
     * @param user User data without ID
     * @returns Created user with ID
     */
    async create(user: Omit<User, 'id'>): Promise<User> {
        const sql = `
            INSERT INTO users (telegram_id, username, timezone, work_start_time, work_end_time, initial_velocity_multiplier, current_energy, email, password_hash)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;

        const values = [
            user.telegramId,
            user.username || null,
            user.timezone,
            user.workStartTime,
            user.workEndTime,
            user.initialVelocityMultiplier,
            user.currentEnergy || 100, // Default energy
            user.email || null,
            user.passwordHash || null
        ];

        const result = await query(sql, values);

        // The RETURNING * clause ensures a row is returned on successful insert
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

    /**
     * Find user by Email
     * @param email User email
     * @returns User or null if not found
     */
    async findByEmail(email: string): Promise<User | null> {
        const sql = `
            SELECT * FROM users
            WHERE email = $1
        `;

        const result = await query(sql, [email]);

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
    async findById(id: number): Promise<User | null> {
        const sql = `SELECT * FROM users WHERE id = $1`;
        const result = await query(sql, [id]);
        if (result.rows.length === 0) return null;
        return this.mapRowToUser(result.rows[0]);
    }

    /**
     * Update user profile fields
     * @param userId User ID to update
     * @param updates Partial user object with fields to update
     * @returns Updated user or null if not found
     */
    async update(userId: number, updates: Partial<User>): Promise<User | null> {
        // Whitelist of allowed update fields
        const allowedUpdates = [
            'username',
            'timezone',
            'workStartTime',
            'workEndTime',
            'initialVelocityMultiplier',
            'currentEnergy'
        ];

        // Filter to only valid update fields
        const validUpdates = Object.keys(updates).filter(key => allowedUpdates.includes(key));

        if (validUpdates.length === 0) {
            return null; // No valid fields to update
        }

        // Build dynamic SET clause with proper snake_case column names
        const setClause = validUpdates.map((key, index) => {
            // Convert camelCase to snake_case
            const dbCol = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            return `${dbCol} = $${index + 2}`;
        }).join(', ');

        const sql = `
            UPDATE users
            SET ${setClause}, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;

        // Build values array: [userId, ...update values]
        const values = [userId, ...validUpdates.map(key => (updates as any)[key])];

        try {
            const result = await query(sql, values);
            return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    private mapRowToUser(row: any): User {
        return {
            id: row.id,
            telegramId: row.telegram_id,
            username: row.username,
            timezone: row.timezone,
            workStartTime: row.work_start_time,
            workEndTime: row.work_end_time,
            initialVelocityMultiplier: parseFloat(row.initial_velocity_multiplier),
            currentEnergy: row.current_energy || 3, // Default fallback
            email: row.email,
            passwordHash: row.password_hash
        };
    }
}
