/**
 * Telegram Service
 * Handles Telegram bot interaction, user authentication, and command parsing
 */

import TelegramBot from 'node-telegram-bot-api';
import { UserRepository } from '../repositories/user.repository.js';
import { GoalRepository } from '../repositories/goal.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { LlmService, TaskExtraction } from './llm.service.js';

export class TelegramService {
    private bot: TelegramBot;
    // Simple in-memory storage for pending task creation (User ID -> Task Draft)
    private pendingTasks: Map<number, TaskExtraction> = new Map();

    constructor(
        private token: string,
        private userRepo: UserRepository,
        private goalRepo: GoalRepository,
        private taskRepo: TaskRepository,
        private llmService: LlmService
    ) {
        this.bot = new TelegramBot(token, { polling: true });
    }

    initialize(): void {
        console.log('🤖 Telegram Bot Service Initialized');

        // Text Messages
        this.bot.on('message', async (msg) => {
            if (!msg.text || !msg.from) return;

            const chatId = msg.chat.id;
            const telegramId = msg.from.id.toString();
            const text = msg.text.trim();

            try {
                const user = await this.userRepo.findByTelegramId(telegramId);

                if (!user) {
                    await this.bot.sendMessage(chatId, `⚠️ Usuario no registrado. ID: \`${telegramId}\``, { parse_mode: 'Markdown' });
                    return;
                }

                if (text.startsWith('/')) {
                    if (text.startsWith('/meta')) await this.handleMetaCommand(chatId, user.id, text);
                    else if (text.startsWith('/todo')) await this.handleTodoCommand(chatId, user.id, text);
                    else if (text.startsWith('/start')) await this.bot.sendMessage(chatId, `👋 Hola ${user.username || 'Viajero'}!`);
                    else await this.bot.sendMessage(chatId, `🤔 Comando desconocido.`);
                } else {
                    // LLM Processing
                    await this.handleNaturalLanguage(chatId, user, text);
                }

            } catch (error) {
                console.error('Error handling message:', error);
                await this.bot.sendMessage(chatId, '❌ Error procesando mensaje.');
            }
        });

        // Callback Queries (Buttons)
        this.bot.on('callback_query', async (query) => {
            if (!query.data || !query.message || !query.from) return;

            const chatId = query.message.chat.id;
            const telegramId = query.from.id.toString();

            try {
                const user = await this.userRepo.findByTelegramId(telegramId);
                if (!user) return;

                if (query.data.startsWith('goal:')) {
                    const goalId = parseInt(query.data.split(':')[1]);
                    await this.handleGoalSelection(chatId, user.id, goalId);

                    // Answer callback to remove loading state
                    await this.bot.answerCallbackQuery(query.id);
                }
            } catch (error) {
                console.error('Error handling callback:', error);
            }
        });
    }

    private async handleNaturalLanguage(chatId: number, user: any, text: string): Promise<void> {
        await this.bot.sendChatAction(chatId, 'typing');

        try {
            const goals = await this.goalRepo.findByUserId(user.id);
            const extraction = await this.llmService.extractTaskDetails(text, goals);

            let targetGoalId: number | null = null;
            let goalTitle = 'Inbox';

            if (extraction.goalName) {
                const goal = goals.find(g => g.title.toLowerCase() === extraction.goalName?.toLowerCase());
                if (goal) {
                    targetGoalId = goal.id;
                    goalTitle = goal.title;
                }
            }

            // If confident, create immediately
            if (targetGoalId) {
                await this.createTaskFromExtraction(chatId, user.id, targetGoalId, goalTitle, extraction);
            } else {
                // Ambiguity: Ask user
                this.pendingTasks.set(user.id, extraction);

                // Keyboard
                const buttons = goals.map(g => ([{ text: g.title, callback_data: `goal:${g.id}` }]));
                // Add Create New Option? For now just existing goals + Inbox if exists

                await this.bot.sendMessage(chatId, `🧠 Entendido: "${extraction.title}".\n¿A qué meta corresponde?`, {
                    reply_markup: { inline_keyboard: buttons }
                });
            }

        } catch (error) {
            console.error('LLM Error:', error);
            await this.bot.sendMessage(chatId, '😵 Mi mente sintética falló. Intenta de nuevo.');
        }
    }

    private async handleGoalSelection(chatId: number, userId: number, goalId: number): Promise<void> {
        const draft = this.pendingTasks.get(userId);
        if (!draft) {
            await this.bot.sendMessage(chatId, '⚠️ La sesión ha expirado. Escribe la tarea de nuevo.');
            return;
        }

        const goals = await this.goalRepo.findByUserId(userId);
        const goal = goals.find(g => g.id === goalId);

        if (goal) {
            await this.createTaskFromExtraction(chatId, userId, goal.id, goal.title, draft);
            this.pendingTasks.delete(userId);
        }
    }

    private async createTaskFromExtraction(chatId: number, userId: number, goalId: number, goalTitle: string, data: TaskExtraction) {
        const task = await this.taskRepo.create({
            userId,
            goalId,
            title: data.title,
            estimatedMinutes: data.estimatedMinutes,
            status: 'pending',
            priorityOverride: 3,
            isFixed: data.isFixed,
            scheduledStartTime: data.scheduledStartTime ? new Date(data.scheduledStartTime) : undefined
        });

        const timeInfo = task.scheduledStartTime
            ? `\n📅 *${task.scheduledStartTime.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}*`
            : '';

        await this.bot.sendMessage(chatId,
            `✅ Tarea guardada en *${goalTitle}*:\n📝 *${task.title}* (${task.estimatedMinutes}m)${timeInfo}`,
            { parse_mode: 'Markdown' }
        );
    }

    // Legacy Commands Handlers
    private async handleMetaCommand(chatId: number, userId: number, text: string): Promise<void> {
        const title = text.replace('/meta', '').trim();
        if (!title) { await this.bot.sendMessage(chatId, 'Falta título'); return; }
        await this.goalRepo.create({ userId, title, metaScore: 5, status: 'active' });
        await this.bot.sendMessage(chatId, `✅ Meta creada: ${title}`);
    }

    private async handleTodoCommand(chatId: number, userId: number, text: string): Promise<void> {
        const title = text.replace('/todo', '').trim();
        if (!title) { await this.bot.sendMessage(chatId, 'Falta título'); return; }
        const goals = await this.goalRepo.findByUserId(userId);
        let inbox = goals.find(g => g.title === 'Inbox');
        if (!inbox) inbox = await this.goalRepo.create({ userId, title: 'Inbox', metaScore: 1, status: 'active' });
        await this.taskRepo.create({ userId, goalId: inbox.id, title, estimatedMinutes: 30, isFixed: false, status: 'pending' });
        await this.bot.sendMessage(chatId, `✅ Tarea en Inbox: ${title}`);
    }
}
