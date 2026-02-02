import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';

export interface AnalyticsStats {
    velocity: number; // Avg minutes per day
    impactScore: number; // % of high impact tasks
    streak: number; // Days streak (mocked for V1)
}

export class AnalyticsService {
    constructor(private taskRepo: TaskRepository) { }

    /**
     * Get all dashboard metrics
     */
    async getDashboardMetrics(userId: number): Promise<AnalyticsStats> {
        const [velocity, impactScore, streak] = await Promise.all([
            this.calculateVelocity(userId),
            this.calculateImpact(userId),
            this.calculateStreak(userId)
        ]);

        return { velocity, impactScore, streak };
    }

    /**
     * Calculate Velocity (Average minutes completed per day in the last 7 days)
     */
    async calculateVelocity(userId: number): Promise<number> {
        const days = 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Reset time to start of day for cleaner query matching usually, 
        // but getCompletedTasks uses >= date.

        const completedTasks = await this.taskRepo.getCompletedTasks(userId, startDate);
        if (completedTasks.length === 0) return 0;

        const totalMinutes = completedTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
        return Math.round(totalMinutes / days);
    }

    /**
     * Calculate Impact (% of completed tasks with MetaScore >= 7 in the last 7 days)
     */
    async calculateImpact(userId: number): Promise<number> {
        const days = 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const completedTasks = await this.taskRepo.getCompletedTasks(userId, startDate);
        const totalTasks = completedTasks.length;

        if (totalTasks === 0) return 0;

        const highImpactCount = completedTasks.filter(t => t.goalMetaScore >= 7).length;
        return Math.round((highImpactCount / totalTasks) * 100);
    }

    /**
     * Calculate Streak (Consecutive days with at least one completed task)
     */
    async calculateStreak(userId: number): Promise<number> {
        const completionDates = await this.taskRepo.getCompletionDates(userId);

        if (completionDates.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Check if the most recent completion was today or yesterday
        // If the last completion was before yesterday, streak is broken (0), 
        // unless we want to show the streak that ended? Usually current streak means "active".
        // But if I haven't done anything today, my streak from yesterday is still valid until midnight.

        const lastDate = completionDates[0]; // Dates are ordered DESC
        lastDate.setHours(0, 0, 0, 0);

        // If last completion was older than yesterday, streak is 0.
        if (lastDate < yesterday) {
            return 0;
        }

        // Iterate dates to count consecutive days
        // We need to normalize dates to ignore time
        let currentDate = lastDate;

        for (const date of completionDates) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);

            // Difference in days between expected current date and actual date in list
            const diffTime = Math.abs(currentDate.getTime() - d.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                // Same day (duplicate), continue
                continue;
            } else if (diffDays === 1) {
                // Consecutive day
                streak++;
                currentDate = d;
            } else {
                // Gap found
                break;
            }
        }

        // Add 1 for the initial day we started with (if we didn't break immediately)
        // Wait, loop logic logic:
        // We start with lastDate. 
        // If we iterate through the list, the first item IS lastDate. 
        // So diffDays will be 0.
        // We need to handle the first item.

        // Let's refine the loop
        streak = 1; // We know lastDate is valid (today or yesterday)
        let previousParamsDate = lastDate;

        for (let i = 1; i < completionDates.length; i++) {
            const d = new Date(completionDates[i]);
            d.setHours(0, 0, 0, 0);

            const diffTime = previousParamsDate.getTime() - d.getTime(); // Positive because DESC
            const diffDays = diffTime / (1000 * 3600 * 24);

            if (diffDays === 1) {
                streak++;
                previousParamsDate = d;
            } else {
                break;
            }
        }

        return streak;
    }
}
