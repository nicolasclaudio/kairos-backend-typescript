/**
 * Environment Configuration
 * Centralized environment variables management
 */

export interface EnvConfig {
    nodeEnv: string;
    port: number;
    logLevel: string;
    telegramBotToken: string;
    telegramWebhookUrl?: string;
}

export function getEnvConfig(): EnvConfig {
    return {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000', 10),
        logLevel: process.env.LOG_LEVEL || 'info',
        telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
        telegramWebhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    };
}
