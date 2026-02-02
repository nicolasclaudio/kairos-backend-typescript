
import { describe, it, expect, vi } from 'vitest';
import { PlannerService, TaskWithGoal } from './planner.service.js';

describe('PlannerService', () => {
    const mockTaskRepo = {
        findAllPendingWithGoalInfo: vi.fn(),
        sumPendingEstimatedMinutes: vi.fn(),
        archiveLowPriorityTasks: vi.fn(),
        rescheduleTasksToTomorrow: vi.fn(),
    } as any;

    const mockUserRepo = {
        findById: vi.fn(),
    } as any;

    const planner = new PlannerService(mockTaskRepo, mockUserRepo);

    it('should generate a plan with tasks sorted by priority', async () => {
        const tasks: TaskWithGoal[] = [
            { id: 1, title: 'Low Priority', estimatedMinutes: 30, priorityOverride: 1, goalMetaScore: 1, isFixed: false } as any,
            { id: 2, title: 'High Priority', estimatedMinutes: 60, priorityOverride: 5, goalMetaScore: 10, isFixed: false } as any,
            { id: 3, title: 'Fixed Task', estimatedMinutes: 15, priorityOverride: 1, goalMetaScore: 1, isFixed: true } as any,
        ];

        mockTaskRepo.findAllPendingWithGoalInfo.mockResolvedValue(tasks);

        const plan = await planner.generateDailyPlan(1);

        // Expect Fixed Task first
        expect(plan.indexOf('Fixed Task')).toBeLessThan(plan.indexOf('High Priority'));
        // Expect High Goal Score second
        expect(plan.indexOf('High Priority')).toBeLessThan(plan.indexOf('Low Priority'));
    });

    it('should handle empty tasks', async () => {
        mockTaskRepo.findAllPendingWithGoalInfo.mockResolvedValue([]);
        const plan = await planner.generateDailyPlan(1);
        expect(plan).toContain('¡No tienes tareas pendientes!');
    });

    describe('calculateDailyLoad', () => {
        it('should calculate load correctly', async () => {
            mockUserRepo.findById.mockResolvedValue({ workEndTime: '18:00' });
            mockTaskRepo.sumPendingEstimatedMinutes.mockResolvedValue(120); // 2 hours

            // Mock system time to 14:00 (4 hours remaining -> 3.2 capacity)
            vi.setSystemTime(new Date('2024-01-01T14:00:00'));

            const status = await planner.calculateDailyLoad(1);

            expect(status.demandMinutes).toBe(120);
            expect(status.capacityMinutes).toBeGreaterThan(0);
            // 4 hours * 60 = 240 mins. * 0.8 = 192 mins capacity.
            // 120 demand < 192 capacity. Not overloaded.
            expect(status.isOverloaded).toBe(false);

            vi.useRealTimers();
        });

        it('should detect overload', async () => {
            mockUserRepo.findById.mockResolvedValue({ workEndTime: '15:00' });
            mockTaskRepo.sumPendingEstimatedMinutes.mockResolvedValue(120); // 2 hours

            // Mock time to 14:00 (1 hour remaining -> 0.8h capacity = 48 mins)
            vi.setSystemTime(new Date('2024-01-01T14:00:00'));

            const status = await planner.calculateDailyLoad(1);

            expect(status.capacityMinutes).toBe(48);
            expect(status.isOverloaded).toBe(true); // 120 > 48
            expect(status.overloadRatio).toBeGreaterThan(1);

            vi.useRealTimers();
        });
    });

    describe('executeBankruptcy', () => {
        it('should call repository for HARD bankruptcy', async () => {
            mockTaskRepo.archiveLowPriorityTasks.mockResolvedValue(5);
            // bankruptcy option is enum, need to import or cast
            const result = await planner.executeBankruptcy(1, 'HARD' as any);
            expect(mockTaskRepo.archiveLowPriorityTasks).toHaveBeenCalledWith(1, 5);
            expect(result).toContain('5 tareas');
        });
    });
});
