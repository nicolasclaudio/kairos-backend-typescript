/**
 * Kairos Core - Entry Point
 * Main application entry point - Bootstraps Database and Express Server
 */

import app from './server.js';
import { pool } from './config/database.js';

const PORT = process.env.PORT || 3000;

// Función para verificar la conexión a la base de datos
async function checkDatabaseConnection() {
    try {
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection established');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

// Inicializar la aplicación
async function bootstrap() {
    try {
        // Verificar conexión a la base de datos
        await checkDatabaseConnection();

        // Initializes Telegram Bot if token is present
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        if (telegramToken) {
            const { TelegramService } = await import('./infrastructure/services/telegram.service.js');
            const { UserRepository } = await import('./infrastructure/repositories/user.repository.js');
            const { GoalRepository } = await import('./infrastructure/repositories/goal.repository.js');
            const { TaskRepository } = await import('./infrastructure/repositories/task.repository.js');
            const { LlmService } = await import('./infrastructure/services/llm.service.js');
            const { AnalyticsService } = await import('./domain/services/analytics.service.js');
            const { PlannerService } = await import('./domain/services/planner.service.js');

            const userRepo = new UserRepository();
            const goalRepo = new GoalRepository();
            const taskRepo = new TaskRepository();
            const llmService = new LlmService();
            const analyticsService = new AnalyticsService(taskRepo);
            const plannerService = new PlannerService(taskRepo, userRepo); // Using real deps if planner depends on them

            const telegramService = new TelegramService(telegramToken, userRepo, goalRepo, taskRepo, plannerService, llmService, analyticsService);
            telegramService.initialize();
        } else {
            console.warn('⚠️ TELEGRAM_BOT_TOKEN not found. Telegram bot disabled.');
        }

        // Iniciar servidor Express
        app.listen(PORT, () => {
            console.log(`🚀 Kairos Core is running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('💥 Failed to start Kairos Core:', error);
        process.exit(1);
    }
}

bootstrap();
