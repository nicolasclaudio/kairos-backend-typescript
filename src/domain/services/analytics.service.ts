import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';

export interface AnalyticsStats {
    velocity: number; // Avg minutes per day
    impactScore: number; // % of high impact tasks
    streak: number; // Days streak (mocked for V1)
}

export class AnalyticsService {
    constructor(private taskRepo: TaskRepository) { }

    /**
     * Calculate stats for the last 7 days
     */
    async getWeeklyStats(userId: number): Promise<AnalyticsStats> {
        const days = 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const completedTasks = await this.taskRepo.getCompletedTasks(userId, startDate);

        // 1. Calculate Velocity (Avg Minutes / Day)
        const totalMinutes = completedTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
        const velocity = Math.round(totalMinutes / days);

        // 2. Calculate Impact (% of tasks with MetaScore >= 7)
        const highImpactCount = completedTasks.filter(t => t.goalMetaScore >= 7).length;
        const totalTasks = completedTasks.length;
        const impactScore = totalTasks > 0 ? Math.round((highImpactCount / totalTasks) * 100) : 0;

        // 3. Streak (Simplified: Just check if delivered yesterday? For now mocked or simple logic)
        // V1: Let's just return 0 or implement a basic check later.
        const streak = 0;

        return {
            velocity,
            impactScore,
            streak
        };
    }
}
