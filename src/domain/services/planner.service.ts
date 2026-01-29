import { Task, LoadStatus, BankruptcyOption } from '../entities.js';
import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';
import { UserRepository } from '../../infrastructure/repositories/user.repository.js';

export interface TaskWithGoal extends Task {
    goalTitle: string;
    goalMetaScore: number;
}

export class PlannerService {
    constructor(
        private taskRepo: TaskRepository,
        private userRepo: UserRepository
    ) { }

    /**
     * Calculates the current daily load status
     */
    async calculateDailyLoad(userId: number): Promise<LoadStatus> {
        const user = await this.userRepo.findById(userId);
        if (!user) throw new Error('User not found');

        const demandMinutes = await this.taskRepo.sumPendingEstimatedMinutes(userId);

        // Calculate Capacity
        const now = new Date();
        const [endHour, endMinute] = user.workEndTime.split(':').map(Number);

        const workEndTime = new Date(now);
        workEndTime.setHours(endHour, endMinute, 0, 0);

        let remainingMinutes = (workEndTime.getTime() - now.getTime()) / 60000;

        // If outside work hours or negative, capacity is 0 (or handle overtime?)
        if (remainingMinutes < 0) remainingMinutes = 0;

        // Apply 20% safety margin
        const capacityMinutes = Math.floor(remainingMinutes * 0.8);

        const overloadRatio = capacityMinutes > 0 ? demandMinutes / capacityMinutes : (demandMinutes > 0 ? Infinity : 0);

        return {
            capacityMinutes,
            demandMinutes,
            isOverloaded: demandMinutes > capacityMinutes,
            overloadRatio
        };
    }

    /**
     * Checks simply if overloaded and returns boolean (trigger helper)
     */
    async checkOverload(userId: number): Promise<boolean> {
        const status = await this.calculateDailyLoad(userId);
        return status.isOverloaded;
    }

    /**
     * Executes bankruptcy liquidation strategy
     */
    async executeBankruptcy(userId: number, option: BankruptcyOption): Promise<string> {
        switch (option) {
            case BankruptcyOption.HARD:
                const archivedCount = await this.taskRepo.archiveLowPriorityTasks(userId, 5); // MetaScore < 5
                return `🔥 **Liquidación Total**: Se han archivado ${archivedCount} tareas de baja prioridad.`;

            case BankruptcyOption.SOFT:
                const movedCount = await this.taskRepo.rescheduleTasksToTomorrow(userId);
                return `🍃 **Reajuste Suave**: Se han movido ${movedCount} tareas a la cola general (sin hora fija).`;

            case BankruptcyOption.MANUAL:
                return `🛠 **Manual**: Usa /done [id] o /archive [id] para eliminar tareas específicas.`;

            default:
                return "Opción desconocida.";
        }
    }

    /**
     * Generates a daily plan based on pending tasks priority
     */
    async generateDailyPlan(userId: number, userEnergy: number = 3): Promise<string> {
        // 1. Fetch tasks with goal context
        const tasks = await this.taskRepo.findAllPendingWithGoalInfo(userId);

        if (tasks.length === 0) {
            return "🎉 ¡No tienes tareas pendientes! Disfruta tu día libre.";
        }

        // 2. Sort/Prioritize (The Algorithm)
        const sortedTasks = this.prioritizeTasks(tasks, userEnergy);

        // 3. Time Blocking & Formatting
        return this.formatSchedule(sortedTasks);
    }

    /**
     * Prioritizes tasks based on:
     * 1. Fixed status (locked in time - strictly first for V1)
     * 2. Context Score (MetaScore + Energy Fit)
     * 3. Tactical Priority (Task Priority Override)
     */
    private prioritizeTasks(tasks: TaskWithGoal[], userEnergy: number): TaskWithGoal[] {
        return tasks.sort((a, b) => {
            // 1. Fixed tasks first
            if (a.isFixed && !b.isFixed) return -1;
            if (!a.isFixed && b.isFixed) return 1;

            // 2. Calculate Composite Scores
            const fitA = (5 - Math.abs(userEnergy - (a.requiredEnergy || 3))) * 2; // Max 10 (Perfect Match), Min 2 (Diff 4)
            const fitB = (5 - Math.abs(userEnergy - (b.requiredEnergy || 3))) * 2;

            const scoreA = (a.goalMetaScore || 0) + fitA;
            const scoreB = (b.goalMetaScore || 0) + fitB;

            // Sort by Composite Score
            const scoreDiff = scoreB - scoreA;
            if (scoreDiff !== 0) return scoreDiff;

            // 3. Task Priority (Tactical Urgency as tie-breaker)
            return (b.priorityOverride || 3) - (a.priorityOverride || 3);
        });
    }

    /**
     * Creates a markdown schedule with time blocks
     */
    private formatSchedule(tasks: TaskWithGoal[]): string {
        // Start planning from "Now"
        let currentTime = new Date();

        let output = `📅 *Plan Optimizado* (Generado: ${currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})\n\n`;

        let totalMinutes = 0;

        for (const task of tasks) {
            const duration = task.estimatedMinutes || 30;
            const startTime = new Date(currentTime);
            const endTime = new Date(currentTime.getTime() + duration * 60000);

            const startStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Format: 09:00 - 09:30: [ID: 15] Tarea
            output += `⏰ *${startStr} - ${endStr}* (${duration}m)\n`;
            // Strategic Context Icon based on MetaScore
            const icon = task.goalMetaScore >= 8 ? '🌟' : (task.goalMetaScore >= 5 ? '🎯' : '📝');

            output += `${icon} *[#${task.id}] ${task.title}*\n`;
            output += `   └ 🔗 Meta: _${task.goalTitle || 'Sin Asignar'}_\n`;
            output += `\n`;

            currentTime = endTime;
            totalMinutes += duration;
        }

        const finishTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        output += `🏁 *Hora estimada de finalización:* ${finishTime}\n`;
        output += `⏱️ *Carga Total:* ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

        return output;
    }
}
