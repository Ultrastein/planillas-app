import { useState, useEffect, useRef } from 'react';
import { Sparkles, Hammer, ShieldAlert, Package, Send } from 'lucide-react';
import { useVersionStore } from '../../store/useVersionStore';
import { analyzeDocumentContent, askGeminiQuestion } from './aiService';
import type { AIMetadata, AITechnicalRequirements } from './aiService';
import styles from './AiSidebar.module.css';

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
}

export function AiSidebar() {
    const { versions } = useVersionStore();
    const [metadata, setMetadata] = useState<AIMetadata | null>(null);
    const [requirements, setRequirements] = useState<AITechnicalRequirements | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Chat states
    const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatLog]);

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
                    <p>Carga la planilla inicial para interactuar con la IA.</p>
                </div>
            </div>
        );
    }

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;

        const q = chatInput.trim();
        const latestDocContent = versions[0]?.content || '';

        setChatInput('');
        setChatLog(prev => [...prev, { role: 'user', text: q }]);
        setChatLoading(true);

        const aiResponse = await askGeminiQuestion(latestDocContent, q);

        setChatLog(prev => [...prev, { role: 'ai', text: aiResponse }]);
        setChatLoading(false);
    };

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
                            <span className={styles.metaLabel}>Categoría Temática:</span>
                            <span className={styles.metaValue} style={{ fontWeight: 'bold' }}>{metadata.category}</span>
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

            {/* Interactive Chat Section */}
            {!analyzing && metadata && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', minHeight: '0' }}>
                    <h4 className={styles.sectionTitle} style={{ marginBottom: '12px' }}>Pregúntale a tu Documento</h4>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px', paddingRight: '4px' }}>
                        {chatLog.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: '20px' }}>
                                ¿Tienes alguna duda sobre qué actividad de esta planilla dura más tiempo? ¿O qué formato de examen se menciona? Pregúntame aquí.
                            </p>
                        ) : (
                            chatLog.map((msg, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    <div style={{
                                        maxWidth: '85%',
                                        padding: '8px 12px',
                                        borderRadius: '12px',
                                        backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : '#f1f5f9',
                                        color: msg.role === 'user' ? 'white' : 'var(--text-color)',
                                        fontSize: '0.85rem',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {msg.text}
                                    </div>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>
                                        {msg.role === 'user' ? 'Tú' : 'Asistente IA'}
                                    </span>
                                </div>
                            ))
                        )}
                        {chatLoading && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '8px' }}>
                                <div className={styles.spinner} style={{ width: '12px', height: '12px' }} />
                                Pensando...
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                            placeholder="Ej: ¿Qué evalúa el punto 3?"
                            style={{ flex: 1, padding: '10px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                            disabled={chatLoading}
                        />
                        <button
                            onClick={handleSendChat}
                            disabled={!chatInput.trim() || chatLoading}
                            style={{
                                backgroundColor: chatInput.trim() && !chatLoading ? 'var(--primary-color)' : '#cbd5e1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            <Send size={16} style={{ marginLeft: '-2px' }} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
