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
    currentEnergy: number;
    email?: string;
    passwordHash?: string;
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
    goalId: number;
    projectId?: number | null;
    title: string;
    estimatedMinutes: number;
    status: 'pending' | 'in_progress' | 'done' | 'archived';
    priorityOverride?: number;
    isFixed: boolean;
    requiredEnergy: number;
    createdAt?: Date | string;
    scheduledStartTime?: Date;
    completedAt?: Date;
}

export enum BankruptcyOption {
    HARD = 'HARD',
    SOFT = 'SOFT',
    MANUAL = 'MANUAL'
}

export interface LoadStatus {
    capacityMinutes: number;
    demandMinutes: number;
    isOverloaded: boolean;
    overloadRatio: number; // e.g. 1.5 = 150% load
}

