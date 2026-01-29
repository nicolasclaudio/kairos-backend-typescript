
import { Task } from '../entities.js';
import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';

export interface TaskWithGoal extends Task {
    goalTitle: string;
    goalMetaScore: number;
}

export class PlannerService {
    constructor(private taskRepo: TaskRepository) { }

    /**
     * Generates a daily plan based on pending tasks priority
     */
    async generateDailyPlan(userId: number): Promise<string> {
        // 1. Fetch tasks with goal context
        const tasks = await this.taskRepo.findAllPendingWithGoalInfo(userId);

        if (tasks.length === 0) {
            return "🎉 ¡No tienes tareas pendientes! Disfruta tu día libre.";
        }

        // 2. Sort/Prioritize (The Algorithm)
        const sortedTasks = this.prioritizeTasks(tasks);

        // 3. Time Blocking & Formatting
        return this.formatSchedule(sortedTasks);
    }

    /**
     * Prioritizes tasks based on:
     * 1. Fixed status (locked in time - strictly first for V1)
     * 2. Strategic Value (Goal MetaScore)
     * 3. Tactical Priority (Task Priority Override)
     */
    private prioritizeTasks(tasks: TaskWithGoal[]): TaskWithGoal[] {
        return tasks.sort((a, b) => {
            // 1. Fixed tasks first
            if (a.isFixed && !b.isFixed) return -1;
            if (!a.isFixed && b.isFixed) return 1;

            // 2. Goal MetaScore (Strategic Alignment)
            // Higher meta_score means higher priority
            const scoreDiff = (b.goalMetaScore || 0) - (a.goalMetaScore || 0);
            if (scoreDiff !== 0) return scoreDiff;

            // 3. Task Priority (Tactical Urgency)
            // Higher priority_override means higher priority
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
