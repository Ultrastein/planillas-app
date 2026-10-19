import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import styles from './DesktopLayout.module.css';
import { LogOut, LayoutGrid, Plus, ShieldCheck, FileText, Sparkles, MessageSquare, History, PanelRightClose } from 'lucide-react';
import { VersionSidebar } from '../features/versions/VersionSidebar';
import { FeedbackButton } from '../features/feedback/FeedbackButton';
import { AiSidebar } from '../features/ai/AiSidebar';
import { CommentsThread } from '../features/editor/CommentsThread';
import { useNavigationStore } from '../store/useNavigationStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { useDocumentStore } from '../store/useDocumentStore';
import { useToast } from '../components/Toast/useToast';
import { supabase } from '../lib/supabase';
import { getCategoryColor } from '../lib/categoryColors';
import { useEffect, useState } from 'react';

type PanelTab = 'ia' | 'comentarios' | 'versiones';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    titular: 'Titular',
    colaborador: 'Colaborador',
};

function getInitials(name: string) {
    return name
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('');
}

export function DesktopLayout() {
    const { user, profile, logout } = useAuthStore();
    const { tabs, fetchTabs } = useNavigationStore();
    const { categories, fetchCategories } = useCategoryStore();
    const { allDocuments, selectedDoc, setSelectedDoc, selectedCategory, setSelectedCategory } = useDocumentStore();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    const [isRightPanelOpen, setIsRightPanelOpen] = useState(() => window.innerWidth >= 1200);
    const [panelTab, setPanelTab] = useState<PanelTab>('ia');
    const [showNewCatInput, setShowNewCatInput] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [creatingCat, setCreatingCat] = useState(false);

    useEffect(() => {
        fetchTabs();
        fetchCategories();
    }, [fetchTabs, fetchCategories]);

    // Comments and versions only make sense with an open class
    useEffect(() => {
        if (!selectedDoc) setPanelTab('ia');
    }, [selectedDoc]);

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    const canCreateCategory = profile?.role === 'admin' || profile?.role === 'titular';
    const displayName = profile?.name || user.email || 'Usuario';
    const countFor = (name: string) => allDocuments.filter(d =>
        name === 'Sin Categorizar' ? !d.tematica : d.tematica === name
    ).length;
    const uncategorizedCount = countFor('Sin Categorizar');

    const openLibrary = (category: string | null) => {
        setSelectedCategory(category);
        setSelectedDoc(null);
        navigate('/editor');
    };

    const handleCreateCategory = async () => {
        if (!newCatName.trim()) return;
        setCreatingCat(true);
        try {
            const { error } = await supabase.from('thematic_categories').insert({ name: newCatName.trim() });
            if (error) throw error;
            setNewCatName('');
            setShowNewCatInput(false);
            fetchCategories();
        } catch (err) {
            showToast('Error al crear carpeta: ' + ((err as { message?: string })?.message ?? String(err)), 'error');
        } finally {
            setCreatingCat(false);
        }
    };

    const openPanel = (tab: PanelTab) => {
        setPanelTab(tab);
        setIsRightPanelOpen(true);
    };

    const panelTabs: { key: PanelTab; label: string; icon: typeof Sparkles }[] = [
        { key: 'ia', label: 'Asistente IA', icon: Sparkles },
        ...(selectedDoc ? [
            { key: 'comentarios' as PanelTab, label: 'Comentarios', icon: MessageSquare },
            { key: 'versiones' as PanelTab, label: 'Versiones', icon: History },
        ] : []),
    ];

    const isLibraryRoute = !isAdminRoute;

    return (
        <div className={styles.layout}>
            {/* LEFT SIDEBAR */}
            <nav className={styles.sidebar} aria-label="Navegación principal">
                <div className={styles.brand}>
                    <div className={styles.brandMark} aria-hidden="true">TK</div>
                    <div className={styles.brandText}>
                        <span className={styles.brandName}>Planillas</span>
                        <span className={styles.brandSub}>TecnoKids</span>
                    </div>
                </div>

                <div className={styles.navGroup}>
                    <button
                        type="button"
                        className={`${styles.navItem} ${isLibraryRoute && selectedCategory === null ? styles.navItemActive : ''}`}
                        onClick={() => openLibrary(null)}
                    >
                        <LayoutGrid size={18} aria-hidden="true" className={styles.navIcon} />
                        Todas las clases
                        {allDocuments.length > 0 && <span className={styles.navCount}>{allDocuments.length}</span>}
                    </button>
                    {tabs.filter(tab => tab.path !== '/editor').map(tab => (
                        <button
                            type="button"
                            key={tab.id}
                            className={`${styles.navItem} ${location.pathname === tab.path ? styles.navItemActive : ''}`}
                            onClick={() => navigate(tab.path)}
                        >
                            <FileText size={18} aria-hidden="true" className={styles.navIcon} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className={styles.navGroup}>
                    <div className={styles.navGroupHeader}>
                        <span className={styles.navGroupTitle}>Carpetas</span>
                        {canCreateCategory && (
                            <button
                                type="button"
                                className={styles.navIconBtn}
                                aria-label="Nueva carpeta"
                                aria-expanded={showNewCatInput}
                                onClick={() => setShowNewCatInput(!showNewCatInput)}
                            >
                                <Plus size={16} aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    {showNewCatInput && (
                        <div className={styles.newCatRow}>
                            <label htmlFor="new-cat" className="sr-only">Nombre de la carpeta</label>
                            <input
                                id="new-cat"
                                autoFocus
                                placeholder="Nombre de la temática"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleCreateCategory();
                                    if (e.key === 'Escape') setShowNewCatInput(false);
                                }}
                            />
                            <button type="button" onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()}>
                                Crear
                            </button>
                        </div>
                    )}

                    <div className={styles.folderList}>
                        {categories.map(cat => (
                            <button
                                type="button"
                                key={cat.id}
                                className={`${styles.navItem} ${styles.folderItem} ${isLibraryRoute && selectedCategory === cat.name ? styles.navItemActive : ''}`}
                                onClick={() => openLibrary(cat.name)}
                            >
                                <span className={styles.folderDot} style={{ background: getCategoryColor(cat.name).dot }} aria-hidden="true" />
                                <span className={styles.folderName}>{cat.name}</span>
                                {allDocuments.length > 0 && <span className={styles.navCount}>{countFor(cat.name)}</span>}
                            </button>
                        ))}
                        <button
                            type="button"
                            className={`${styles.navItem} ${styles.folderItem} ${isLibraryRoute && selectedCategory === 'Sin Categorizar' ? styles.navItemActive : ''}`}
                            onClick={() => openLibrary('Sin Categorizar')}
                        >
                            <span className={styles.folderDot} style={{ background: getCategoryColor(null).dot }} aria-hidden="true" />
                            <span className={styles.folderName}>Sin categorizar</span>
                            {uncategorizedCount > 0 && <span className={styles.navCount}>{uncategorizedCount}</span>}
                        </button>
                    </div>
                </div>

                <div className={styles.sidebarFooter}>
                    <FeedbackButton triggerClassName={styles.navItem} iconClassName={styles.navIcon} />
                    {profile?.role === 'admin' && (
                        <button
                            type="button"
                            className={`${styles.navItem} ${isAdminRoute ? styles.navItemActive : ''}`}
                            onClick={() => navigate('/admin')}
                        >
                            <ShieldCheck size={18} aria-hidden="true" className={styles.navIcon} />
                            Panel de administrador
                        </button>
                    )}
                    <div className={styles.profile}>
                        <div className={styles.avatar} aria-hidden="true">{getInitials(displayName)}</div>
                        <div className={styles.profileText}>
                            <span className={styles.profileName}>{displayName}</span>
                            <span className={styles.profileRole}>{ROLE_LABELS[profile?.role || ''] || 'Docente'}</span>
                        </div>
                        <button type="button" className={styles.navIconBtn} onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
                            <LogOut size={18} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* CENTRAL AREA */}
            <main className={styles.mainContent}>
                <Outlet />
            </main>

            {/* RIGHT PANEL - Only outside the admin panel */}
            {!isAdminRoute && (
                isRightPanelOpen ? (
                    <aside className={styles.rightPanel} aria-label="Herramientas">
                        <div className={styles.panelHeader}>
                            {panelTabs.length === 1 ? (
                                <h2 className={styles.panelTitle}>
                                    <span className={styles.panelTitleIcon} aria-hidden="true"><Sparkles size={16} /></span>
                                    Asistente IA
                                </h2>
                            ) : (
                            <div role="tablist" aria-label="Panel lateral" className={styles.panelTabs}>
                                {panelTabs.map(t => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={panelTab === t.key}
                                        className={`${styles.panelTab} ${panelTab === t.key ? styles.panelTabActive : ''}`}
                                        onClick={() => setPanelTab(t.key)}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            )}
                            <button
                                type="button"
                                className={styles.panelCloseBtn}
                                onClick={() => setIsRightPanelOpen(false)}
                                aria-label="Ocultar panel lateral"
                                title="Ocultar panel lateral"
                            >
                                <PanelRightClose size={18} aria-hidden="true" />
                            </button>
                        </div>
                        <div className={styles.panelContent}>
                            {panelTab === 'ia' && <AiSidebar />}
                            {panelTab === 'comentarios' && <CommentsThread />}
                            {panelTab === 'versiones' && <VersionSidebar />}
                        </div>
                    </aside>
                ) : (
                    <aside className={styles.panelRail} aria-label="Herramientas">
                        {panelTabs.map(t => (
                            <button
                                key={t.key}
                                type="button"
                                className={styles.railBtn}
                                onClick={() => openPanel(t.key)}
                                aria-label={`Abrir ${t.label}`}
                                title={t.label}
                            >
                                <t.icon size={18} aria-hidden="true" />
                            </button>
                        ))}
                    </aside>
                )
            )}
        </div>
    );
}
