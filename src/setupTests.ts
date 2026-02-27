import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Supabase mock
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
                data: [
                    { id: '1', name: 'Admin User', email: 'admin@edu.ar', role: 'admin' },
                    { id: '2', name: 'Profesor X', email: 'profesor@edu.ar', role: 'titular' },
                ],
                error: null,
            }),
        })),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(),
        }
    }
}));
