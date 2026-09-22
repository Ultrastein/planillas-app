import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPanel } from './AdminPanel';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';

// Mock Lucide icons to avoid jsdom render issues with SVG
vi.mock('lucide-react', () => ({
    Shield: () => <div>Shield</div>,
    KeyRound: () => <div>KeyRound</div>,
    UserPlus: () => <div>UserPlus</div>,
    Trash2: () => <div>Trash2</div>,
    Users: () => <div>Users</div>,
    List: () => <div>List</div>,
    PlusCircle: () => <div>PlusCircle</div>,
    Trash: () => <div>Trash</div>,
    Folder: () => <div>Folder</div>,
}));

const mockUsersData = [
    { id: '1', name: 'Admin User', email: 'admin@edu.ar', role: 'admin', auth_provider: 'local' },
    { id: '99', name: 'Pepe', email: 'pepe@edu.ar', role: 'colaborador', auth_provider: 'local' },
];

describe('AdminPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset supabase mocks with a sensible default: 'users' tab data load.
        supabase.from = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockUsersData, error: null }),
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        });
        supabase.functions.invoke = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    });

    it('declines access if user is not admin', () => {
        useAuthStore.setState({
            profile: { id: '2', email: 'test@edu.ar', name: 'Docente', role: 'titular', auth_provider: 'local' },
        });

        render(<AdminPanel />);
        expect(screen.getByText('Acceso Denegado')).toBeInTheDocument();
    });

    it('renders correctly for admin users', async () => {
        useAuthStore.setState({
            profile: { id: '1', email: 'admin@edu.ar', name: 'Admin', role: 'admin', auth_provider: 'local' },
        });

        render(<AdminPanel />);

        expect(screen.getByText('Panel de Administrador')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('Admin User')).toBeInTheDocument();
        });
    });

    it('creates a user via the admin-actions Edge Function', async () => {
        useAuthStore.setState({
            profile: { id: '1', email: 'admin@edu.ar', name: 'Admin', role: 'admin', auth_provider: 'local' },
        });

        render(<AdminPanel />);

        await waitFor(() => {
            expect(screen.getByText('Admin User')).toBeInTheDocument();
        });

        // Abrir el formulario de creación
        fireEvent.click(screen.getByText(/Nuevo Usuario/i));

        // Completar el formulario
        fireEvent.change(screen.getByPlaceholderText('Nombre Completo'), { target: { value: 'Nuevo Docente' } });
        fireEvent.change(screen.getByPlaceholderText('Email o Usuario'), { target: { value: 'nuevo@edu.ar' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña Inicial'), { target: { value: '123456' } });

        fireEvent.click(screen.getByText('Crear'));

        await waitFor(() => {
            expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-actions', {
                body: {
                    action: 'create_user',
                    payload: {
                        email: 'nuevo@edu.ar',
                        password: '123456',
                        name: 'Nuevo Docente',
                        role: 'colaborador',
                    },
                },
            });
        });
    });

    it('resets a user password via the admin-actions Edge Function', async () => {
        useAuthStore.setState({
            profile: { id: '1', email: 'admin@edu.ar', name: 'Admin', role: 'admin', auth_provider: 'local' },
        });

        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(<AdminPanel />);

        await waitFor(() => {
            expect(screen.getByText('Pepe')).toBeInTheDocument();
        });

        // Ambos usuarios son locales y muestran el botón; el de Pepe es el segundo (id '99').
        const btns = screen.getAllByTitle('Cambiar Contraseña');
        fireEvent.click(btns[1]);

        fireEvent.change(screen.getByPlaceholderText('Nueva Contraseña'), { target: { value: 'newpass123' } });

        fireEvent.click(screen.getByText('Forzar Cambio'));

        await waitFor(() => {
            expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-actions', {
                body: {
                    action: 'reset_password',
                    payload: {
                        target_user_id: '99',
                        new_password: 'newpass123',
                    },
                },
            });
            expect(alertMock).toHaveBeenCalledWith('Contraseña actualizada exitosamente.');
        });

        alertMock.mockRestore();
    });
});
