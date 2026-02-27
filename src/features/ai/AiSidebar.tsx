import { useState, useEffect } from 'react';
import { Sparkles, Hammer, ShieldAlert, Package } from 'lucide-react';
import { useVersionStore } from '../../store/useVersionStore';
import { analyzeDocumentContent } from './aiService';
import type { AIMetadata, AITechnicalRequirements } from './aiService';
import styles from './AiSidebar.module.css';

export function AiSidebar() {
    const { versions } = useVersionStore();
    const [metadata, setMetadata] = useState<AIMetadata | null>(null);
    const [requirements, setRequirements] = useState<AITechnicalRequirements | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // We re-analyze whenever a new snapshot is created. In a real scenario, this could be debounced upon content change.
    useEffect(() => {
        if (versions.length > 0) {
            let isMounted = true;
            const latest = versions[0];
            setAnalyzing(true);
            analyzeDocumentContent(latest.content).then((res) => {
                if (isMounted) {
                    setMetadata(res.metadata);
                    setRequirements(res.requirements);
                    setAnalyzing(false);
                }
            });
            return () => { isMounted = false; };
        }
    }, [versions]);

    if (versions.length === 0) {
        return (
            <div className={styles.aiContainer}>
                <div className={styles.emptyState}>
                    <Sparkles size={24} color="#CBD5E1" />
                    <p>Guarda tu primer snapshot para que la IA escanee la planificación y extraiga recursos requeridos.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.aiContainer}>
            <div className={styles.header}>
                <Sparkles size={18} color="var(--primary-color)" />
                <h3>Asistente IA</h3>
            </div>

            {analyzing ? (
                <div className={styles.analyzingBox}>
                    <div className={styles.spinner} />
                    <span>Escaneando requerimientos...</span>
                </div>
            ) : metadata ? (
                <div className={styles.results}>
                    <div className={styles.metadataCard}>
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>Materia:</span>
                            <span className={styles.metaValue}>{metadata.subject}</span>
                        </div>
                        <div className={styles.metaRow}>
                            <span className={styles.metaLabel}>Curso:</span>
                            <span className={styles.metaValue}>{metadata.course}</span>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <Hammer size={14} /> Herramientas Detectadas
                        </h4>
                        <ul className={styles.tagList}>
                            {requirements?.tools.map(t => <li key={t} className={styles.tag}>{t}</li>)}
                        </ul>
                    </div>

                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <Package size={14} /> Materiales
                        </h4>
                        <ul className={styles.tagList}>
                            {requirements?.materials.map(m => <li key={m} className={styles.tag}>{m}</li>)}
                        </ul>
                    </div>

                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <ShieldAlert size={14} color="#ea580c" /> EPP Requerido
                        </h4>
                        <ul className={styles.tagList}>
                            {requirements?.ppe.map(e => <li key={e} className={`${styles.tag} ${styles.eppTag}`}>{e}</li>)}
                        </ul>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
