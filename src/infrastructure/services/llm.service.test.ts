import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmService } from './llm.service.js';

// Mock global fetch
global.fetch = vi.fn();

describe('LlmService', () => {
    let service: LlmService;

    beforeEach(() => {
        process.env.DEEPSEEK_API_KEY = 'mock-key';
        service = new LlmService();
        vi.clearAllMocks();
    });

    it('should extract task details correctly from valid JSON response', async () => {
        const mockContent = JSON.stringify({
            title: 'Test Task',
            estimatedMinutes: 45,
            goalName: 'Goal 1',
            scheduledStartTime: '2023-01-01T10:00:00.000Z',
            isFixed: true
        });

        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: mockContent } }]
            })
        });

        const result = await service.extractTaskDetails('some text', []);

        expect(result.title).toBe('Test Task');
        expect(result.estimatedMinutes).toBe(45);
        expect(result.isFixed).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API error gracefully and return fallback', async () => {
        (fetch as any).mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error'
        });

        const input = 'Simple Task';
        const result = await service.extractTaskDetails(input, []);

        expect(result.title).toBe(input);
        expect(result.estimatedMinutes).toBe(30); // Default
        expect(result.isFixed).toBe(false);
    });

    it('should fallback if JSON parsing fails', async () => {
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'Invalid JSON' } }]
            })
        });

        const result = await service.extractTaskDetails('foo', []);

        expect(result.title).toBe('foo');
    });
});
