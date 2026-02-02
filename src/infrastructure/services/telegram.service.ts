/**
 * Telegram Service
 * Handles Telegram bot interaction, user authentication, and command parsing
 */

import TelegramBot from 'node-telegram-bot-api';
import { UserRepository } from '../repositories/user.repository.js';
import { GoalRepository } from '../repositories/goal.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { PlannerService } from '../../domain/services/planner.service.js';
import { LlmService, TaskExtraction } from './llm.service.js';
import { AnalyticsService } from '../../domain/services/analytics.service.js';
import { BankruptcyOption } from '../../domain/entities.js';

export class TelegramService {
    private bot: TelegramBot;
    // Simple in-memory storage for pending task creation (User ID -> Task Draft)
    private pendingTasks: Map<number, TaskExtraction> = new Map();

    constructor(
        private token: string,
        private userRepo: UserRepository,
        private goalRepo: GoalRepository,
        private taskRepo: TaskRepository,
        private plannerService: PlannerService,
        private llmService: LlmService,
        private analyticsService: AnalyticsService
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
                    else if (text.startsWith('/plan')) await this.handlePlanCommand(chatId, user.id, text);
                    else if (text.startsWith('/energy')) await this.handleEnergyCommand(chatId, user.id, text);
                    else if (text.startsWith('/done')) await this.handleDoneCommand(chatId, user.id, text);
                    else if (text.startsWith('/status')) await this.handleStatusCommand(chatId, user.id);
                    else if (text.startsWith('/archive')) await this.handleArchiveCommand(chatId, user.id, text);
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
                } else if (query.data.startsWith('bankruptcy:')) {
                    const option = query.data.split(':')[1] as BankruptcyOption;
                    const response = await this.plannerService.executeBankruptcy(user.id, option);
                    await this.bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
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
            requiredEnergy: 3, // Default for now
            scheduledStartTime: data.scheduledStartTime ? new Date(data.scheduledStartTime) : undefined
        });

        const timeInfo = task.scheduledStartTime
            ? `\n📅 *${task.scheduledStartTime.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}*`
            : '';

        await this.bot.sendMessage(chatId,
            `✅ Tarea guardada en *${goalTitle}*:\n📝 *${task.title}* (${task.estimatedMinutes}m)${timeInfo}`,
            { parse_mode: 'Markdown' }
        );

        await this.checkAndTriggerBankruptcy(chatId, userId);
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
        await this.taskRepo.create({ userId, goalId: inbox.id, title, estimatedMinutes: 30, isFixed: false, status: 'pending', requiredEnergy: 3 });
        await this.bot.sendMessage(chatId, `✅ Tarea en Inbox: ${title}`);
        await this.checkAndTriggerBankruptcy(chatId, userId);
    }

    /**
     * Handle /plan command (US#8)
     */
    private async handlePlanCommand(chatId: number, userId: number, text: string): Promise<void> {
        // Optional: User can override energy via param like /plan 5 (if we want, but mostly it uses context)
        // For now, simple /plan uses stored context
        try {
            const user = await this.userRepo.findById(userId);
            const energy = user?.currentEnergy || 3;
            await this.bot.sendMessage(chatId, `⏳ Generando plan para energía nivel ${energy}...`);
            const plan = await this.plannerService.generateDailyPlan(userId, energy);
            await this.bot.sendMessage(chatId, plan, { parse_mode: 'Markdown' });

            // Check overload implicitly
            await this.checkAndTriggerBankruptcy(chatId, userId);
        } catch (error) {
            console.error('Error in plan:', error);
            await this.bot.sendMessage(chatId, '❌ Error generando plan.');
        }
    }

    /**
     * Checks load and triggers bankruptcy alert if needed
     */
    private async checkAndTriggerBankruptcy(chatId: number, userId: number): Promise<void> {
        const load = await this.plannerService.calculateDailyLoad(userId);
        const weeklyStats = await this.analyticsService.getWeeklyStats(userId);

        let msg = '';

        // 1. Check Velocity Mismatch (Over-planning)
        // If Demand > Velocity * 1.2 (20% tolerance) AND not yet bankrupt level?
        // Or just an advice? "Oye, planeaste 300m pero tu velocidad es 200m."
        if (weeklyStats.velocity > 0 && load.demandMinutes > weeklyStats.velocity * 1.1) {
            const diff = load.demandMinutes - weeklyStats.velocity;
            msg += `🐢 **Alerta de Realidad**: Planeaste ${load.demandMinutes}m, pero tu velocidad real es ${weeklyStats.velocity}m.\n` +
                `Estás excedido por **${diff}m** basado en tu histórico.\n\n`;
        }

        if (load.isOverloaded) {
            const demandHours = (load.demandMinutes / 60).toFixed(1);
            const capacityHours = (load.capacityMinutes / 60).toFixed(1);

            msg += `⚠️ **ALERTA DE BANCARROTA TÉCNICA** ⚠️\n` +
                `🔥 Tienes **${demandHours}h** de tareas para **${capacityHours}h** de energía real.\n` +
                `El plan actual es imposible. ¿Qué hacemos?`;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '⚔️ Liquidación Total (Archivar <5)', callback_data: `bankruptcy:${BankruptcyOption.HARD}` }],
                    [{ text: '🍃 Reajuste Suave (Mañana)', callback_data: `bankruptcy:${BankruptcyOption.SOFT}` }],
                    [{ text: '🛠 Selección Manual', callback_data: `bankruptcy:${BankruptcyOption.MANUAL}` }]
                ]
            };

            await this.bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', reply_markup: keyboard });
        } else if (msg) {
            // Send just the velocity warning if not bankrupt
            await this.bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        }
    }

    /**
     * Handle /energy command (US#8)
     */
    private async handleEnergyCommand(chatId: number, userId: number, text: string): Promise<void> {
        const level = parseInt(text.replace('/energy', '').trim());
        if (isNaN(level) || level < 1 || level > 5) {
            await this.bot.sendMessage(chatId, '⚠️ Uso: /energy [1-5]');
            return;
        }
        await this.userRepo.updateEnergy(userId, level);
        await this.bot.sendMessage(chatId, `⚡ Energía: ${level}. Usa /plan para reajustar.`, { parse_mode: 'Markdown' });
    }

    /**
     * Handle /done [id] command (US#7/8)
     */
    private async handleDoneCommand(chatId: number, userId: number, text: string): Promise<void> {
        const taskId = parseInt(text.replace('/done', '').trim());
        if (isNaN(taskId)) { await this.bot.sendMessage(chatId, '⚠️ Uso: /done [ID]'); return; }

        try {
            const success = await this.taskRepo.markAsDone(taskId, userId);
            if (success) await this.bot.sendMessage(chatId, `✅ Tarea *#${taskId}* completada.`, { parse_mode: 'Markdown' });
            else await this.bot.sendMessage(chatId, `❌ Tarea no encontrada.`);
        } catch (e) { await this.bot.sendMessage(chatId, '❌ Error.'); }
    }

    /**
     * Handle /status command (US#7)
     */
    private async handleStatusCommand(chatId: number, userId: number): Promise<void> {
        try {
            const goals = await this.goalRepo.findByUserId(userId);
            const active = goals.filter(g => g.status === 'active');
            const dailyStats = await this.taskRepo.getDailyStats(userId);
            const weeklyStats = await this.analyticsService.getWeeklyStats(userId);

            let msg = `📊 *Tablero de Mando*\n\n`;
            msg += `🚀 *Velocity (7d)*: ${weeklyStats.velocity} min/día\n`;
            msg += `🎯 *Impacto*: ${weeklyStats.impactScore}% (Metas > 7)\n`;
            msg += `✅ *Hoy*: ${dailyStats.completed} tareas\n\n`;

            msg += `*Metas Activas:*\n`;
            for (const g of active) {
                const count = await this.taskRepo.countPendingByGoalId(g.id);
                if (count > 0) msg += `🔹 ${g.title}: ${count} pendientes\n`;
            }

            // Suggestion based on velocity (Mocked Logic for now, can be sophisticated)
            // If we had planned today, we could compare. For now just generic advice if Velocity is low?
            // "Tip: Tu velocity sugiere que planifiques máx X minutos."

            await this.bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error(e);
            await this.bot.sendMessage(chatId, '❌ Error obteniendo status.');
        }
    }

    /**
     * Handle /archive [id] command
     */
    private async handleArchiveCommand(chatId: number, userId: number, text: string): Promise<void> {
        const taskId = parseInt(text.replace('/archive', '').trim());
        if (isNaN(taskId)) { await this.bot.sendMessage(chatId, '⚠️ Uso: /archive [ID]'); return; }

        try {
            const success = await this.taskRepo.archive(taskId, userId);
            if (success) await this.bot.sendMessage(chatId, `🗑️ Tarea *#${taskId}* archivada.`, { parse_mode: 'Markdown' });
            else await this.bot.sendMessage(chatId, `❌ Tarea no encontrada.`);
        } catch (e) { await this.bot.sendMessage(chatId, '❌ Error.'); }
    }
}
