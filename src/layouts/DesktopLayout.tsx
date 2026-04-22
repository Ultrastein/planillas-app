import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import styles from './DesktopLayout.module.css';
import { LogOut, Settings, FileText, ChevronDown, ChevronRight, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { VersionSidebar } from '../features/versions/VersionSidebar';
import { FeedbackButton } from '../features/feedback/FeedbackButton';
import { AiSidebar } from '../features/ai/AiSidebar';
import { CommentsThread } from '../features/editor/CommentsThread';
import { useNavigationStore } from '../store/useNavigationStore';
import { useEffect, useState } from 'react';

export function DesktopLayout() {
    const { user, profile, logout } = useAuthStore();
    const { tabs, fetchTabs } = useNavigationStore();
    const navigate = useNavigate();
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(true);

    useEffect(() => {
        fetchTabs();
    }, [fetchTabs]);

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return (
        <div className={styles.layout}>
            {/* LEFT SIDEBAR */}
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <img src="/logo.png" alt="TecnoKids Logo" className={styles.logoImage} />
                    <span className={styles.badge} style={{ marginTop: 8 }}>Desktop</span>
                </div>

                <nav className={styles.navTree}>
                    <div className={styles.navSection}>
                        <h3 
                            className={styles.collapsibleHeader} 
                            onClick={() => setIsNavOpen(!isNavOpen)}
                        >
                            Navegación
                            {isNavOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </h3>
                        {isNavOpen && (
                        <ul>
                            {tabs.length > 0 ? tabs.map((tab) => (
                                <li key={tab.id} onClick={() => navigate(tab.path)}>
                                    <FileText size={14} style={{ marginRight: 8 }} />
                                    {tab.label}
                                </li>
                            )) : (
                                <li onClick={() => navigate('/editor')}><FileText size={14} style={{ marginRight: 8 }} />Año Lectivo 2026 (Predeterminado)</li>
                            )}
                        </ul>
                        )}
                    </div>
                </nav>
            </aside>

            {/* CENTRAL AREA */}
            <main className={styles.mainContent}>
                <header className={styles.topbar}>
                    <div className={styles.documentMeta}>
                        <h2>{window.location.pathname.includes('admin') ? 'Master Control' : 'Edición de Planificación'}</h2>
                    </div>
                    <div className={styles.actions}>
                        {!window.location.pathname.includes('admin') && (
                            <button 
                                className={styles.iconBtnHeader} 
                                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                                title={isRightPanelOpen ? "Ocultar panel lateral" : "Mostrar panel lateral"}
                            >
                                {isRightPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                            </button>
                        )}
                        <div className={styles.headerProfile}>
                            <div className={styles.userInfoHeader}>
                                <span className={styles.userNameHeader}>{profile?.name || user.email}</span>
                                <span className={styles.userRoleHeader}>{profile?.role || 'Docente'}</span>
                            </div>
                            {profile?.role === 'admin' && (
                                <button className={styles.iconBtnHeader} title="Panel Master Control" onClick={() => navigate('/admin')}>
                                    <Settings size={18} />
                                </button>
                            )}
                            <button className={styles.iconBtnHeader} onClick={logout} title="Cerrar Sesión">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <div className={styles.editorArea}>
                    <Outlet />
                </div>
            </main>

            {/* RIGHT PANEL - Only show when NOT in admin */}
            {!window.location.pathname.includes('admin') && (
                <aside className={`${styles.rightPanel} ${isRightPanelOpen ? '' : styles.rightPanelCollapsed}`}>
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
