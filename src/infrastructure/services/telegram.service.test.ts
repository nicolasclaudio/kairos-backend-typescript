
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramService } from './telegram.service.js';
import TelegramBot from 'node-telegram-bot-api';

// Mock dependencies
const mockUserRepo = {
    findByTelegramId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateEnergy: vi.fn(),
} as any;

const mockGoalRepo = {
    create: vi.fn(),
    findByUserId: vi.fn(),
    archive: vi.fn(),
} as any;

const mockTaskRepo = {
    create: vi.fn(),
    markAsDone: vi.fn(),
    getDailyStats: vi.fn(),
    getTotalRemainingMinutes: vi.fn(),
    countPendingByGoalId: vi.fn(),
} as any;

const mockPlannerService = {
    generateDailyPlan: vi.fn(),
} as any;

const mockLlmService = {
    extractTaskDetails: vi.fn(),
} as any;

// Mock TelegramBot
vi.mock('node-telegram-bot-api', () => {
    return {
        default: class MockTelegramBot {
            constructor() { }
            on = vi.fn();
            sendMessage = vi.fn();
        }
    };
});

describe('TelegramService', () => {
    let service: TelegramService;
    let mockBot: any;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new TelegramService('fake-token', mockUserRepo, mockGoalRepo, mockTaskRepo, mockPlannerService, mockLlmService);
        mockBot = (service as any).bot;
    });

    it('should initialize and listen to messages', () => {
        service.initialize();
        expect(mockBot.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    // Helper to simulate incoming message
    const simulateMessage = async (text: string, telegramId: string = '12345') => {
        const callback = mockBot.on.mock.calls.find((call: any) => call[0] === 'message')[1];
        await callback({
            chat: { id: 999 },
            from: { id: parseInt(telegramId) },
            text
        });
    };

    it('should reply requesting registration if user not found', async () => {
        service.initialize();
        mockUserRepo.findByTelegramId.mockResolvedValue(null);

        await simulateMessage('/start');

        expect(mockBot.sendMessage).toHaveBeenCalledWith(
            999,
            expect.stringContaining('Usuario no registrado'),
            expect.any(Object)
        );
    });

    it('should create a goal with /meta command', async () => {
        service.initialize();
        mockUserRepo.findByTelegramId.mockResolvedValue({ id: 1, username: 'nico', currentEnergy: 3 });
        mockGoalRepo.create.mockResolvedValue({ id: 10, title: 'Aprender Rust' });

        await simulateMessage('/meta Aprender Rust');

        expect(mockGoalRepo.create).toHaveBeenCalledWith({
            userId: 1,
            title: 'Aprender Rust',
            metaScore: 5,
            status: 'active'
        });
        expect(mockBot.sendMessage).toHaveBeenCalledWith(
            999,
            expect.stringContaining('Meta creada')
        );
    });

    it('should handle missing title in /meta command', async () => {
        service.initialize();
        mockUserRepo.findByTelegramId.mockResolvedValue({ id: 1, currentEnergy: 3 });

        await simulateMessage('/meta');

        expect(mockGoalRepo.create).not.toHaveBeenCalled();
        expect(mockBot.sendMessage).toHaveBeenCalledWith(
            999,
            expect.stringContaining('Falta título')
        );
    });

    it('should create a task in Inbox with /todo command', async () => {
        service.initialize();
        mockUserRepo.findByTelegramId.mockResolvedValue({ id: 1, currentEnergy: 3 });

        // Mock existing Inbox goal
        mockGoalRepo.findByUserId.mockResolvedValue([
            { id: 50, title: 'Inbox' }
        ]);
        mockTaskRepo.create.mockResolvedValue({ id: 100, title: 'Comprar pan' });

        await simulateMessage('/todo Comprar pan');

        expect(mockTaskRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            userId: 1,
            goalId: 50, // Should use existing Inbox
            title: 'Comprar pan',
            status: 'pending'
        }));
        expect(mockBot.sendMessage).toHaveBeenCalledWith(
            999,
            expect.stringContaining('Tarea en Inbox')
        );
    });

    it('should create Inbox goal if not exists for /todo command', async () => {
        service.initialize();
        mockUserRepo.findByTelegramId.mockResolvedValue({ id: 1, currentEnergy: 3 });

        // No goals
        mockGoalRepo.findByUserId.mockResolvedValue([]);
        // Inbox created
        mockGoalRepo.create.mockResolvedValue({ id: 51, title: 'Inbox' });

        mockTaskRepo.create.mockResolvedValue({ id: 100, title: 'Tarea nueva' });

        await simulateMessage('/todo Tarea nueva');

        expect(mockGoalRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Inbox',
            userId: 1
        }));
        expect(mockTaskRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            goalId: 51
        }));
    });

    it('should mark task as done with /done command', async () => {
        service.initialize();
        mockUserRepo.findByTelegramId.mockResolvedValue({ id: 1, currentEnergy: 3 });
        mockTaskRepo.markAsDone.mockResolvedValue(true);

        await simulateMessage('/done 123');

        expect(mockTaskRepo.markAsDone).toHaveBeenCalledWith(123, 1);
        expect(mockBot.sendMessage).toHaveBeenCalledWith(
            999,
            expect.stringContaining('Tarea *#123* completada'),
            expect.any(Object)
        );
    });

    it('should generate status report with /status command', async () => {
        service.initialize();
        mockUserRepo.findByTelegramId.mockResolvedValue({ id: 1, currentEnergy: 3 });
        mockGoalRepo.findByUserId.mockResolvedValue([
            { id: 10, title: 'Goal 1', metaScore: 10, status: 'active' }
        ]);
        mockTaskRepo.getDailyStats.mockResolvedValue({ completed: 5 });
        mockTaskRepo.getTotalRemainingMinutes.mockResolvedValue(120);
        mockTaskRepo.countPendingByGoalId.mockResolvedValue(2);

        await simulateMessage('/status');

        expect(mockBot.sendMessage).toHaveBeenCalledWith(
            999,
            expect.stringContaining('Status'),
            expect.any(Object)
        );
    });

    it('should update user energy with /energy command', async () => {
        service.initialize();
        mockUserRepo.findByTelegramId.mockResolvedValue({ id: 1, currentEnergy: 3 });
        mockUserRepo.updateEnergy.mockResolvedValue(undefined);

        await simulateMessage('/energy 5');

        expect(mockUserRepo.updateEnergy).toHaveBeenCalledWith(1, 5);
        expect(mockBot.sendMessage).toHaveBeenCalledWith(
            999,
            expect.stringContaining('Energía:'),
            expect.any(Object)
        );
    });

    it('should pass currentEnergy to generateDailyPlan via /plan', async () => {
        service.initialize();
        service.initialize();
        const userWithEnergy = { id: 1, currentEnergy: 4 };
        mockUserRepo.findById.mockResolvedValue(userWithEnergy);

        await simulateMessage('/plan');

        expect(mockPlannerService.generateDailyPlan).toHaveBeenCalledWith(1, 4);
    });
});
