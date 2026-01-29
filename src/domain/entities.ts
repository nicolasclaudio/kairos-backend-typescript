// src/domain/entities.ts

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export type TaskStatus = 'backlog' | 'scheduled' | 'in_progress' | 'done' | 'overdue';

export interface User {
    id: number;
    telegramId: string;
    username?: string;
    timezone: string;
    workStartTime: string; // HH:mm
    workEndTime: string;   // HH:mm
    initialVelocityMultiplier: number;
}

export interface Goal {
    id: number;
    userId: number;
    title: string;
    metaScore: number; // 1-10
    targetDate?: Date;
    status: 'active' | 'achieved' | 'paused' | 'dropped';
}

export interface Task {
    id: number;
    userId: number;
    projectId?: number;
    title: string;
    estimatedDuration: number;
    actualDuration?: number;
    requiredEnergy: EnergyLevel;
    deadline?: Date;
    isUserLocked: boolean;
    scheduledStart?: Date;
    status: TaskStatus;
}
