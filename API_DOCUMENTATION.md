# Kairos API Documentation

## Overview
This documentation details the API endpoints for the Kairos backend.
**Base URL:** `/api`
**Authentication:** Most endpoints require a Bearer Token in the `Authorization` header.
`Authorization: Bearer <your_jwt_token>`

---

## 🔐 Authentication

### Register User
Register a new user in the system.
- **URL:** `/auth/register`
- **Method:** `POST`
- **Auth:** None

**Request Body:**
```json
{
  "telegramId": "123456789",
  "username": "johndoe",
  "timezone": "America/New_York",
  "workStartTime": "09:00",
  "workEndTime": "17:00",
  "initialVelocityMultiplier": 1.0
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "telegramId": "123456789",
  "username": "johndoe",
  "email": null,
  "createdAt": "2026-02-10T12:00:00.000Z"
}
```

### Login
Login using Telegram ID (simulated for now, or via specific auth service).
- **URL:** `/auth/login`
- **Method:** `POST`
- **Auth:** None

**Request Body:**
```json
{
  "telegramId": "123456789"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "telegramId": "123456789",
    ...
  }
}
```

### Get Current User
Get details of the currently authenticated user.
- **URL:** `/auth/me`
- **Method:** `GET`
- **Auth:** Bearer Token

**Response (200 OK):**
```json
{
  "id": 1,
  "telegramId": "123456789",
  "email": null
}
```

---

## 👤 Users

### Create User (Alternative)
Alternative endpoint to register a user.
- **URL:** `/users`
- **Method:** `POST`
- **Auth:** None

**Request Body:** Same as `/auth/register`
**Response (201 Created):** Same as `/auth/register`

---

## 🎯 Goals

### Create Goal
Create a new high-level goal.
- **URL:** `/goals`
- **Method:** `POST`
- **Auth:** Bearer Token

**Request Body:**
```json
{
  "userId": 1, // Optional if strictly using token user
  "title": "Master TypeScript",
  "metaScore": 8, // 1-10 impact score
  "targetDate": "2026-12-31T00:00:00.000Z"
}
```

**Response (201 Created):**
```json
{
  "id": 10,
  "userId": 1,
  "title": "Master TypeScript",
  "metaScore": 8,
  "status": "active",
  "targetDate": "2026-12-31T00:00:00.000Z",
  "createdAt": "..."
}
```

### Get User Goals
Get all goals for the user.
- **URL:** `/goals`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Params:** `userId` (Optional, defaults to token user)

**Response (200 OK):**
```json
[
  {
    "id": 10,
    "title": "Master TypeScript",
    "metaScore": 8,
    "status": "active",
    ...
  }
]
```

### Update Goal
Update goal details.
- **URL:** `/goals/:id`
- **Method:** `PATCH`
- **Auth:** Bearer Token

**Request Body:**
```json
{
  "title": "Master Advanced TypeScript",
  "metaScore": 9
}
```

**Response (200 OK):** Updated goal object.

### Delete Goal
Soft delete (archive) a goal. **Note:** Only allowed if goal has no active tasks.
- **URL:** `/goals/:id`
- **Method:** `DELETE`
- **Auth:** Bearer Token

**Response (204 No Content)**

---

## ✅ Tasks

### Create Task
Create a new task linked to a goal.
- **URL:** `/tasks`
- **Method:** `POST`
- **Auth:** Bearer Token

**Request Body:**
```json
{
  "userId": 1, // Optional if strictly using token user
  "goalId": 10,
  "projectId": 5, // Optional
  "title": "Read Handbook",
  "estimatedMinutes": 60,
  "priorityOverride": 3,
  "isFixed": false
}
```

**Response (201 Created):**
```json
{
  "id": 101,
  "title": "Read Handbook",
  "status": "pending",
  ...
}
```

### Get Tasks
Get tasks with optional filters.
- **URL:** `/tasks`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Params:**
  - `status` (e.g., 'pending', 'done')
  - `priority` (number)
  - `goalId` (number)

**Response (200 OK):** Array of tasks.

### Get Tasks by Goal
Get all tasks for a specific goal plus total estimated minutes.
- **URL:** `/tasks/goal/:goalId`
- **Method:** `GET`
- **Auth:** None (Public endpoint)

**Response (200 OK):**
```json
{
  "tasks": [ ... ],
  "totalMinutes": 120
}
```

### Update Task
- **URL:** `/tasks/:id`
- **Method:** `PATCH`
- **Auth:** Bearer Token

**Request Body:** `Partial<Task>`

### Complete Task
- **URL:** `/tasks/:id/complete`
- **Method:** `PATCH`
- **Auth:** Bearer Token

**Response (200 OK):** Completed task object (status: 'done').

### Delete Task
Soft delete (archive).
- **URL:** `/tasks/:id`
- **Method:** `DELETE`
- **Auth:** Bearer Token

**Response (204 No Content)**

---

## 📦 Tasks (Batch Operations)
... (omitted for brevity, assume unchanged) ...

---

## 🧘 Focus Sessions

### Start Session
Start a timer for a task.
- **URL:** `/focus-sessions`
- **Method:** `POST`
- **Auth:** Bearer Token

**Request Body:**
```json
{
  "taskId": 101
}
```

**Response (201 Created):**
```json
{
  "id": 50,
  "startTime": "2026-02-10T12:00:00.000Z",
  "status": "active"
}
```

### Complete Session
Stop the timer.
- **URL:** `/focus-sessions/:id/complete`
- **Method:** `PATCH`
- **Auth:** Bearer Token

**Response (200 OK):**
```json
{
  "id": 50,
  "endTime": "2026-02-10T12:25:00.000Z",
  "durationMinutes": 25,
  "status": "completed"
}
```

### Get Active Session
- **URL:** `/focus-sessions/active`
- **Method:** `GET`
- **Auth:** Bearer Token

**Response:** Session object or 404 if none.

### Get Session History
- **URL:** `/focus-sessions/history`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Params:** `page`, `limit`

**Response (200 OK):**
```json
{
  "sessions": [ ... ],
  "total": 5
}
```

### Get Stats
- **URL:** `/focus-sessions/stats`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Params:** `startDate`, `endDate`

---

## 🔔 Notifications

### Get Notifications
- **URL:** `/notifications`
- **Method:** `GET`
- **Auth:** Bearer Token
- **Query Params:** `includeRead=true` (optional)

**Response (200 OK):**
```json
{
  "notifications": [ ... ],
  "unreadCount": 2
}
```

### Mark Read
- **URL:** `/notifications/:id/read`
- **Method:** `PATCH`
- **Auth:** Bearer Token

### Notification Settings
- **GET:** `/notifications/settings`
- **POST:** `/notifications/settings`
  - Body: `{ "enableTaskReminders": true, ... }`

---

## 🔌 WebSocket (Real-Time)

**URL:** `ws://host:port` (e.g. `ws://localhost:3000`)
**Auth:** Requires JWT in handshake auth: `{ token: "..." }`

### Events (Server -> Client)

#### `TASK_UPDATED`
Triggered when a task is created, updated, completed, or deleted.
```json
{
  "type": "TASK_UPDATED",
  "userId": 1,
  "payload": {
    "action": "created", // or updated, completed, deleted
    "task": { ... } // Task object (or {id} for deleted)
  }
}
```

### Monitoring Endpoint
- **URL:** `/api/ws/stats`
- **Method:** `GET`
- **Auth:** Bearer Token

**Response:**
```json
{
  "connections": 5,
  "connectedUsers": [1, 2],
  "roomCount": 5
}
```
