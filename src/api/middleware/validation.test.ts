/**
 * Validation Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateUserRegistration } from './validation.js';
import type { Request, Response, NextFunction } from 'express';

describe('validateUserRegistration', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: ReturnType<typeof vi.fn>;
    let statusMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({ json: jsonMock });

        mockReq = {
            body: {},
        };

        mockRes = {
            status: statusMock,
            json: jsonMock,
        };

        mockNext = vi.fn();

        vi.clearAllMocks();
    });

    it('should call next() with valid data', () => {
        mockReq.body = {
            telegramId: '123456',
            timezone: 'UTC',
            workStartTime: '09:00',
            workEndTime: '17:00',
            initialVelocityMultiplier: 1.0,
        };

        validateUserRegistration(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 400 if telegramId is missing', () => {
        mockReq.body = {
            timezone: 'UTC',
            workStartTime: '09:00',
            workEndTime: '17:00',
            initialVelocityMultiplier: 1.0,
        };

        validateUserRegistration(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'telegramId is required' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 if timezone is missing', () => {
        mockReq.body = {
            telegramId: '123456',
            workStartTime: '09:00',
            workEndTime: '17:00',
            initialVelocityMultiplier: 1.0,
        };

        validateUserRegistration(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'timezone is required' });
    });

    it('should return 400 if workStartTime format is invalid', () => {
        mockReq.body = {
            telegramId: '123456',
            timezone: 'UTC',
            workStartTime: '9:00',  // Invalid format
            workEndTime: '17:00',
            initialVelocityMultiplier: 1.0,
        };

        validateUserRegistration(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'workStartTime must be in HH:MM format' });
    });

    it('should return 400 if workEndTime format is invalid', () => {
        mockReq.body = {
            telegramId: '123456',
            timezone: 'UTC',
            workStartTime: '09:00',
            workEndTime: '25:00',  // Invalid time
            initialVelocityMultiplier: 1.0,
        };

        validateUserRegistration(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'workEndTime must be in HH:MM format' });
    });

    it('should return 400 if initialVelocityMultiplier is not a number', () => {
        mockReq.body = {
            telegramId: '123456',
            timezone: 'UTC',
            workStartTime: '09:00',
            workEndTime: '17:00',
            initialVelocityMultiplier: '1.0',  // String instead of number
        };

        validateUserRegistration(mockReq as Request, mockRes as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'initialVelocityMultiplier must be a number',
        });
    });

    it('should accept valid time formats', () => {
        mockReq.body = {
            telegramId: '123456',
            timezone: 'UTC',
            workStartTime: '00:00',
            workEndTime: '23:59',
            initialVelocityMultiplier: 1.5,
        };

        validateUserRegistration(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
    });
});
