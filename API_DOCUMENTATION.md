# Kairos Backend API Documentation

## Información General

**Base URL:** `http://localhost:3000`  
**Formato:** JSON  
**Puerto por defecto:** 3000  
**Framework:** Express.js con TypeScript

---

## Tabla de Contenidos

1. [Health Check](#health-check)
2. [Users API](#users-api)
3. [Goals API](#goals-api)
4. [Tasks API](#tasks-api)
5. [Modelos de Datos](#modelos-de-datos)
6. [Códigos de Error](#códigos-de-error)

---

## Health Check

### GET /health

Verifica que el servidor está en línea y funcionando correctamente.

**Endpoint:** `GET /health`

**Headers:** Ninguno requerido

**Query Parameters:** Ninguno

**Request Body:** Ninguno

#### Ejemplo de Request

```bash
curl -X GET http://localhost:3000/health
```

#### Response Success (200 OK)

```json
{
  "status": "Kairos Core is breathing",
  "timestamp": "2026-01-29T22:36:25.000Z"
}
```

---

## Users API

### POST /api/users

Registra un nuevo usuario en el sistema.

**Endpoint:** `POST /api/users`

**Headers:**
```
Content-Type: application/json
```

**Validaciones:**
- `telegramId` (string, requerido): ID único del usuario de Telegram
- `username` (string, opcional): Nombre de usuario de Telegram
- `timezone` (string, requerido): Zona horaria del usuario (ej: "America/Mexico_City")
- `workStartTime` (string, requerido): Hora de inicio de trabajo en formato HH:MM (ej: "09:00")
- `workEndTime` (string, requerido): Hora de fin de trabajo en formato HH:MM (ej: "18:00")
- `initialVelocityMultiplier` (number, requerido): Multiplicador inicial de velocidad del usuario

#### Ejemplo de Request

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": "123456789",
    "username": "nicolas_dev",
    "timezone": "America/Mexico_City",
    "workStartTime": "09:00",
    "workEndTime": "18:00",
    "initialVelocityMultiplier": 1.0
  }'
```

#### Request Body

```json
{
  "telegramId": "123456789",
  "username": "nicolas_dev",
  "timezone": "America/Mexico_City",
  "workStartTime": "09:00",
  "workEndTime": "18:00",
  "initialVelocityMultiplier": 1.0
}
```

#### Response Success (201 Created)

```json
{
  "id": 1,
  "telegramId": "123456789",
  "username": "nicolas_dev",
  "timezone": "America/Mexico_City",
  "workStartTime": "09:00",
  "workEndTime": "18:00",
  "initialVelocityMultiplier": 1.0,
  "currentEnergy": 5
}
```

#### Response Error - Campos Requeridos (400 Bad Request)

```json
{
  "error": "telegramId is required"
}
```

```json
{
  "error": "timezone is required"
}
```

```json
{
  "error": "workStartTime must be in HH:MM format"
}
```

#### Response Error - Usuario Duplicado (409 Conflict)

```json
{
  "error": "User with this telegram ID already exists"
}
```

#### Response Error - Error del Servidor (500 Internal Server Error)

```json
{
  "error": "Internal server error"
}
```

---

## Goals API

### POST /api/goals

Crea un nuevo objetivo (goal) para un usuario.

**Endpoint:** `POST /api/goals`

**Headers:**
```
Content-Type: application/json
```

**Validaciones:**
- `userId` (number, requerido): ID del usuario propietario del objetivo
- `title` (string, requerido): Título descriptivo del objetivo
- `metaScore` (number, requerido): Puntuación de importancia del objetivo (1-10)
- `targetDate` (string, opcional): Fecha objetivo en formato ISO 8601 (ej: "2026-12-31T00:00:00.000Z")

#### Ejemplo de Request

```bash
curl -X POST http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "title": "Lanzar MVP de Kairos",
    "metaScore": 9,
    "targetDate": "2026-06-30T00:00:00.000Z"
  }'
```

#### Request Body

```json
{
  "userId": 1,
  "title": "Lanzar MVP de Kairos",
  "metaScore": 9,
  "targetDate": "2026-06-30T00:00:00.000Z"
}
```

#### Response Success (201 Created)

```json
{
  "id": 1,
  "userId": 1,
  "title": "Lanzar MVP de Kairos",
  "metaScore": 9,
  "targetDate": "2026-06-30T00:00:00.000Z",
  "status": "active"
}
```

#### Response Error - Validación (400 Bad Request)

```json
{
  "error": "userId is required"
}
```

```json
{
  "error": "metaScore must be between 1 and 10"
}
```

```json
{
  "error": "targetDate must be a valid date"
}
```

#### Response Error - Error del Servidor (500 Internal Server Error)

```json
{
  "error": "Internal server error"
}
```

---

### GET /api/goals

Obtiene todos los objetivos de un usuario específico.

**Endpoint:** `GET /api/goals?userId={userId}`

**Headers:** Ninguno requerido

**Query Parameters:**
- `userId` (number, requerido): ID del usuario

#### Ejemplo de Request

```bash
curl -X GET "http://localhost:3000/api/goals?userId=1"
```

#### Response Success (200 OK)

```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "Lanzar MVP de Kairos",
    "metaScore": 9,
    "targetDate": "2026-06-30T00:00:00.000Z",
    "status": "active"
  },
  {
    "id": 2,
    "userId": 1,
    "title": "Implementar notificaciones inteligentes",
    "metaScore": 7,
    "targetDate": null,
    "status": "active"
  }
]
```

#### Response Success - Sin Objetivos (200 OK)

```json
[]
```

#### Response Error - Parámetro Inválido (400 Bad Request)

```json
{
  "error": "userId query parameter is required and must be a number"
}
```

#### Response Error - Error del Servidor (500 Internal Server Error)

```json
{
  "error": "Internal server error"
}
```

---

## Tasks API

### POST /api/tasks

Crea una nueva tarea asociada a un objetivo específico.

**Endpoint:** `POST /api/tasks`

**Headers:**
```
Content-Type: application/json
```

**Validaciones:**
- `userId` (number, requerido): ID del usuario propietario de la tarea
- `goalId` (number, requerido): ID del objetivo al que pertenece la tarea (debe pertenecer al usuario)
- `projectId` (number, opcional): ID del proyecto asociado
- `title` (string, requerido): Título descriptivo de la tarea
- `estimatedMinutes` (number, requerido): Tiempo estimado en minutos (debe ser > 0)
- `priorityOverride` (number, opcional): Prioridad manual de la tarea (por defecto: 3)
- `isFixed` (boolean, opcional): Indica si la tarea tiene horario fijo (por defecto: false)

**Nota Importante:** El sistema valida que el `goalId` proporcionado pertenezca efectivamente al usuario especificado en `userId`.

#### Ejemplo de Request

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "goalId": 1,
    "projectId": null,
    "title": "Diseñar modelo de base de datos",
    "estimatedMinutes": 120,
    "priorityOverride": 5,
    "isFixed": false
  }'
```

#### Request Body

```json
{
  "userId": 1,
  "goalId": 1,
  "projectId": null,
  "title": "Diseñar modelo de base de datos",
  "estimatedMinutes": 120,
  "priorityOverride": 5,
  "isFixed": false
}
```

#### Response Success (201 Created)

```json
{
  "id": 1,
  "userId": 1,
  "goalId": 1,
  "projectId": null,
  "title": "Diseñar modelo de base de datos",
  "estimatedMinutes": 120,
  "status": "pending",
  "priorityOverride": 5,
  "isFixed": false,
  "requiredEnergy": 3,
  "createdAt": "2026-01-29T22:36:25.000Z",
  "scheduledStartTime": null,
  "completedAt": null
}
```

#### Response Error - Validación de Campos (400 Bad Request)

```json
{
  "error": "userId is required"
}
```

```json
{
  "error": "goalId is required"
}
```

```json
{
  "error": "title is required"
}
```

```json
{
  "error": "estimatedMinutes must be greater than 0"
}
```

#### Response Error - Goal No Pertenece al Usuario (403 Forbidden)

```json
{
  "error": "Forbidden: Goal does not belong to this user"
}
```

#### Response Error - Error del Servidor (500 Internal Server Error)

```json
{
  "error": "Internal server error"
}
```

---

### GET /api/tasks/goal/:goalId

Obtiene todas las tareas asociadas a un objetivo específico junto con el total de minutos estimados.

**Endpoint:** `GET /api/tasks/goal/:goalId`

**Headers:** Ninguno requerido

**Path Parameters:**
- `goalId` (number, requerido): ID del objetivo

#### Ejemplo de Request

```bash
curl -X GET http://localhost:3000/api/tasks/goal/1
```

#### Response Success (200 OK)

```json
{
  "tasks": [
    {
      "id": 1,
      "userId": 1,
      "goalId": 1,
      "projectId": null,
      "title": "Diseñar modelo de base de datos",
      "estimatedMinutes": 120,
      "status": "pending",
      "priorityOverride": 5,
      "isFixed": false,
      "requiredEnergy": 3,
      "createdAt": "2026-01-29T22:36:25.000Z",
      "scheduledStartTime": null,
      "completedAt": null
    },
    {
      "id": 2,
      "userId": 1,
      "goalId": 1,
      "projectId": null,
      "title": "Implementar repositorios",
      "estimatedMinutes": 180,
      "status": "in_progress",
      "priorityOverride": 4,
      "isFixed": false,
      "requiredEnergy": 4,
      "createdAt": "2026-01-29T20:00:00.000Z",
      "scheduledStartTime": "2026-01-29T21:00:00.000Z",
      "completedAt": null
    },
    {
      "id": 3,
      "userId": 1,
      "goalId": 1,
      "projectId": null,
      "title": "Escribir documentación API",
      "estimatedMinutes": 90,
      "status": "done",
      "priorityOverride": 3,
      "isFixed": false,
      "requiredEnergy": 2,
      "createdAt": "2026-01-28T15:00:00.000Z",
      "scheduledStartTime": "2026-01-29T10:00:00.000Z",
      "completedAt": "2026-01-29T11:30:00.000Z"
    }
  ],
  "totalMinutes": 390
}
```

#### Response Success - Sin Tareas (200 OK)

```json
{
  "tasks": [],
  "totalMinutes": 0
}
```

#### Response Error - Parámetro Inválido (400 Bad Request)

```json
{
  "error": "Invalid goalId parameter"
}
```

#### Response Error - Error del Servidor (500 Internal Server Error)

```json
{
  "error": "Internal server error"
}
```

---

## Modelos de Datos

### User (Usuario)

```typescript
{
  id: number;                        // ID único del usuario
  telegramId: string;                // ID de Telegram (único)
  username?: string;                 // Nombre de usuario de Telegram (opcional)
  timezone: string;                  // Zona horaria (ej: "America/Mexico_City")
  workStartTime: string;             // Hora de inicio de trabajo (formato HH:MM)
  workEndTime: string;               // Hora de fin de trabajo (formato HH:MM)
  initialVelocityMultiplier: number; // Multiplicador de velocidad inicial
  currentEnergy: number;             // Nivel de energía actual (1-5)
}
```

### Goal (Objetivo)

```typescript
{
  id: number;                        // ID único del objetivo
  userId: number;                    // ID del usuario propietario
  title: string;                     // Título del objetivo
  metaScore: number;                 // Puntuación de importancia (1-10)
  targetDate?: Date;                 // Fecha objetivo (opcional)
  status: 'active' | 'achieved' | 'paused' | 'dropped'; // Estado del objetivo
}
```

### Task (Tarea)

```typescript
{
  id: number;                        // ID único de la tarea
  userId: number;                    // ID del usuario propietario
  goalId: number;                    // ID del objetivo asociado
  projectId?: number | null;         // ID del proyecto (opcional)
  title: string;                     // Título de la tarea
  estimatedMinutes: number;          // Tiempo estimado en minutos
  status: 'pending' | 'in_progress' | 'done' | 'archived'; // Estado de la tarea
  priorityOverride?: number;         // Prioridad manual (opcional)
  isFixed: boolean;                  // Indica si tiene horario fijo
  requiredEnergy: number;            // Energía requerida (1-5)
  createdAt?: Date | string;         // Fecha de creación
  scheduledStartTime?: Date;         // Hora programada de inicio (opcional)
  completedAt?: Date;                // Fecha de completado (opcional)
}
```

---

## Códigos de Error

### 400 Bad Request
Indica que la solicitud tiene errores de validación o parámetros inválidos.

**Ejemplos comunes:**
- Campos requeridos faltantes
- Tipos de datos incorrectos
- Formato inválido (ej: hora no en formato HH:MM)
- Valores fuera de rango (ej: metaScore no entre 1-10)

### 403 Forbidden
Indica que el recurso solicitado no pertenece al usuario o no tiene permisos.

**Ejemplos comunes:**
- Intentar crear una tarea con un goalId que no pertenece al usuario

### 409 Conflict
Indica un conflicto con el estado actual del recurso.

**Ejemplos comunes:**
- Intentar registrar un usuario con un telegramId que ya existe

### 500 Internal Server Error
Indica un error inesperado en el servidor.

**Acción recomendada:** Revisar los logs del servidor para más detalles.

---

## Notas Importantes

### Autenticación
Actualmente, la API **no requiere autenticación** para ningún endpoint. Los endpoints confían en el `userId` y `telegramId` proporcionados en las peticiones.

> ⚠️ **ADVERTENCIA DE SEGURIDAD:** En producción, se debe implementar un sistema de autenticación adecuado (JWT, OAuth, etc.) para proteger estos endpoints.

### Ownership Validation
El sistema implementa validación de propiedad para las tareas:
- Al crear una tarea, se valida que el `goalId` pertenezca al `userId` especificado
- Si el objetivo no pertenece al usuario, se retorna un error 403 Forbidden

### Valores por Defecto
Algunos campos tienen valores por defecto si no se proporcionan:

**Tasks:**
- `estimatedMinutes`: 30 minutos (aunque es requerido en validación)
- `priorityOverride`: 3
- `isFixed`: false
- `status`: 'pending'

**Goals:**
- `status`: 'active'

### Formatos de Fecha
- Las fechas se manejan en formato ISO 8601: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Los horarios de trabajo usan formato de 24 horas: `HH:MM` (ej: "09:00", "18:00")

### Relaciones entre Entidades
```
User (1) ─────< (N) Goal (1) ─────< (N) Task
```
- Un usuario puede tener múltiples objetivos
- Un objetivo puede tener múltiples tareas
- Cada tarea pertenece a exactamente un objetivo
- Cada objetivo pertenece a exactamente un usuario

---

## Ejemplos de Uso Completo

### Flujo Típico: Registrar Usuario, Crear Objetivo y Tareas

#### 1. Registrar un nuevo usuario

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": "987654321",
    "username": "maria_pro",
    "timezone": "Europe/Madrid",
    "workStartTime": "08:00",
    "workEndTime": "17:00",
    "initialVelocityMultiplier": 1.2
  }'
```

**Response:** `userId = 2`

#### 2. Crear un objetivo para el usuario

```bash
curl -X POST http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 2,
    "title": "Aprender TypeScript avanzado",
    "metaScore": 8,
    "targetDate": "2026-03-31T00:00:00.000Z"
  }'
```

**Response:** `goalId = 3`

#### 3. Crear tareas para el objetivo

```bash
# Tarea 1
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 2,
    "goalId": 3,
    "title": "Estudiar tipos avanzados",
    "estimatedMinutes": 90,
    "priorityOverride": 4
  }'

# Tarea 2
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 2,
    "goalId": 3,
    "title": "Completar ejercicios prácticos",
    "estimatedMinutes": 120,
    "priorityOverride": 3
  }'
```

#### 4. Consultar todas las tareas del objetivo

```bash
curl -X GET "http://localhost:3000/api/tasks/goal/3"
```

**Response:**
```json
{
  "tasks": [
    {
      "id": 4,
      "userId": 2,
      "goalId": 3,
      "title": "Estudiar tipos avanzados",
      "estimatedMinutes": 90,
      "status": "pending",
      "priorityOverride": 4,
      "isFixed": false,
      "requiredEnergy": 3,
      "createdAt": "2026-01-29T22:40:00.000Z"
    },
    {
      "id": 5,
      "userId": 2,
      "goalId": 3,
      "title": "Completar ejercicios prácticos",
      "estimatedMinutes": 120,
      "status": "pending",
      "priorityOverride": 3,
      "isFixed": false,
      "requiredEnergy": 3,
      "createdAt": "2026-01-29T22:40:30.000Z"
    }
  ],
  "totalMinutes": 210
}
```

#### 5. Consultar todos los objetivos del usuario

```bash
curl -X GET "http://localhost:3000/api/goals?userId=2"
```

---

## Contacto y Soporte

Para reportar problemas o solicitar nuevas funcionalidades, por favor contacta al equipo de desarrollo o abre un issue en el repositorio del proyecto.

**Repositorio:** https://github.com/nicolasclaudio/kairos-backend-typescript

---

**Última actualización:** 2026-01-29
**Versión de la API:** 1.0.0
