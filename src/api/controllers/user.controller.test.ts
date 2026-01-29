/**
 * User Controller Tests
 * Integration tests for user registration endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserController } from './user.controller.js';
import type { Request, Response } from 'express';

// Mock UserRepository
const mockUserRepository = {
    create: vi.fn(),
    findByTelegramId: vi.fn(),
};

describe('UserController', () => {
    let userController: UserController;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        userController = new UserController(mockUserRepository as any);

        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ json: jsonMock });

        mockReq = {
            body: {},
        };

        mockRes = {
            status: statusMock,
            json: jsonMock,
        };

        vi.clearAllMocks();
    });

    describe('register', () => {
        it('should create user and return 201', async () => {
            const userData = {
                telegramId: '123456',
                username: 'test_user',
                timezone: 'America/Mexico_City',
                workStartTime: '09:00',
                workEndTime: '18:00',
                initialVelocityMultiplier: 1.0,
            };

            mockReq.body = userData;

            const createdUser = { id: 1, ...userData };
            mockUserRepository.create.mockResolvedValue(createdUser);

            await userController.register(mockReq as Request, mockRes as Response);

            expect(mockUserRepository.create).toHaveBeenCalledWith({
                telegramId: '123456',
                username: 'test_user',
                timezone: 'America/Mexico_City',
                workStartTime: '09:00',
                workEndTime: '18:00',
                initialVelocityMultiplier: 1.0,
            });

            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(createdUser);
        });

        it('should return 409 when telegram ID already exists', async () => {
            const userData = {
                telegramId: '123456',
                timezone: 'UTC',
                workStartTime: '09:00',
                workEndTime: '17:00',
                initialVelocityMultiplier: 1.0,
            };

            mockReq.body = userData;

            const duplicateError = new Error('Duplicate key') as any;
            duplicateError.code = '23505';
            mockUserRepository.create.mockRejectedValue(duplicateError);

            await userController.register(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(409);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'User with this telegram ID already exists',
            });
        });

        it('should return 500 on generic error', async () => {
            mockReq.body = {
                telegramId: '123456',
                timezone: 'UTC',
                workStartTime: '09:00',
                workEndTime: '17:00',
                initialVelocityMultiplier: 1.0,
            };

            mockUserRepository.create.mockRejectedValue(new Error('Database error'));

            await userController.register(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal server error',
            });
        });

        it('should handle null username', async () => {
            const userData = {
                telegramId: '123456',
                timezone: 'UTC',
                workStartTime: '09:00',
                workEndTime: '17:00',
                initialVelocityMultiplier: 1.0,
            };

            mockReq.body = userData;

            const createdUser = { id: 1, ...userData, username: null };
            mockUserRepository.create.mockResolvedValue(createdUser);

            await userController.register(mockReq as Request, mockRes as Response);

            expect(mockUserRepository.create).toHaveBeenCalledWith({
                telegramId: '123456',
                username: null,
                timezone: 'UTC',
                workStartTime: '09:00',
                workEndTime: '17:00',
                initialVelocityMultiplier: 1.0,
            });

            expect(statusMock).toHaveBeenCalledWith(201);
        });
    });
});
