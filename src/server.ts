// src/server.ts
import express, { Application, Request, Response } from 'express';

const app: Application = express();
app.use(express.json());

// Ruta de salud para verificar que Kairos está en línea
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'Kairos Core is breathing', timestamp: new Date() });
});

export default app;
