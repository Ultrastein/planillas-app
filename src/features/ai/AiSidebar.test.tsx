import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiSidebar } from './AiSidebar';
import { useDocumentStore } from '../../store/useDocumentStore';

vi.mock('lucide-react', () => ({
    Sparkles: () => <div>Sparkles</div>,
    Hammer: () => <div>Hammer</div>,
    ShieldAlert: () => <div>ShieldAlert</div>,
    Package: () => <div>Package</div>,
    Send: () => <div>Send</div>,
}));

vi.mock('./aiService', () => ({
    analyzeDocumentContent: vi.fn(),
    askGeminiQuestion: vi.fn(),
    generateFullPlan: vi.fn(),
    generateRubric: vi.fn(),
    suggestActivities: vi.fn(),
    generateExecutiveSummary: vi.fn(),
    improveText: vi.fn(),
}));

vi.mock('../../data/templates', () => ({
    QUICK_TEMPLATES: [
        { id: 'test', name: 'Test', icon: '🧪', prompt: 'test prompt' },
    ],
}));

describe('AiSidebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useDocumentStore.setState({
            selectedDoc: null,
            allDocuments: [],
            editorSelection: null,
            pendingReplacement: null,
            pendingCreateFromAI: null,
        });
    });

    it('renders Generar tab by default with generator section', () => {
        render(<AiSidebar />);
        expect(screen.getByText(/Generador de Planificación/i)).toBeInTheDocument();
    });

    it('shows all 4 tab buttons', () => {
        render(<AiSidebar />);
        expect(screen.getByText('✨ Generar')).toBeInTheDocument();
        expect(screen.getByText('🔍 Analizar')).toBeInTheDocument();
        expect(screen.getByText('🛠️ Mejorar')).toBeInTheDocument();
        expect(screen.getByText('💬 Chat')).toBeInTheDocument();
    });

    it('shows empty state in Analizar tab when no doc selected', () => {
        render(<AiSidebar />);
        fireEvent.click(screen.getByText('🔍 Analizar'));
        expect(screen.getByText(/Abrí una planificación para analizarla/i)).toBeInTheDocument();
    });

    it('shows global chat mode message when no doc is selected', () => {
        useDocumentStore.setState({ allDocuments: [{ id: '1', title: 'Clase 1', tematica: 'Robótica', grado: '3ro', author_name: 'Prof X' }] });
        render(<AiSidebar />);
        fireEvent.click(screen.getByText('💬 Chat'));
        expect(screen.getByText(/1 planificaciones disponibles/i)).toBeInTheDocument();
    });
});
