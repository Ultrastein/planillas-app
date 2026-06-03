import { useState, useEffect, useRef } from 'react';
import { Sparkles, Hammer, ShieldAlert, Package, Send } from 'lucide-react';
import { useDocumentStore } from '../../store/useDocumentStore';
import {
    analyzeDocumentContent,
    askGeminiQuestion,
    generateFullPlan,
    generateRubric,
    suggestActivities,
    generateExecutiveSummary,
    improveText,
} from './aiService';
import type { AIMetadata, AITechnicalRequirements, Activity } from './aiService';
import { QUICK_TEMPLATES } from '../../data/templates';
import styles from './AiSidebar.module.css';

type Tab = 'generar' | 'analizar' | 'mejorar' | 'chat';

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
}

const TEMPLATE_COLORS: Record<string, { bg: string; border: string; color: string }> = {
    electricidad: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
    robotica:     { bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed' },
    programacion: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
    digital:      { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
};

const ACTIVITY_BADGE: Record<string, { bg: string; color: string; label: string }> = {
    refuerzo:   { bg: '#fef9c3', color: '#92400e', label: 'Refuerzo' },
    extension:  { bg: '#eff6ff', color: '#1d4ed8', label: 'Extensión' },
    evaluacion: { bg: '#f0fdf4', color: '#15803d', label: 'Evaluación' },
};

export function AiSidebar() {
    const {
        selectedDoc,
        allDocuments,
        editorSelection,
        setPendingCreateFromAI,
        setPendingReplacement,
    } = useDocumentStore();

    const [activeTab, setActiveTab] = useState<Tab>('generar');

    // Tab: Generar
    const [generatorPrompt, setGeneratorPrompt] = useState('');
    const [generatorLoading, setGeneratorLoading] = useState(false);
    const [summaryResult, setSummaryResult] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);

    // Tab: Analizar
    const [analyzeLoading, setAnalyzeLoading] = useState(false);
    const [analyzeMetadata, setAnalyzeMetadata] = useState<AIMetadata | null>(null);
    const [analyzeRequirements, setAnalyzeRequirements] = useState<AITechnicalRequirements | null>(null);

    // Tab: Mejorar
    const [rubricsResult, setRubricsResult] = useState<string | null>(null);
    const [rubricsLoading, setRubricsLoading] = useState(false);
    const [activitiesResult, setActivitiesResult] = useState<Activity[] | null>(null);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [improveLoading, setImproveLoading] = useState(false);

    // Tab: Chat
    const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatLog]);

    // Reset results when doc changes
    useEffect(() => {
        setAnalyzeMetadata(null);
        setAnalyzeRequirements(null);
        setRubricsResult(null);
        setActivitiesResult(null);
        setSummaryResult(null);
    }, [selectedDoc?.id]);

    const handleGenerate = async () => {
        if (!generatorPrompt.trim()) return;
        setGeneratorLoading(true);
        try {
            const result = await generateFullPlan(generatorPrompt.trim());
            setPendingCreateFromAI(result);
            setGeneratorPrompt('');
        } catch (e: any) {
            alert('Error generando planificación: ' + e.message);
        } finally {
            setGeneratorLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedDoc?.content) return;
        setAnalyzeLoading(true);
        try {
            const result = await analyzeDocumentContent(selectedDoc.content, selectedDoc.title);
            setAnalyzeMetadata(result.metadata);
            setAnalyzeRequirements(result.requirements);
        } catch (e: any) {
            alert('Error analizando: ' + e.message);
        } finally {
            setAnalyzeLoading(false);
        }
    };

    const handleGenerateSummary = async () => {
        if (!selectedDoc?.content) return;
        setSummaryLoading(true);
        try {
            const result = await generateExecutiveSummary(selectedDoc.content, selectedDoc.title);
            setSummaryResult(result);
        } catch (e: any) {
            alert('Error generando resumen: ' + e.message);
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleGenerateRubric = async () => {
        if (!selectedDoc?.content) return;
        setRubricsLoading(true);
        try {
            const result = await generateRubric(selectedDoc.content, selectedDoc.title);
            setRubricsResult(result);
        } catch (e: any) {
            alert('Error generando rúbrica: ' + e.message);
        } finally {
            setRubricsLoading(false);
        }
    };

    const handleSuggestActivities = async () => {
        if (!selectedDoc?.content) return;
        setActivitiesLoading(true);
        try {
            const result = await suggestActivities(selectedDoc.content, selectedDoc.title);
            setActivitiesResult(result);
        } catch (e: any) {
            alert('Error sugiriendo actividades: ' + e.message);
        } finally {
            setActivitiesLoading(false);
        }
    };

    const handleImproveText = async () => {
        if (!editorSelection?.text) return;
        setImproveLoading(true);
        try {
            const result = await improveText(editorSelection.text);
            setPendingReplacement(result);
        } catch (e: any) {
            alert('Error mejorando texto: ' + e.message);
        } finally {
            setImproveLoading(false);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        const q = chatInput.trim();
        setChatInput('');
        setChatLog(prev => [...prev, { role: 'user', text: q }]);
        setChatLoading(true);

        let docContent = '';
        let globalContext: string | undefined;

        if (selectedDoc) {
            docContent = selectedDoc.content || '';
        } else if (allDocuments.length > 0) {
            globalContext = `Tienes acceso a ${allDocuments.length} planificaciones:\n` +
                allDocuments.map(d => `- "${d.title}" | Temática: ${d.tematica || 'Sin categorizar'} | Grado: ${d.grado || 'N/A'} | Autor: ${d.author_name}`).join('\n');
        }

        const aiResponse = await askGeminiQuestion(docContent, q, globalContext);
        setChatLog(prev => [...prev, { role: 'ai', text: aiResponse }]);
        setChatLoading(false);
    };

    const insertAtEndOfDoc = (html: string) => {
        if (!selectedDoc) return;
        const newContent = (selectedDoc.content || '') + html;
        useDocumentStore.getState().setSelectedDoc({ ...selectedDoc, content: newContent });
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'generar', label: '✨ Generar' },
        { key: 'analizar', label: '🔍 Analizar' },
        { key: 'mejorar', label: '🛠️ Mejorar' },
        { key: 'chat', label: '💬 Chat' },
    ];

    return (
        <div className={styles.aiContainer} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tab Bar */}
            <div className={styles.tabBar}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* ===== TAB: GENERAR ===== */}
                {activeTab === 'generar' && (
                    <>
                        <div>
                            <h4 className={styles.sectionTitle}>Generador de Planificación</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Describí la clase y la IA la crea completa con estructura pedagógica.
                            </p>
                            <textarea
                                className={styles.generatorTextarea}
                                value={generatorPrompt}
                                onChange={e => setGeneratorPrompt(e.target.value)}
                                placeholder="Ej: Clase de 2 módulos sobre Arduino para 3er año. Objetivo: introducir pines digitales."
                            />
                            <button
                                style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                                onClick={handleGenerate}
                                disabled={generatorLoading || !generatorPrompt.trim()}
                            >
                                {generatorLoading ? '⏳ Generando...' : '✨ Generar Planificación Completa'}
                            </button>
                        </div>

                        <div>
                            <h4 className={styles.sectionTitle}>Plantillas Rápidas</h4>
                            <div className={styles.templateGrid}>
                                {QUICK_TEMPLATES.map(t => {
                                    const colors = TEMPLATE_COLORS[t.id] ?? { bg: '#f1f5f9', border: '#cbd5e1', color: '#475569' };
                                    return (
                                        <div
                                            key={t.id}
                                            className={styles.templateChip}
                                            style={{ background: colors.bg, borderColor: colors.border, color: colors.color }}
                                            onClick={() => setGeneratorPrompt(t.prompt)}
                                        >
                                            {t.icon} {t.name}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedDoc && (
                            <div>
                                <h4 className={styles.sectionTitle}>Resumen Ejecutivo</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Genera una síntesis de una línea para informes o directivos.
                                </p>
                                {summaryResult ? (
                                    <div className={styles.resultBox}>
                                        <p style={{ margin: 0, fontStyle: 'italic' }}>{summaryResult}</p>
                                        <button className={styles.insertBtn} onClick={() => navigator.clipboard.writeText(summaryResult)}>
                                            Copiar
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        style={{ width: '100%', padding: '8px', background: '#e2e8f0', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                                        onClick={handleGenerateSummary}
                                        disabled={summaryLoading}
                                    >
                                        {summaryLoading ? '⏳ Generando...' : '📄 Generar Resumen'}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* ===== TAB: ANALIZAR ===== */}
                {activeTab === 'analizar' && (
                    <>
                        {!selectedDoc ? (
                            <div className={styles.emptyState}>
                                <Sparkles size={24} color="#CBD5E1" />
                                <p>Abrí una planificación para analizarla.</p>
                            </div>
                        ) : analyzeLoading ? (
                            <div className={styles.analyzingBox}>
                                <div className={styles.spinner} />
                                <span>Escaneando requerimientos...</span>
                            </div>
                        ) : analyzeMetadata ? (
                            <div className={styles.results}>
                                <div className={styles.metadataCard}>
                                    <div className={styles.metaRow}>
                                        <span className={styles.metaLabel}>Materia:</span>
                                        <span className={styles.metaValue}>{analyzeMetadata.subject}</span>
                                    </div>
                                    <div className={styles.metaRow}>
                                        <span className={styles.metaLabel}>Categoría:</span>
                                        <span className={styles.metaValue} style={{ fontWeight: 'bold' }}>{analyzeMetadata.category}</span>
                                    </div>
                                    <div className={styles.metaRow}>
                                        <span className={styles.metaLabel}>Curso:</span>
                                        <span className={styles.metaValue}>{analyzeMetadata.course}</span>
                                    </div>
                                </div>
                                <div className={styles.section}>
                                    <h4 className={styles.sectionTitle}><Hammer size={14} /> Herramientas</h4>
                                    <ul className={styles.tagList}>
                                        {analyzeRequirements?.tools.map(t => <li key={t} className={styles.tag}>{t}</li>)}
                                    </ul>
                                </div>
                                <div className={styles.section}>
                                    <h4 className={styles.sectionTitle}><Package size={14} /> Materiales</h4>
                                    <ul className={styles.tagList}>
                                        {analyzeRequirements?.materials.map(m => <li key={m} className={styles.tag}>{m}</li>)}
                                    </ul>
                                </div>
                                <div className={styles.section}>
                                    <h4 className={styles.sectionTitle}><ShieldAlert size={14} color="#ea580c" /> EPP Requerido</h4>
                                    <ul className={styles.tagList}>
                                        {analyzeRequirements?.ppe.map(e => <li key={e} className={`${styles.tag} ${styles.eppTag}`}>{e}</li>)}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <button
                                style={{ width: '100%', padding: '10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                                onClick={handleAnalyze}
                            >
                                ✨ Analizar este Documento
                            </button>
                        )}
                    </>
                )}

                {/* ===== TAB: MEJORAR ===== */}
                {activeTab === 'mejorar' && (
                    <>
                        {!selectedDoc ? (
                            <div className={styles.emptyState}>
                                <Sparkles size={24} color="#CBD5E1" />
                                <p>Abrí una planificación para usar estas herramientas.</p>
                            </div>
                        ) : (
                            <>
                                {/* Rubrica */}
                                <div>
                                    {rubricsResult ? (
                                        <>
                                            <h4 className={styles.sectionTitle}>📋 Rúbrica Generada</h4>
                                            <div className={styles.resultBox} dangerouslySetInnerHTML={{ __html: rubricsResult }} />
                                            <button className={styles.insertBtn} onClick={() => insertAtEndOfDoc(rubricsResult)}>
                                                Insertar al final del documento
                                            </button>
                                        </>
                                    ) : (
                                        <div
                                            className={styles.toolCard}
                                            style={{ cursor: rubricsLoading ? 'default' : 'pointer' }}
                                            onClick={!rubricsLoading ? handleGenerateRubric : undefined}
                                        >
                                            <span className={styles.toolCardIcon}>📋</span>
                                            <div>
                                                <p className={styles.toolCardTitle}>
                                                    {rubricsLoading ? '⏳ Generando rúbrica...' : 'Generar Rúbrica de Evaluación'}
                                                </p>
                                                <p className={styles.toolCardDesc}>Criterios e indicadores basados en el contenido de la clase.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actividades */}
                                <div>
                                    {activitiesResult ? (
                                        <>
                                            <h4 className={styles.sectionTitle}>💡 Actividades Sugeridas</h4>
                                            {activitiesResult.map((act, i) => {
                                                const badge = ACTIVITY_BADGE[act.type] ?? { bg: '#f1f5f9', color: '#475569', label: act.type };
                                                return (
                                                    <div key={i} className={styles.activityItem}>
                                                        <span className={styles.activityBadge} style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                                                        <p style={{ fontWeight: 600, margin: '4px 0 2px', fontSize: '0.85rem' }}>{act.title}</p>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{act.description}</p>
                                                        <button
                                                            className={styles.insertBtn}
                                                            style={{ marginTop: '6px' }}
                                                            onClick={() => insertAtEndOfDoc(`<h3>${act.title}</h3><p>${act.description}</p>`)}
                                                        >
                                                            Insertar
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    ) : (
                                        <div
                                            className={styles.toolCard}
                                            style={{ cursor: activitiesLoading ? 'default' : 'pointer' }}
                                            onClick={!activitiesLoading ? handleSuggestActivities : undefined}
                                        >
                                            <span className={styles.toolCardIcon}>💡</span>
                                            <div>
                                                <p className={styles.toolCardTitle}>
                                                    {activitiesLoading ? '⏳ Sugiriendo...' : 'Sugerir Actividades Complementarias'}
                                                </p>
                                                <p className={styles.toolCardDesc}>3 actividades de refuerzo, extensión y evaluación alternativa.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Mejora texto */}
                                <div>
                                    <div
                                        className={styles.toolCard}
                                        style={{ cursor: editorSelection?.text && !improveLoading ? 'pointer' : 'default', opacity: editorSelection?.text ? 1 : 0.5 }}
                                        onClick={editorSelection?.text && !improveLoading ? handleImproveText : undefined}
                                    >
                                        <span className={styles.toolCardIcon}>✏️</span>
                                        <div>
                                            <p className={styles.toolCardTitle}>
                                                {improveLoading ? '⏳ Mejorando...' : 'Mejorar Texto Seleccionado'}
                                            </p>
                                            <p className={styles.toolCardDesc}>
                                                {editorSelection?.text
                                                    ? 'Texto seleccionado listo. Hacé clic para mejorarlo.'
                                                    : 'Seleccioná texto en el editor para habilitarlo.'}
                                            </p>
                                        </div>
                                    </div>
                                    {editorSelection?.text && (
                                        <div className={styles.selectionPreview}>
                                            <strong>Seleccionado:</strong> {editorSelection.text.slice(0, 120)}{editorSelection.text.length > 120 ? '...' : ''}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* ===== TAB: CHAT ===== */}
                {activeTab === 'chat' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '200px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {selectedDoc
                                ? `Consultando sobre: "${selectedDoc.title}"`
                                : `Modo global: ${allDocuments.length} planificaciones disponibles`}
                        </p>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px', minHeight: '120px' }}>
                            {chatLog.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: '20px' }}>
                                    {selectedDoc
                                        ? '¿Qué actividad dura más tiempo? ¿Qué evaluación se menciona?'
                                        : '¿Cuántas clases de Robótica hay? ¿Quién enseña Historia?'}
                                </p>
                            ) : (
                                chatLog.map((msg, i) => (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        <div style={{
                                            maxWidth: '85%', padding: '8px 12px', borderRadius: '12px',
                                            backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : '#f1f5f9',
                                            color: msg.role === 'user' ? 'white' : 'var(--text-color)',
                                            fontSize: '0.85rem', whiteSpace: 'pre-wrap'
                                        }}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))
                            )}
                            {chatLoading && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
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
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !chatLoading && handleSendChat()}
                                placeholder="Escribí tu pregunta..."
                                style={{ flex: 1, padding: '10px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                                disabled={chatLoading}
                            />
                            <button
                                onClick={handleSendChat}
                                disabled={!chatInput.trim() || chatLoading}
                                style={{
                                    backgroundColor: chatInput.trim() && !chatLoading ? 'var(--primary-color)' : '#cbd5e1',
                                    color: 'white', border: 'none', borderRadius: '50%',
                                    width: '36px', height: '36px', display: 'flex',
                                    justifyContent: 'center', alignItems: 'center',
                                    cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default',
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
