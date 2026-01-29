/**
 * Telegram Service
 * Handles Telegram bot interaction, user authentication, and command parsing
 */

import TelegramBot from 'node-telegram-bot-api';
import { UserRepository } from '../repositories/user.repository.js';
import { GoalRepository } from '../repositories/goal.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';

export class TelegramService {
    private bot: TelegramBot;

    constructor(
        private token: string,
        private userRepo: UserRepository,
        private goalRepo: GoalRepository,
        private taskRepo: TaskRepository
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
                } else if (text.startsWith('/start')) {
                    await this.bot.sendMessage(chatId, `👋 Hola ${user.username || 'Viajero'}! Estoy listo para capturar tus metas y tareas.`);
                } else {
                    await this.bot.sendMessage(chatId, `🤔 No entendí ese comando. Prueba con:\n/meta [título] - Crear Meta\n/todo [título] - Crear Tarea`);
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
}
