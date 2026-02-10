/**
 * WebSocket Event Types
 * Defines all event types and payloads for real-time communication
 */

import { Task } from './entities.js';
import { Goal } from './entities.js';
import { Notification } from './entities.js';

export type WebSocketEventType =
    | 'TASK_UPDATED'
    | 'GOAL_ACHIEVED'
    | 'NOTIFICATION_RECEIVED';

export type TaskAction = 'created' | 'updated' | 'deleted' | 'completed';

export interface TaskUpdatedPayload {
    action: TaskAction;
    task: Task;
}

export interface GoalAchievedPayload {
    goal: Goal;
    achievedAt: Date;
}

export interface NotificationReceivedPayload {
    notification: Notification;
}

export type WebSocketPayload =
    | TaskUpdatedPayload
    | GoalAchievedPayload
    | NotificationReceivedPayload;

export interface WebSocketEvent {
    type: WebSocketEventType;
    payload: WebSocketPayload;
    userId: number;
}
