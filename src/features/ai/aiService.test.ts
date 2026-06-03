import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn(function () {
        return { models: { generateContent: mockGenerateContent } };
    })
}));

vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

import {
    generateFullPlan,
    generateRubric,
    suggestActivities,
    generateExecutiveSummary,
    improveText
} from './aiService';

describe('aiService — new functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generateFullPlan returns title, content, metadata', async () => {
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify({
                title: 'Clase 1: Introducción a Arduino',
                content: '<h2>Objetivos</h2><p>Aprender pines digitales</p>',
                metadata: { curso: 'Robótica', grado: '3ro', anio: '2026', carga_horaria: '2 módulos', tematica: 'Programación y Robótica', num_clase: '1' }
            })
        });
        const result = await generateFullPlan('Arduino para 3er año');
        expect(result.title).toBe('Clase 1: Introducción a Arduino');
        expect(result.content).toContain('<h2>');
        expect(result.metadata.tematica).toBe('Programación y Robótica');
    });

    it('generateRubric returns HTML string', async () => {
        mockGenerateContent.mockResolvedValue({
            text: '<table><tr><th>Criterio</th></tr></table>'
        });
        const result = await generateRubric('<p>Contenido</p>', 'Clase 1');
        expect(result).toContain('<table>');
    });

    it('suggestActivities returns 3 activities', async () => {
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify([
                { title: 'Act 1', description: 'Desc 1', type: 'refuerzo' },
                { title: 'Act 2', description: 'Desc 2', type: 'extension' },
                { title: 'Act 3', description: 'Desc 3', type: 'evaluacion' },
            ])
        });
        const result = await suggestActivities('<p>Contenido</p>', 'Clase 1');
        expect(result).toHaveLength(3);
        expect(result[0].type).toBe('refuerzo');
    });

    it('generateExecutiveSummary returns a string', async () => {
        mockGenerateContent.mockResolvedValue({ text: 'Clase introductoria sobre Arduino para 3er año.' });
        const result = await generateExecutiveSummary('<p>Contenido</p>', 'Clase 1');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('improveText returns improved string', async () => {
        mockGenerateContent.mockResolvedValue({ text: 'Texto mejorado y profesional.' });
        const result = await improveText('texto malo');
        expect(result).toBe('Texto mejorado y profesional.');
    });
});
