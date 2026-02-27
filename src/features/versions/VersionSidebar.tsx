import { useVersionStore } from '../../store/useVersionStore';
import type { DocumentVersion } from '../../store/useVersionStore';
import styles from './VersionSidebar.module.css';
import { History, Undo, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useDocumentStore } from '../../store/useDocumentStore';

export function VersionSidebar() {
    const { versions, setVersions, previewVersion, setPreviewVersion } = useVersionStore();
    const { selectedDocId } = useDocumentStore();

    useEffect(() => {
        if (!selectedDocId) {
            setVersions([]);
            setPreviewVersion(null);
            return;
        }

        const fetchVersions = async () => {
            const { data, error } = await supabase
                .from('document_versions')
                .select('*')
                .eq('document_id', selectedDocId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setVersions(data as DocumentVersion[]);
            }
        };

        fetchVersions();

        // Optional realtime subscription if needed later
    }, [selectedDocId, setVersions, setPreviewVersion]);

    const handlePreview = (version: DocumentVersion) => {
        // If clicking the current preview, toggle it off
        if (previewVersion?.id === version.id) {
            setPreviewVersion(null);
        } else {
            setPreviewVersion(version);
        }
    };

    return (
        <div className={styles.sidebarContainer}>
            <div className={styles.header}>
                <History size={18} />
                <h3>Historial de Versiones</h3>
            </div>

            <div className={styles.versionsList}>
                {/* Special card for "Current View" if previewing an old version to easily go back */}
                {previewVersion && (
                    <div
                        className={`${styles.versionCard} ${styles.currentReturn}`}
                        onClick={() => setPreviewVersion(null)}
                    >
                        <div className={styles.iconBox}>
                            <Undo size={16} />
                        </div>
                        <div className={styles.versionDetails}>
                            <span className={styles.versionTitle}>Volver a Edición Actual</span>
                            <span className={styles.versionMeta}>Cerrar vista previa</span>
                        </div>
                    </div>
                )}

                {versions.length === 0 ? (
                    <div className={styles.emptyState}>
                        Aún no hay snapshots guardados para este documento.
                    </div>
                ) : (
                    versions.map((ver) => {
                        const isPreviewing = previewVersion?.id === ver.id;
                        return (
                            <div
                                key={ver.id}
                                className={`${styles.versionCard} ${isPreviewing ? styles.active : ''}`}
                                onClick={() => handlePreview(ver)}
                            >
                                <div className={styles.iconBox}>
                                    {isPreviewing ? <CheckCircle2 size={16} color="var(--primary-color)" /> : <History size={16} />}
                                </div>
                                <div className={styles.versionDetails}>
                                    <span className={styles.versionTitle}>
                                        Snapshot {formatDistanceToNow(new Date(ver.created_at), { addSuffix: true, locale: es })}
                                    </span>
                                    <span className={styles.versionMeta}>
                                        Por: <strong>{ver.author_name}</strong>
                                    </span>
                                    <span className={styles.versionDate}>
                                        {new Date(ver.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
