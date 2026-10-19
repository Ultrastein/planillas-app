import { useState, useEffect, useRef } from 'react';
import { Sparkles, Hammer, ShieldAlert, Package, Send, ScanSearch, ClipboardList, Lightbulb, PenLine, FileText } from 'lucide-react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useToast } from '../../components/Toast/useToast';
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

    const { showToast } = useToast();

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
            showToast('Error generando planificación: ' + e.message, 'error');
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
            showToast('Error analizando: ' + e.message, 'error');
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
            showToast('Error generando resumen: ' + e.message, 'error');
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
            showToast('Error generando rúbrica: ' + e.message, 'error');
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
            showToast('Error sugiriendo actividades: ' + e.message, 'error');
        } finally {
            setActivitiesLoading(false);
        }
    };

    const handleImproveText = async () => {
        if (!editorSelection?.text) return;
        // Capture range NOW before async call (user might move cursor during AI call)
        const capturedFrom = editorSelection.from;
        const capturedTo = editorSelection.to;
        const capturedText = editorSelection.text;
        setImproveLoading(true);
        try {
            const result = await improveText(capturedText);
            setPendingReplacement({ text: result, from: capturedFrom, to: capturedTo });
        } catch (e: any) {
            showToast('Error mejorando texto: ' + e.message, 'error');
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

        try {
            const aiResponse = await askGeminiQuestion(docContent, q, globalContext);
            setChatLog(prev => [...prev, { role: 'ai', text: aiResponse }]);
        } catch (e: any) {
            setChatLog(prev => [...prev, { role: 'ai', text: 'Error al consultar la IA: ' + (e.message || 'Error desconocido') }]);
        } finally {
            setChatLoading(false);
        }
    };

    const insertAtEndOfDoc = (html: string) => {
        if (!selectedDoc) return;
        const newContent = (selectedDoc.content || '') + html;
        useDocumentStore.getState().setSelectedDoc({ ...selectedDoc, content: newContent });
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'generar', label: 'Generar' },
        { key: 'analizar', label: 'Analizar' },
        { key: 'mejorar', label: 'Mejorar' },
        { key: 'chat', label: 'Chat' },
    ];

    return (
        <div className={styles.aiContainer}>
            {/* Tab Bar */}
            <div className={styles.tabBar} role="tablist" aria-label="Herramientas de IA">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === t.key}
                        className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className={styles.tabBody}>

                {/* ===== TAB: GENERAR ===== */}
                {activeTab === 'generar' && (
                    <>
                        <div className={styles.generatorCard}>
                            <label htmlFor="ai-generator" className={styles.generatorLabel}>Generador de Planificación</label>
                            <p className={styles.helpText}>
                                Describí la clase y la IA la crea completa con estructura pedagógica.
                            </p>
                            <textarea
                                id="ai-generator"
                                rows={4}
                                className={styles.generatorTextarea}
                                value={generatorPrompt}
                                onChange={e => setGeneratorPrompt(e.target.value)}
                                placeholder="Ej: Clase de 2 módulos sobre Arduino para 3er año. Objetivo: introducir pines digitales."
                            />
                            <button
                                type="button"
                                className={styles.btnDark}
                                onClick={handleGenerate}
                                disabled={generatorLoading || !generatorPrompt.trim()}
                            >
                                {generatorLoading ? <><span className={styles.spinnerLight} /> Generando...</> : 'Generar clase'}
                            </button>
                        </div>

                        <div>
                            <h4 className={styles.sectionTitle}>Plantillas Rápidas</h4>
                            <div className={styles.templateGrid}>
                                {QUICK_TEMPLATES.map(t => {
                                    const colors = TEMPLATE_COLORS[t.id] ?? { bg: '#f1f5f9', border: '#cbd5e1', color: '#475569' };
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            className={styles.templateChip}
                                            style={{ background: colors.bg, borderColor: colors.border, color: colors.color }}
                                            onClick={() => setGeneratorPrompt(t.prompt)}
                                        >
                                            {t.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedDoc && (
                            <div>
                                {summaryResult ? (
                                    <div className={styles.summaryBox}>
                                        <span className={styles.summaryEyebrow}>Resumen ejecutivo</span>
                                        <p>{summaryResult}</p>
                                        <button type="button" className={styles.summaryCopy} onClick={() => navigator.clipboard.writeText(summaryResult)}>
                                            Copiar
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.toolCard}
                                        onClick={handleGenerateSummary}
                                        disabled={summaryLoading}
                                    >
                                        <FileText size={18} aria-hidden="true" className={styles.toolCardIcon} />
                                        <span>
                                            <span className={styles.toolCardTitle}>{summaryLoading ? 'Generando resumen...' : 'Resumen ejecutivo'}</span>
                                            <span className={styles.toolCardDesc}>Síntesis de una línea para informes o directivos.</span>
                                        </span>
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
                            <button type="button" className={styles.btnPrimary} onClick={handleAnalyze}>
                                <ScanSearch size={16} aria-hidden="true" /> Analizar este documento
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
                                            <h4 className={styles.sectionTitle}><ClipboardList size={14} aria-hidden="true" /> Rúbrica generada</h4>
                                            <div className={styles.resultBox} dangerouslySetInnerHTML={{ __html: rubricsResult }} />
                                            <button className={styles.insertBtn} onClick={() => insertAtEndOfDoc(rubricsResult)}>
                                                Insertar al final del documento
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.toolCard}
                                            disabled={rubricsLoading}
                                            onClick={handleGenerateRubric}
                                        >
                                            <ClipboardList size={18} aria-hidden="true" className={styles.toolCardIcon} />
                                            <span>
                                                <span className={styles.toolCardTitle}>
                                                    {rubricsLoading ? 'Generando rúbrica...' : 'Generar rúbrica'}
                                                </span>
                                                <span className={styles.toolCardDesc}>Criterios e indicadores a partir de esta clase.</span>
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {/* Actividades */}
                                <div>
                                    {activitiesResult ? (
                                        <>
                                            <h4 className={styles.sectionTitle}><Lightbulb size={14} aria-hidden="true" /> Actividades sugeridas</h4>
                                            {activitiesResult.map((act, i) => {
                                                const badge = ACTIVITY_BADGE[act.type] ?? { bg: '#f1f5f9', color: '#475569', label: act.type };
                                                return (
                                                    <div key={i} className={styles.activityItem}>
                                                        <span className={styles.activityBadge} style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                                                        <p className={styles.activityTitle}>{act.title}</p>
                                                        <p className={styles.activityDesc}>{act.description}</p>
                                                        <button
                                                            type="button"
                                                            className={styles.insertBtn}
                                                            onClick={() => insertAtEndOfDoc(`<h3>${act.title}</h3><p>${act.description}</p>`)}
                                                        >
                                                            Insertar
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            className={styles.toolCard}
                                            disabled={activitiesLoading}
                                            onClick={handleSuggestActivities}
                                        >
                                            <Lightbulb size={18} aria-hidden="true" className={styles.toolCardIcon} />
                                            <span>
                                                <span className={styles.toolCardTitle}>
                                                    {activitiesLoading ? 'Sugiriendo...' : 'Actividades sugeridas'}
                                                </span>
                                                <span className={styles.toolCardDesc}>Refuerzo, extensión y evaluación alternativa.</span>
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {/* Mejora texto */}
                                <div>
                                    <button
                                        type="button"
                                        className={styles.toolCard}
                                        disabled={!editorSelection?.text || improveLoading}
                                        onClick={handleImproveText}
                                    >
                                        <PenLine size={18} aria-hidden="true" className={styles.toolCardIcon} />
                                        <span>
                                            <span className={styles.toolCardTitle}>
                                                {improveLoading ? 'Mejorando...' : 'Mejorar texto seleccionado'}
                                            </span>
                                            <span className={styles.toolCardDesc}>
                                                {editorSelection?.text
                                                    ? 'Texto seleccionado listo. Hacé clic para mejorarlo.'
                                                    : 'Seleccioná texto en el editor para habilitarlo.'}
                                            </span>
                                        </span>
                                    </button>
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
                    <div className={styles.chat}>
                        <p className={styles.helpText}>
                            {selectedDoc
                                ? `Consultando sobre: "${selectedDoc.title}"`
                                : `Modo global: ${allDocuments.length} planificaciones disponibles`}
                        </p>
                        <div className={styles.chatLog}>
                            {chatLog.length === 0 ? (
                                <p className={styles.chatEmpty}>
                                    {selectedDoc
                                        ? '¿Qué actividad dura más tiempo? ¿Qué evaluación se menciona?'
                                        : '¿Cuántas clases de Robótica hay? ¿Quién enseña Historia?'}
                                </p>
                            ) : (
                                chatLog.map((msg, i) => (
                                    <div key={i} className={`${styles.chatMsg} ${msg.role === 'user' ? styles.chatMsgUser : styles.chatMsgAi}`}>
                                        {msg.text}
                                    </div>
                                ))
                            )}
                            {chatLoading && (
                                <div className={styles.chatThinking}>
                                    <div className={styles.spinner} />
                                    Pensando...
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <div className={styles.chatInputRow}>
                            <label htmlFor="ai-chat" className="sr-only">Pregunta para la IA</label>
                            <input
                                id="ai-chat"
                                type="text"
                                className={styles.chatInput}
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !chatLoading && handleSendChat()}
                                placeholder="Escribí tu pregunta..."
                                disabled={chatLoading}
                            />
                            <button
                                type="button"
                                className={styles.chatSend}
                                aria-label="Enviar pregunta"
                                onClick={handleSendChat}
                                disabled={!chatInput.trim() || chatLoading}
                            >
                                <Send size={16} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
