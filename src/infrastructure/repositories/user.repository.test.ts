/**
 * UserRepository Tests
 * Unit tests for User Repository CRUD operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from './user.repository.js';
import type { User } from '../../domain/entities.js';

// Mock the database query function
vi.mock('../../config/database.js', () => ({
    query: vi.fn(),
}));

import { query } from '../../config/database.js';

describe('UserRepository', () => {
    let userRepo: UserRepository;

    beforeEach(() => {
        userRepo = new UserRepository();
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('should create a new user and return it with generated ID', async () => {
            const newUser: Omit<User, 'id'> = {
                telegramId: '123456789',
                username: 'test_user',
                timezone: 'America/Mexico_City',
                workStartTime: '09:00',
                workEndTime: '18:00',
                initialVelocityMultiplier: 1.0,
            };

            const mockDbRow = {
                id: 1,
                telegram_id: '123456789',
                username: 'test_user',
                timezone: 'America/Mexico_City',
                work_start_time: '09:00',
                work_end_time: '18:00',
                initial_velocity_multiplier: '1.00',
            };

            (query as any).mockResolvedValue({ rows: [mockDbRow] });

            const result = await userRepo.create(newUser);

            expect(result).toEqual({
                id: 1,
                telegramId: '123456789',
                username: 'test_user',
                timezone: 'America/Mexico_City',
                workStartTime: '09:00',
                workEndTime: '18:00',
                initialVelocityMultiplier: 1.0,
            });

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO users'),
                ['123456789', 'test_user', 'America/Mexico_City', '09:00', '18:00', 1.0]
            );
        });

        it('should throw error if user creation fails', async () => {
            const newUser: Omit<User, 'id'> = {
                telegramId: '123456789',
                username: 'test_user',
                timezone: 'America/Mexico_City',
                workStartTime: '09:00',
                workEndTime: '18:00',
                initialVelocityMultiplier: 1.0,
            };

            (query as any).mockResolvedValue({ rows: [] });

            await expect(userRepo.create(newUser)).rejects.toThrow('Failed to create user');
        });
    });

    describe('findByTelegramId', () => {
        it('should find and return user by telegram ID', async () => {
            const mockDbRow = {
                id: 1,
                telegram_id: '123456789',
                username: 'test_user',
                timezone: 'America/Mexico_City',
                work_start_time: '09:00',
                work_end_time: '18:00',
                initial_velocity_multiplier: '1.00',
            };

            (query as any).mockResolvedValue({ rows: [mockDbRow] });

            const result = await userRepo.findByTelegramId('123456789');

            expect(result).toEqual({
                id: 1,
                telegramId: '123456789',
                username: 'test_user',
                timezone: 'America/Mexico_City',
                workStartTime: '09:00',
                workEndTime: '18:00',
                initialVelocityMultiplier: 1.0,
            });

            expect(query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM users'),
                ['123456789']
            );
        });

        it('should return null when user is not found', async () => {
            (query as any).mockResolvedValue({ rows: [] });

            const result = await userRepo.findByTelegramId('999999');

            expect(result).toBeNull();
        });
    });

    describe('camelCase to snake_case mapping', () => {
        it('should correctly map TypeScript fields to PostgreSQL fields', async () => {
            const newUser: Omit<User, 'id'> = {
                telegramId: '123',
                username: 'user',
                timezone: 'UTC',
                workStartTime: '09:00',
                workEndTime: '17:00',
                initialVelocityMultiplier: 1.5,
            };

            const mockDbRow = {
                id: 1,
                telegram_id: '123',
                username: 'user',
                timezone: 'UTC',
                work_start_time: '09:00',
                work_end_time: '17:00',
                initial_velocity_multiplier: '1.50',
            };

            (query as any).mockResolvedValue({ rows: [mockDbRow] });

            const result = await userRepo.create(newUser);

            // Verify the input was converted properly
            expect(query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['123', 'user', 'UTC', '09:00', '17:00', 1.5])
            );

            // Verify the output was mapped back properly
            expect(result.workStartTime).toBe('09:00');
            expect(result.workEndTime).toBe('17:00');
            expect(result.initialVelocityMultiplier).toBe(1.5);
        });
    });
});
