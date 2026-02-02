import { Goal } from '../../domain/entities.js';

export interface TaskExtraction {
    title: string;
    estimatedMinutes: number;
    goalName?: string;
    scheduledStartTime?: string; // ISO8601
    isFixed: boolean;
}

interface DeepSeekResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export class LlmService {
    private apiKey: string;
    // Using DeepSeek API endpoint. Compatible with OpenAI format.
    private apiUrl = 'https://api.deepseek.com/chat/completions';

    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    }

    async extractTaskDetails(text: string, goals: Goal[]): Promise<TaskExtraction> {
        if (!this.apiKey) {
            console.warn('DEEPSEEK_API_KEY not found in env. Returning fallback.');
            return {
                title: text,
                estimatedMinutes: 30,
                isFixed: false,
                goalName: undefined
            };
        }

        const now = new Date();
        const goalList = goals.map(g => `- ${g.title}`).join('\n');

        const systemPrompt = `
You are an AI assistant for a productivity app. Parse the user input into a structured Task.
Current Time: ${now.toISOString()} (${now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })})

Available Goals:
${goalList}

Instructions:
1. Extract "title".
2. Estimate "estimatedMinutes" (default 30).
3. Identify "goalName" from the list. If unsure, null.
4. Extract "scheduledStartTime" if a specific time is mentioned (e.g., "mañana a las 9am"). Convert to ISO8601. If no time, null.
5. Set "isFixed" to true if scheduledStartTime is present.

Output strictly valid JSON.
Example:
{
  "title": "Revisar contrato",
  "estimatedMinutes": 60,
  "goalName": "Expansión",
  "scheduledStartTime": "2026-01-29T15:00:00.000Z",
  "isFixed": true
}
`;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: text }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.2
                })
            });

            if (!response.ok) {
                const err = await response.text();
                // If 404/401, fallback
                console.error(`DeepSeek API Error: ${response.status} - ${err}`);
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json() as DeepSeekResponse;
            const content = data.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error('LLM Extraction failed:', error);
            // Fallback
            return {
                title: text,
                estimatedMinutes: 30,
                isFixed: false
            };
        }
    }
}
