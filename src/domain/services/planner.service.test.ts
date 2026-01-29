
import { describe, it, expect, vi } from 'vitest';
import { PlannerService, TaskWithGoal } from './planner.service.js';

describe('PlannerService', () => {
    const mockTaskRepo = {
        findAllPendingWithGoalInfo: vi.fn(),
    } as any;

    const planner = new PlannerService(mockTaskRepo);

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
});
