/**
 * Domain Types and Interfaces
 */

export interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Task {
    id: string;
    userId: string;
    title: string;
    description?: string;
    estimatedHours?: number;
    actualHours?: number;
    status: TaskStatus;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}

export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export interface Goal {
    id: string;
    userId: string;
    title: string;
    description?: string;
    targetDate?: Date;
    status: GoalStatus;
    createdAt: Date;
    updatedAt: Date;
}

export enum GoalStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    ARCHIVED = 'ARCHIVED',
}
