import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiSidebar } from './AiSidebar';
import { useVersionStore } from '../../store/useVersionStore';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Sparkles: () => <div>Sparkles</div>,
    Hammer: () => <div>Hammer</div>,
    ShieldAlert: () => <div>ShieldAlert</div>,
    Package: () => <div>Package</div>,
}));

describe('AiSidebar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useVersionStore.setState({ versions: [], previewVersion: null, isLoading: false });
    });

    it('renders empty state when no versions exist', () => {
        // Versions is empty by default in beforeEach
        render(<AiSidebar />);
        expect(screen.getByText(/Guarda tu primer snapshot/i)).toBeInTheDocument();
    });

    it('shows analyzing state and then results when a version exists', async () => {
        useVersionStore.setState({
            versions: [
                {
                    id: '1',
                    document_id: 'doc-1',
                    content: 'Electricidad 101',
                    author_id: 'u1',
                    author_name: 'Test Docente',
                    created_at: new Date().toISOString()
                }
            ]
        });

        render(<AiSidebar />);

        // Initially shows analyzing
        expect(screen.getByText('Escaneando requerimientos...')).toBeInTheDocument();

        // After mock delay, it should show results
        await waitFor(() => {
            expect(screen.getByText('Taller de Electricidad')).toBeInTheDocument();
            expect(screen.getByText('Gafas de seguridad')).toBeInTheDocument();
        }, { timeout: 3000 });
    });
});
