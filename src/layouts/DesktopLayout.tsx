import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import styles from './DesktopLayout.module.css';
import { LogOut, Settings, FileText } from 'lucide-react';
import { VersionSidebar } from '../features/versions/VersionSidebar';
import { FeedbackButton } from '../features/feedback/FeedbackButton';
import { AiSidebar } from '../features/ai/AiSidebar';
import { CommentsThread } from '../features/editor/CommentsThread';

export function DesktopLayout() {
    const { user, profile, logout } = useAuthStore();
    const navigate = useNavigate();

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <div className={styles.layout}>
            {/* LEFT SIDEBAR */}
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <h1>EduPlan Pro</h1>
                    <span className={styles.badge}>Desktop</span>
                </div>

                <nav className={styles.navTree}>
                    <div className={styles.navSection}>
                        <h3>Navegación</h3>
                        <ul>
                            <li onClick={() => navigate('/editor')}><FileText size={14} style={{ marginRight: 8 }} />Año Lectivo 2026</li>
                            <li onClick={() => navigate('/editor')}><FileText size={14} style={{ marginRight: 8 }} />Taller de Electricidad</li>
                        </ul>
                    </div>
                </nav>

                <div className={styles.userProfile}>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{profile?.name || user.email}</span>
                        <span className={styles.userRole}>{profile?.role || 'Docente'}</span>
                    </div>
                    {profile?.role === 'admin' && (
                        <button className={styles.iconBtn} title="Panel Master Control" onClick={() => navigate('/admin')}>
                            <Settings size={18} />
                        </button>
                    )}
                    <button className={styles.iconBtn} onClick={logout} title="Cerrar Sesión">
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* CENTRAL AREA */}
            <main className={styles.mainContent}>
                <header className={styles.topbar}>
                    <div className={styles.documentMeta}>
                        <h2>{window.location.pathname.includes('admin') ? 'Master Control' : 'Edición de Planificación'}</h2>
                    </div>
                    <div className={styles.actions}>
                        {/* Real-time users indicator could go here */}
                    </div>
                </header>

                <div className={styles.editorArea}>
                    <Outlet />
                </div>
            </main>

            {/* RIGHT PANEL - Only show when NOT in admin */}
            {!window.location.pathname.includes('admin') && (
                <aside className={styles.rightPanel}>
                    <div className={styles.panelContent}>
                        <AiSidebar />
                        <VersionSidebar />
                        <CommentsThread />
                    </div>
                </aside>
            )}
            <FeedbackButton />
        </div>
    );
}
