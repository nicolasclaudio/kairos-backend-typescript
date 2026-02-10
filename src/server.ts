// src/server.ts
import express, { Application, Request, Response } from 'express';
import userRoutes from './api/routes/user.routes.js';
import goalRoutes from './api/routes/goal.routes.js';
import taskRoutes from './api/routes/task.routes.js';
import authRoutes from './api/routes/auth.routes.js';
import analyticsRoutes from './api/routes/analytics.routes.js';
import projectRoutes from './api/routes/project.routes.js';
import focusSessionRoutes from './api/routes/focus-session.routes.js';
import notificationRoutes from './api/routes/notification.routes.js';

const app: Application = express();
app.use(express.json());

// API Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', goalRoutes);
app.use('/api', taskRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/focus-sessions', focusSessionRoutes);
app.use('/api', notificationRoutes);


// Ruta de salud para verificar que Kairos está en línea
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'Kairos Core is breathing', timestamp: new Date() });
});

export default app;
