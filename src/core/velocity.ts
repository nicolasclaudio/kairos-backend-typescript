/**
 * Velocity Calculator - Core Logic
 * Calculate team/user velocity metrics
 */

import { Task } from '../domain/types.js';

export class VelocityCalculator {
    /**
     * Calculate average velocity based on completed tasks
     */
    calculateAverageVelocity(completedTasks: Task[], periodDays: number): number {
        const totalHours = completedTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);

        if (periodDays === 0) return 0;

        return totalHours / periodDays;
    }

    /**
     * Calculate accuracy between estimated and actual hours
     */
    calculateEstimationAccuracy(tasks: Task[]): number {
        const tasksWithBothValues = tasks.filter(
            t => t.estimatedHours && t.actualHours
        );

        if (tasksWithBothValues.length === 0) return 0;

        const totalAccuracy = tasksWithBothValues.reduce((sum, task) => {
            const estimated = task.estimatedHours || 1;
            const actual = task.actualHours || 1;
            const accuracy = 1 - Math.abs(estimated - actual) / estimated;
            return sum + accuracy;
        }, 0);

        return totalAccuracy / tasksWithBothValues.length;
    }
}
