import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPanel } from './AdminPanel';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';

// Mock Lucide icons to avoid jsdom render issues with SVG
vi.mock('lucide-react', () => ({
    Users: () => <div>Users</div>,
    Shield: () => <div>Shield</div>,
    KeyRound: () => <div>KeyRound</div>,
    UserPlus: () => <div>UserPlus</div>,
}));

describe('AdminPanel Master Control', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset supabase mock defaults
        supabase.rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    });

    it('declines access if user is not admin', () => {
        useAuthStore.setState({
            profile: { id: '2', email: 'test@edu.ar', name: 'Docente', role: 'titular' },
        });

        render(<AdminPanel />);
        expect(screen.getByText('Acceso Denegado')).toBeInTheDocument();
    });

    it('renders correctly for admin users', async () => {
        useAuthStore.setState({
            profile: { id: '1', email: 'admin@edu.ar', name: 'Admin', role: 'admin' },
        });

        render(<AdminPanel />);

        expect(screen.getByText('Master Control')).toBeInTheDocument();
    });

    it('opens create user form and submits', async () => {
        useAuthStore.setState({
            profile: { id: '1', email: 'admin@edu.ar', name: 'Admin', role: 'admin' },
        });

        // Mock successful signup
        supabase.auth.signUp = vi.fn().mockResolvedValue({
            data: { user: { id: '3' } },
            error: null
        });

        // Mock successful db insert
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        // Override the global mock just for this test
        supabase.from = vi.fn().mockImplementation((table) => {
            if (table === 'users') {
                return {
                    select: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: [], error: null }),
                    insert: mockInsert,
                };
            }
        });

        render(<AdminPanel />);

        // Click New User
        fireEvent.click(screen.getByText(/Nuevo Usuario/i));

        // Fill form
        fireEvent.change(screen.getByPlaceholderText('Nombre Completo'), { target: { value: 'Nuevo Docente' } });
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'nuevo@edu.ar' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña Inicial'), { target: { value: '123456' } });

        fireEvent.click(screen.getByText('Crear'));

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalledWith({
                email: 'nuevo@edu.ar',
                password: '123456',
                options: { data: { full_name: 'Nuevo Docente' } }
            });
            expect(mockInsert).toHaveBeenCalled();
        });
    });

    it('allows changing a users password', async () => {
        useAuthStore.setState({
            profile: { id: '1', email: 'admin@edu.ar', name: 'Admin', role: 'admin' },
        });

        // Override fetch mock to return a user to click
        const mockSelect = vi.fn().mockReturnThis();
        const mockOrder = vi.fn().mockResolvedValue({
            data: [{ id: '99', name: 'Pepe', email: 'pepe@edu.ar', role: 'colaborador' }],
            error: null
        });

        // Use mockClear so we don't interfere with the global mock object
        // We redefine it completely for this test block
        supabase.from = vi.fn().mockReturnValue({
            select: mockSelect,
            order: mockOrder
        });

        // Mock window alert
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<AdminPanel />);

        // Wait for users to load
        await waitFor(() => {
            expect(screen.getByText('Pepe')).toBeInTheDocument();
        });

        // Click change password button (KeyRound mocked icon parent)
        const btns = screen.getAllByTitle('Cambiar Contraseña');
        fireEvent.click(btns[0]);

        // Fill new password
        fireEvent.change(screen.getByPlaceholderText('Nueva Contraseña'), { target: { value: 'newpass123' } });

        // Submit
        fireEvent.click(screen.getByText('Forzar Cambio'));

        await waitFor(() => {
            expect(supabase.rpc).toHaveBeenCalledWith('admin_reset_user_password', {
                target_user_id: '99',
                new_password: 'newpass123'
            });
            expect(alertMock).toHaveBeenCalledWith('Contraseña actualizada exitosamente.');
        });

        alertMock.mockRestore();
    });
});
