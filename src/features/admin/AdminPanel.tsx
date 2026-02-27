import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { useAuthStore } from '../../store/useAuthStore';
import styles from './AdminPanel.module.css';
import { Shield, KeyRound, UserPlus, Trash2, Users } from 'lucide-react';

export function AdminPanel() {
    const { profile: currentUser } = useAuthStore();
    const [users, setUsers] = useState<any[]>([]);
    const [deletedDocs, setDeletedDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'trash'>('users');

    // Form State
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState<'titular' | 'colaborador' | 'admin'>('colaborador');
    const [newUserPwd, setNewUserPwd] = useState('');

    const [selectedUserForPwd, setSelectedUserForPwd] = useState<string | null>(null);
    const [newPasswordForUser, setNewPasswordForUser] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'users') {
                const { data, error } = await supabase.from('users').select('*').order('name');
                if (error) throw error;
                setUsers(data || []);
            } else {
                const { data, error } = await supabase.from('documents').select('*').eq('status', 'deleted').order('created_at', { ascending: false });
                if (error) throw error;
                setDeletedDocs(data || []);
            }
        } catch (err: any) {
            setError('Error al cargar datos: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
                alert('Atención: VITE_SUPABASE_SERVICE_ROLE_KEY no está configurada, la creación en auth.users fallará o no será posible. Intenta configurarla en el .env');
            }

            // Crear usuario en Auth (usando admin API para no afectar sesión local)
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: newUserEmail,
                password: newUserPwd,
                email_confirm: true,
                user_metadata: { name: newUserName }
            });

            if (authError) throw authError;

            // Update en public.users para fijar el rol (el trigger de Supabase hace el insert por defecto como colaborador)
            if (authData.user) {
                const { error: dbError } = await supabase.from('users').update({
                    role: newUserRole
                }).eq('id', authData.user.id);
                if (dbError) throw dbError;
            }

            setShowCreateForm(false);
            setNewUserEmail(''); setNewUserName(''); setNewUserPwd('');
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Error al crear usuario');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!selectedUserForPwd) return;

        try {
            // Utilizamos el RPC en caso no haya Service Role Key, o supabaseAdmin si la hay.
            if (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
                const { error } = await supabaseAdmin.auth.admin.updateUserById(selectedUserForPwd, { password: newPasswordForUser });
                if (error) throw error;
            } else {
                const { error } = await supabase.rpc('admin_reset_user_password', {
                    target_user_id: selectedUserForPwd,
                    new_password: newPasswordForUser
                });
                if (error) throw error;
            }

            setSelectedUserForPwd(null);
            setNewPasswordForUser('');
            alert("Contraseña actualizada exitosamente.");
            fetchData();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (currentUser?.role !== 'admin') {
        return (
            <div className={styles.unauthorized}>
                <Shield size={48} color="var(--danger-color)" />
                <h2>Acceso Denegado</h2>
                <p>Solo el Administrador tiene permisos para ver esta sección.</p>
            </div>
        );
    }

    return (
        <div className={styles.adminContainer}>
            <header className={styles.adminHeader}>
                <div>
                    <h2>Panel de Administrador</h2>
                    <p>Gestión de Personal y Registros del Sistema</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className={activeTab === 'users' ? styles.btnPrimary : styles.btnSecondary}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={18} /> Personal
                    </button>
                    <button
                        className={activeTab === 'trash' ? styles.btnPrimary : styles.btnSecondary}
                        onClick={() => setActiveTab('trash')}
                    >
                        <Trash2 size={18} /> Papelera
                    </button>
                    {activeTab === 'users' && (
                        <button className={styles.btnPrimary} onClick={() => setShowCreateForm(true)}>
                            <UserPlus size={18} /> Nuevo Usuario
                        </button>
                    )}
                </div>
            </header>

            {error && <div className={styles.errorBanner}>{error}</div>}

            {activeTab === 'users' && (
                <>
                    {showCreateForm && (
                        <form className={styles.formCard} onSubmit={handleCreateUser}>
                            <h3>Crear Nuevo Usuario</h3>
                            <div className={styles.formRow}>
                                <input required placeholder="Nombre Completo" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                                <input required type="text" placeholder="Email o Usuario" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                            </div>
                            <div className={styles.formRow}>
                                <input required type="password" placeholder="Contraseña Inicial" value={newUserPwd} onChange={e => setNewUserPwd(e.target.value)} />
                                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)}>
                                    <option value="titular">Docente Titular (Editor)</option>
                                    <option value="colaborador">Docente Visualizador (Lector)</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div className={styles.formActions}>
                                <button type="button" className={styles.btnSecondary} onClick={() => setShowCreateForm(false)}>Cancelar</button>
                                <button type="submit" className={styles.btnPrimary}>Crear</button>
                            </div>
                        </form>
                    )}

                    {selectedUserForPwd && (
                        <form className={styles.formCard} onSubmit={handleChangePassword}>
                            <h3>Cambiar Contraseña: {users.find(u => u.id === selectedUserForPwd)?.name}</h3>
                            <div className={styles.formRow}>
                                <input
                                    required
                                    type="password"
                                    placeholder="Nueva Contraseña"
                                    value={newPasswordForUser}
                                    onChange={e => setNewPasswordForUser(e.target.value)}
                                />
                                <button type="submit" className={styles.btnDanger}>Forzar Cambio</button>
                                <button type="button" className={styles.btnSecondary} onClick={() => setSelectedUserForPwd(null)}>Cancelar</button>
                            </div>
                        </form>
                    )}

                    <div className={styles.userTableContainer}>
                        <table className={styles.userTable}>
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Email / Login</th>
                                    <th>Rol</th>
                                    <th>Tipo Auth</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Cargando usuarios...</td></tr>
                                ) : users.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className={styles.userInfoCell}>
                                                <div className={styles.avatar}>{u.name.charAt(0).toUpperCase()}</div>
                                                <span>{u.name}</span>
                                            </div>
                                        </td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${styles[u.role]}`}>
                                                {u.role === 'titular' ? 'Editor' : u.role === 'colaborador' ? 'Visualizador' : 'Admin'}
                                            </span>
                                        </td>
                                        <td>{u.auth_provider === 'local' ? 'Manual' : 'Google'}</td>
                                        <td>
                                            {u.auth_provider === 'local' && (
                                                <button
                                                    className={styles.keyBtn}
                                                    onClick={() => setSelectedUserForPwd(u.id)}
                                                    title="Cambiar Contraseña"
                                                >
                                                    <KeyRound size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'trash' && (
                <div className={styles.userTableContainer}>
                    <table className={styles.userTable}>
                        <thead>
                            <tr>
                                <th>Documento Eliminado</th>
                                <th>Autor</th>
                                <th>Fecha Recreación</th>
                                <th>Motivo de Borrado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Cargando papelera...</td></tr>
                            ) : deletedDocs.length === 0 ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No hay planillas eliminadas.</td></tr>
                            ) : deletedDocs.map(doc => (
                                <tr key={doc.id}>
                                    <td><strong>{doc.title}</strong><br /><small>{doc.file_type}</small></td>
                                    <td>{doc.author_name} ({doc.author_role})</td>
                                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                                    <td style={{ color: 'var(--danger-color)', fontStyle: 'italic' }}>"{doc.delete_reason}"</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
