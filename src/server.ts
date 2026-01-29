// src/server.ts
import express, { Application, Request, Response } from 'express';
import userRoutes from './api/routes/user.routes.js';
import goalRoutes from './api/routes/goal.routes.js';

const app: Application = express();
app.use(express.json());

// API Routes
app.use('/api', userRoutes);
app.use('/api', goalRoutes);

// Ruta de salud para verificar que Kairos está en línea
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'Kairos Core is breathing', timestamp: new Date() });
});

export default app;
