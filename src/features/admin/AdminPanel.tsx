import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore, type UserProfile } from '../../store/useAuthStore';
import type { Document } from '../../types/document';
import styles from './AdminPanel.module.css';
import { Shield, KeyRound, UserPlus, Trash2, Users, List, PlusCircle, Trash, Folder } from 'lucide-react';

interface NavigationTab {
    id: string;
    label: string;
    path: string;
    order_index: number;
    created_at: string;
}

interface ThematicCategory {
    id: string;
    name: string;
    created_at?: string;
}

export function AdminPanel() {
    const { profile: currentUser } = useAuthStore();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [deletedDocs, setDeletedDocs] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'trash' | 'navigation' | 'categories'>('users');
    const [navTabs, setNavTabs] = useState<NavigationTab[]>([]);
    const [newTabLabel, setNewTabLabel] = useState('');
    const [newTabPath, setNewTabPath] = useState('/editor');

    const [categories, setCategories] = useState<ThematicCategory[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');

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
            } else if (activeTab === 'trash') {
                const { data, error } = await supabase.from('documents').select('*').eq('status', 'deleted').order('created_at', { ascending: false });
                if (error) throw error;
                setDeletedDocs(data || []);
            } else if (activeTab === 'navigation') {
                const { data, error } = await supabase.from('navigation_tabs').select('*').order('order_index', { ascending: true });
                if (error) throw error;
                setNavTabs(data || []);
            } else if (activeTab === 'categories') {
                const { data, error } = await supabase.from('thematic_categories').select('*').order('name', { ascending: true });
                if (error) throw error;
                setCategories(data || []);
            }
        } catch (err) {
            setError('Error al cargar datos: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            // La creación de usuarios en auth.users requiere la Service Role Key,
            // que sólo existe del lado del servidor: se delega en la Edge Function.
            const { error: fnError } = await supabase.functions.invoke('admin-actions', {
                body: {
                    action: 'create_user',
                    payload: {
                        email: newUserEmail,
                        password: newUserPwd,
                        name: newUserName,
                        role: newUserRole,
                    },
                },
            });
            if (fnError) throw fnError;

            setShowCreateForm(false);
            setNewUserEmail(''); setNewUserName(''); setNewUserPwd('');
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear usuario');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!selectedUserForPwd) return;

        try {
            const { error: fnError } = await supabase.functions.invoke('admin-actions', {
                body: {
                    action: 'reset_password',
                    payload: {
                        target_user_id: selectedUserForPwd,
                        new_password: newPasswordForUser,
                    },
                },
            });
            if (fnError) throw fnError;

            setSelectedUserForPwd(null);
            setNewPasswordForUser('');
            alert("Contraseña actualizada exitosamente.");
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
        }
    };

    const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'titular' | 'colaborador') => {
        try {
            const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
            if (error) throw error;
            alert("Rol actualizado correctamente.");
            fetchData();
        } catch (err) {
            setError('Error al actualizar rol: ' + (err instanceof Error ? err.message : String(err)));
        }
    };

    const handleCreateNavTab = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!newTabLabel.trim() || !newTabPath.trim()) return;

        try {
            const nextOrder = navTabs.length > 0 ? Math.max(...navTabs.map(t => t.order_index)) + 1 : 0;
            const { error } = await supabase.from('navigation_tabs').insert({
                label: newTabLabel,
                path: newTabPath,
                order_index: nextOrder
            });
            if (error) throw error;
            setNewTabLabel('');
            setNewTabPath('/editor');
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error inesperado');
        }
    };

    const handleDeleteNavTab = async (id: string) => {
        try {
            const { error } = await supabase.from('navigation_tabs').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error inesperado');
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!newCategoryName.trim()) return;

        try {
            const { error } = await supabase.from('thematic_categories').insert({ name: newCategoryName.trim() });
            if (error) throw error;
            setNewCategoryName('');
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error inesperado');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        try {
            const { error } = await supabase.from('thematic_categories').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error inesperado');
        }
    };

    const handleRestoreDoc = async (id: string) => {
        try {
            const { error } = await supabase.from('documents').update({ status: 'active', delete_reason: null }).eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            setError('Error restaurando: ' + (err instanceof Error ? err.message : String(err)));
        }
    };

    const handlePermanentDeleteDoc = async (id: string) => {
        const confirm = window.confirm('¿Estás seguro? Esto eliminará la planilla permanentemente y no se puede deshacer.');
        if (!confirm) return;
        try {
            // Delete child rows first to avoid FK constraint errors
            await supabase.from('comments').delete().eq('document_id', id);
            await supabase.from('document_versions').delete().eq('document_id', id);
            const { error } = await supabase.from('documents').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            setError('Error eliminando: ' + (err instanceof Error ? err.message : String(err)));
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
                        className={activeTab === 'navigation' ? styles.btnPrimary : styles.btnSecondary}
                        onClick={() => setActiveTab('navigation')}
                    >
                        <List size={18} /> Menú Nav
                    </button>
                    <button
                        className={activeTab === 'categories' ? styles.btnPrimary : styles.btnSecondary}
                        onClick={() => setActiveTab('categories')}
                    >
                        <Folder size={18} /> Categorías
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
                                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as 'titular' | 'colaborador' | 'admin')}>
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
                                            <select
                                                value={u.role}
                                                onChange={(e) => handleUpdateUserRole(u.id, e.target.value as 'admin' | 'titular' | 'colaborador')}
                                                disabled={u.id === currentUser?.id}
                                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                title={u.id === currentUser?.id ? "No puedes cambiar tu propio rol" : "Cambiar rol del usuario"}
                                            >
                                                <option value="titular">Editor (Titular)</option>
                                                <option value="colaborador">Lector (Colaborador)</option>
                                                <option value="admin">Admin</option>
                                            </select>
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
                                <th>Fecha</th>
                                <th>Motivo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Cargando papelera...</td></tr>
                            ) : deletedDocs.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No hay planillas eliminadas.</td></tr>
                            ) : deletedDocs.map(doc => (
                                <tr key={doc.id}>
                                    <td><strong>{doc.title}</strong><br /><small>{doc.file_type}</small></td>
                                    <td>{doc.author_name} ({doc.author_role})</td>
                                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                                    <td style={{ color: 'var(--danger-color)', fontStyle: 'italic' }}>"{doc.delete_reason}"</td>
                                    <td style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className={styles.btnSecondary}
                                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                            onClick={() => handleRestoreDoc(doc.id)}
                                            title="Restaurar esta planilla"
                                        >
                                            ↩ Restaurar
                                        </button>
                                        <button
                                            className={styles.btnDanger}
                                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                            onClick={() => handlePermanentDeleteDoc(doc.id)}
                                            title="Eliminar permanentemente"
                                        >
                                            🗑 Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'navigation' && (
                <div style={{ display: 'flex', gap: '24px', padding: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <form className={styles.formCard} onSubmit={handleCreateNavTab}>
                            <h3>Crear Nueva Pestaña (Link)</h3>
                            <div className={styles.formRow}>
                                <input required placeholder="Etiqueta ej. Taller de Herrería" value={newTabLabel} onChange={e => setNewTabLabel(e.target.value)} />
                                <input required placeholder="Ruta ej. /editor" value={newTabPath} onChange={e => setNewTabPath(e.target.value)} />
                            </div>
                            <div className={styles.formActions}>
                                <button type="submit" className={styles.btnPrimary}><PlusCircle size={16} style={{ marginRight: 6 }} />Añadir Pestaña</button>
                            </div>
                        </form>
                    </div>

                    <div style={{ flex: 1 }}>
                        <div className={styles.formCard}>
                            <h3>Pestañas Actuales</h3>
                            {loading ? <p>Cargando...</p> : (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {navTabs.map(tab => (
                                        <li key={tab.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                                            <div>
                                                <strong>{tab.label}</strong> <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({tab.path})</span>
                                            </div>
                                            <button className={styles.btnDanger} style={{ padding: '6px' }} onClick={() => handleDeleteNavTab(tab.id)}>
                                                <Trash size={14} />
                                            </button>
                                        </li>
                                    ))}
                                    {navTabs.length === 0 && <p style={{ color: '#64748b' }}>No hay pestañas configuradas.</p>}
                                </ul>
                            )}
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '12px' }}>
                                Los cambios se verán reflejados al recargar la página principal para los usuarios.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'categories' && (
                <div style={{ display: 'flex', gap: '24px', padding: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <form className={styles.formCard} onSubmit={handleCreateCategory}>
                            <h3>Crear Categoría Temática</h3>
                            <div className={styles.formRow}>
                                <input required placeholder="Ej. Ciencias Naturales" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                            </div>
                            <div className={styles.formActions}>
                                <button type="submit" className={styles.btnPrimary}><PlusCircle size={16} style={{ marginRight: 6 }} />Añadir Categoría</button>
                            </div>
                        </form>
                    </div>

                    <div style={{ flex: 1 }}>
                        <div className={styles.formCard}>
                            <h3>Carpetas Actuales</h3>
                            {loading ? <p>Cargando...</p> : (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {categories.map(cat => (
                                        <li key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
                                            <div>
                                                <strong>{cat.name}</strong>
                                            </div>
                                            <button className={styles.btnDanger} style={{ padding: '6px' }} onClick={() => handleDeleteCategory(cat.id)}>
                                                <Trash size={14} />
                                            </button>
                                        </li>
                                    ))}
                                    {categories.length === 0 && <p style={{ color: '#64748b' }}>No hay categorías temáticas configuradas.</p>}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
