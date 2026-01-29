/**
 * Telegram Service
 * Handles Telegram bot interaction, user authentication, and command parsing
 */

import TelegramBot from 'node-telegram-bot-api';
import { UserRepository } from '../repositories/user.repository.js';
import { GoalRepository } from '../repositories/goal.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { PlannerService } from '../../domain/services/planner.service.js';

export class TelegramService {
    private bot: TelegramBot;

    constructor(
        private token: string,
        private userRepo: UserRepository,
        private goalRepo: GoalRepository,
        private taskRepo: TaskRepository,
        private plannerService: PlannerService
    ) {
        // Basic polling for development
        this.bot = new TelegramBot(token, { polling: true });
    }

    /**
     * Initialize bot listeners
     */
    initialize(): void {
        console.log('🤖 Telegram Bot Service Initialized');

        // Handle all text messages
        this.bot.on('message', async (msg) => {
            // Ignore non-text messages
            if (!msg.text || !msg.from) return;

            const chatId = msg.chat.id;
            const telegramId = msg.from.id.toString();
            const text = msg.text.trim();

            try {
                // 1. Authenticate User
                const user = await this.userRepo.findByTelegramId(telegramId);

                if (!user) {
                    await this.bot.sendMessage(
                        chatId,
                        `⚠️ Usuario no registrado. Tu Telegram ID es: \`${telegramId}\`.\nPor favor regístrate en el sistema.`
                        , { parse_mode: 'Markdown' });
                    return;
                }

                // 2. Parse Commands
                if (text.startsWith('/meta')) {
                    await this.handleMetaCommand(chatId, user.id, text);
                } else if (text.startsWith('/todo')) {
                    await this.handleTodoCommand(chatId, user.id, text);
                } else if (text.startsWith('/plan')) {
                    await this.handlePlanCommand(chatId, user.id);
                } else if (text.startsWith('/done')) {
                    await this.handleDoneCommand(chatId, user.id, text);
                } else if (text.startsWith('/status')) {
                    await this.handleStatusCommand(chatId, user.id);
                } else if (text.startsWith('/archive')) {
                    await this.handleArchiveCommand(chatId, user.id, text);
                } else if (text.startsWith('/start')) {
                    await this.bot.sendMessage(chatId, `👋 Hola ${user.username || 'Viajero'}! Estoy listo para capturar tus metas y tareas.`);
                } else {
                    await this.bot.sendMessage(chatId,
                        `🤔 No entendí ese comando. Comandos disponibles:\n` +
                        `/meta [título] - Crear Meta\n` +
                        `/todo [título] - Crear Tarea\n` +
                        `/plan - Generar Itinerario\n` +
                        `/done [id] - Completar Tarea\n` +
                        `/status - Ver Progreso`
                    );
                }

            } catch (error) {
                console.error('Error handling Telegram message:', error);
                await this.bot.sendMessage(chatId, '❌ Ocurrió un error procesando tu mensaje.');
            }
        });

        // Error handling
        this.bot.on('polling_error', (error) => {
            console.error('Telegram Polling Error:', error.message);
        });
    }

    /**
     * Handle /meta command
     */
    private async handleMetaCommand(chatId: number, userId: number, text: string): Promise<void> {
        const title = text.replace('/meta', '').trim();

        if (!title) {
            await this.bot.sendMessage(chatId, '⚠️ Por favor escribe el título de la meta.\nEjemplo: `/meta Aprender Rust`', { parse_mode: 'Markdown' });
            return;
        }

        try {
            const goal = await this.goalRepo.create({
                userId,
                title,
                metaScore: 5, // Default medium priority for quick capture
                status: 'active'
            });

            await this.bot.sendMessage(chatId, `✅ Meta registrada con éxito:\n*${goal.title}*`, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Error creating goal via Telegram:', error);
            await this.bot.sendMessage(chatId, '❌ Error al crear la meta.');
        }
    }

    /**
     * Handle /todo command
     */
    private async handleTodoCommand(chatId: number, userId: number, text: string): Promise<void> {
        const title = text.replace('/todo', '').trim();

        if (!title) {
            await this.bot.sendMessage(chatId, '⚠️ Por favor escribe el título de la tarea.\nEjemplo: `/todo Configurar CI/CD`', { parse_mode: 'Markdown' });
            return;
        }

        try {
            // Find "Inbox" goal or create it
            const userGoals = await this.goalRepo.findByUserId(userId);
            let inboxGoal = userGoals.find(g => g.title.toLowerCase() === 'inbox');

            if (!inboxGoal) {
                inboxGoal = await this.goalRepo.create({
                    userId,
                    title: 'Inbox',
                    metaScore: 1, // Low priority container
                    status: 'active'
                });
            }

            const task = await this.taskRepo.create({
                userId,
                goalId: inboxGoal.id,
                title,
                estimatedMinutes: 30, // Default duration
                status: 'pending',
                priorityOverride: 3,
                isFixed: false
            });

            await this.bot.sendMessage(chatId, `✅ Tarea registrada en *Inbox*:\n*${task.title}*`, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Error creating task via Telegram:', error);
            await this.bot.sendMessage(chatId, '❌ Error al crear la tarea.');
        }
    }

    /**
     * Handle /plan command
     */
    private async handlePlanCommand(chatId: number, userId: number): Promise<void> {
        try {
            await this.bot.sendMessage(chatId, '⏳ Generando tu plan óptimo...');

            const plan = await this.plannerService.generateDailyPlan(userId);

            await this.bot.sendMessage(chatId, plan, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Error generating plan via Telegram:', error);
            await this.bot.sendMessage(chatId, '❌ Error al generar el plan.');
        }
    }

    /**
     * Handle /done [id] command
     */
    private async handleDoneCommand(chatId: number, userId: number, text: string): Promise<void> {
        const taskIdStr = text.replace('/done', '').trim();
        const taskId = parseInt(taskIdStr, 10);

        if (isNaN(taskId)) {
            await this.bot.sendMessage(chatId, '⚠️ Por favor indica el ID de la tarea.\nEjemplo: `/done 15`', { parse_mode: 'Markdown' });
            return;
        }

        try {
            // 1. Get task to know goalId before marking done (optional, but good for context output)
            // But we don't have findById in repo yet (lazy). Let's trust markAsDone for now.

            // Actually, to check goal completion, we might want to know the goalId.
            // But markAsDone only returns boolean.
            // Let's implement robustly: markAsDone first.

            const success = await this.taskRepo.markAsDone(taskId, userId);

            if (!success) {
                await this.bot.sendMessage(chatId, `❌ No se encontró la tarea #${taskId} o no te pertenece.`);
                return;
            }

            await this.bot.sendMessage(chatId, `✅ Tarea *#${taskId}* marcada como completada.`, { parse_mode: 'Markdown' });

            // TODO: In future, check if goal is empty and suggest archive.
            // For V1, simple done is enough.

        } catch (error) {
            console.error('Error marking task as done:', error);
            await this.bot.sendMessage(chatId, '❌ Error al actualizar la tarea.');
        }
    }

    /**
     * Handle /status command
     */
    private async handleStatusCommand(chatId: number, userId: number): Promise<void> {
        try {
            const goals = await this.goalRepo.findByUserId(userId);
            const activeGoals = goals.filter(g => g.status === 'active');

            const dailyStats = await this.taskRepo.getDailyStats(userId);
            const remainingMinutes = await this.taskRepo.getTotalRemainingMinutes(userId);

            const hours = Math.floor(remainingMinutes / 60);
            const mins = remainingMinutes % 60;

            let report = `📊 *Estado del Proyecto*\n\n`;

            report += `📈 *Progreso Diario*\n`;
            report += `   ✅ Completadas hoy: ${dailyStats.completed}\n`;
            report += `   ⏳ Carga Restante: ${hours}h ${mins}m\n\n`;

            report += `🎯 *Metas Activas (${activeGoals.length})*\n`;

            for (const goal of activeGoals) {
                const pendingCount = await this.taskRepo.countPendingByGoalId(goal.id);
                if (pendingCount > 0) {
                    report += `   🔹 ${goal.title} (Score: ${goal.metaScore}) - ${pendingCount} pendientes\n`;
                } else {
                    report += `   ✨ ${goal.title} (¡Completa!) - Usa \`/archive ${goal.id}\`\n`;
                }
            }

            await this.bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error('Error getting status:', error);
            await this.bot.sendMessage(chatId, '❌ Error al obtener el estado.');
        }
    }

    /**
     * Handle /archive [id] command
     */
    private async handleArchiveCommand(chatId: number, userId: number, text: string): Promise<void> {
        const goalIdStr = text.replace('/archive', '').trim();
        const goalId = parseInt(goalIdStr, 10);

        if (isNaN(goalId)) {
            await this.bot.sendMessage(chatId, '⚠️ ID de meta inválido.');
            return;
        }

        try {
            await this.goalRepo.archive(goalId);
            await this.bot.sendMessage(chatId, `📦 Meta #${goalId} archivada.`);
        } catch (error) {
            await this.bot.sendMessage(chatId, '❌ Error al archivar.');
        }
    }
}
