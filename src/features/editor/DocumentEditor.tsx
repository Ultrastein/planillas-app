import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDocumentStore } from '../../store/useDocumentStore';
import { supabase } from '../../lib/supabase';
import { useVersionStore } from '../../store/useVersionStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { RichTextEditor } from './RichTextEditor';
import styles from './DocumentEditor.module.css';
import * as mammoth from 'mammoth';
import { Folder, FolderOpen, Plus, FileText } from 'lucide-react';

export function DocumentEditor() {
    const { profile: user } = useAuthStore();
    const { setSelectedDocId } = useDocumentStore();
    const previewVersion = useVersionStore((state: any) => state.previewVersion);

    const { categories, fetchCategories } = useCategoryStore();

    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showNewCatInput, setShowNewCatInput] = useState(false);
    const [newCatName, setNewCatName] = useState('');

    useEffect(() => {
        setSelectedDocId(selectedDoc?.id || null);
    }, [selectedDoc, setSelectedDocId]);

    // Upload state
    const [uploadType, setUploadType] = useState<'pdf' | 'word' | 'gdoc' | 'editor'>('editor');
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadCategory, setUploadCategory] = useState('');
    const [gdocUrl, setGdocUrl] = useState('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    useEffect(() => {
        fetchDocs();
        fetchCategories();
    }, [fetchCategories]);

    const fetchDocs = async () => {
        try {
            const { data, error } = await supabase.from('documents').select('*').eq('status', 'active');
            if (error) throw error;
            setDocuments(data || []);

            if (!selectedDoc && data && data.length > 0) {
                setSelectedDoc(data[0]);
            } else if (selectedDoc && !data?.find(d => d.id === selectedDoc.id)) {
                setSelectedDoc(null);
            }
        } catch (err) {
            console.error("Error fetching docs", err);
        }
    };

    const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadFile(file);

        if (uploadType === 'word') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                try {
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    setFileContent(result.value); // extracted text for preview
                } catch (err) {
                    alert('Error leyendo el archivo Word para previsualización');
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleSaveDocument = async () => {
        if (!user || !uploadTitle) return alert('Se requiere un título.');

        setLoading(true);
        try {
            let file_url = gdocUrl;
            let content = uploadType === 'word' || uploadType === 'editor' ? fileContent : null;

            if (!content && uploadType === 'editor') {
                content = "Contenido de editor en blanco..."; // Demo placeholder
            }

            // --- Duplicate Check Start ---
            // Fetch all active documents for duplicate comparison
            const { data: existingDocs, error: fetchDocsError } = await supabase
                .from('documents')
                .select('title, content')
                .eq('status', 'active');

            if (fetchDocsError) throw fetchDocsError;

            // Check if title already exists
            const isDuplicateTitle = existingDocs?.some(doc => doc.title.trim().toLowerCase() === uploadTitle.trim().toLowerCase());
            if (isDuplicateTitle) {
                setLoading(false);
                return alert('Ya existe un documento con este título. Por favor, elige un título diferente.');
            }

            // Check if content already exists (only for text-based uploads where content is extracted or typed)
            if (content && content.trim() !== '') {
                const isDuplicateContent = existingDocs?.some(doc => {
                    // Solo comparar si el documento existente tiene contenido
                    if (!doc.content) return false;
                    // Comparar de forma básica (se podría mejorar ignorando espacios o saltos de línea)
                    return doc.content.trim() === content?.trim();
                });

                if (isDuplicateContent) {
                    setLoading(false);
                    return alert('Ya existe un documento con este mismo contenido. No se ha guardado el duplicado.');
                }
            }
            // --- Duplicate Check End ---

            // Upload physical file if it's PDF or Word
            if (uploadFile && (uploadType === 'pdf' || uploadType === 'word')) {
                const fileExt = uploadFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `archivos/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('planillas_archivos')
                    .upload(filePath, uploadFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('planillas_archivos')
                    .getPublicUrl(filePath);

                file_url = publicUrlData.publicUrl;
            }

            const newDoc = {
                title: uploadTitle,
                author_id: user.id,
                author_name: user.name,
                author_role: user.role,
                file_type: uploadType,
                file_url: file_url || null,
                content: content,
                tematica: uploadCategory || null,
                status: 'active'
            };

            const { data, error } = await supabase.from('documents').insert(newDoc).select().single();
            if (error) throw error;

            setUploadTitle('');
            setUploadCategory('');
            setFileContent(null);
            setUploadFile(null);
            setGdocUrl('');

            await fetchDocs();
            setSelectedDoc(data);
        } catch (err: any) {
            alert('Error al guardar documento: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (docId: string) => {
        const reason = window.prompt("Por favor, escriba el motivo de la eliminación:");
        if (!reason || reason.trim() === '') {
            alert('El borrado requiere un motivo obligatorio.');
            return;
        }

        try {
            const { error } = await supabase
                .from('documents')
                .update({ status: 'deleted', delete_reason: reason })
                .eq('id', docId);

            if (error) throw error;
            fetchDocs();
        } catch (err: any) {
            alert('Error eliminando: ' + err.message);
        }
    };

    const handleUpdateCategory = async (docId: string, newCategory: string) => {
        try {
            const { error } = await supabase.from('documents').update({ tematica: newCategory || null }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, tematica: newCategory || null } : prev);
            fetchDocs();
        } catch (err: any) {
            alert('Error al actualizar temática: ' + err.message);
        }
    };

    const handleAutoSave = async (docId: string, newContent: string) => {
        try {
            const { error } = await supabase.from('documents').update({ content: newContent }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, content: newContent } : prev);
        } catch (err) {
            console.error('Error auto-saving:', err);
        }
    };

    const handleAIScan = async () => {
        if (!selectedDoc) return;
        setLoading(true);

        try {
            // Utilizamos el servicio AI para simular el análisis del texto
            const aiDataResponse = await import('../ai/aiService').then(m => m.analyzeDocumentContent(selectedDoc.content || ''));
            const metadata = aiDataResponse.metadata;
            const requirements = aiDataResponse.requirements;

            const aiDataToSave = {
                curso: metadata.subject,
                grado: metadata.course,
                anio: metadata.year,
                carga_horaria: metadata.hourlyLoad,
                tematica: metadata.category,
                num_clase: metadata.classNumber,
                recursos: [...requirements.tools, ...requirements.materials].join(', ')
            };

            const { data, error } = await supabase.from('documents').update(aiDataToSave).eq('id', selectedDoc.id).select().single();
            if (error) throw error;
            setSelectedDoc(data);
            alert('¡Escaneo IA completado y Categoría (Temática) Detectada!');
        } catch (err) {
            console.error('AI Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateVersion = async () => {
        if (!selectedDoc) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('document_versions').insert({
                document_id: selectedDoc.id,
                author_id: user?.id,
                author_name: user?.name,
                content: selectedDoc.content,
            });
            if (error) throw error;
            // Force Version Sidebar refresh by clearing selectedDocId temporarily or just notifying global state
            // It will auto-refresh if the user clicks out and back, but let's notify the user
            alert('Versión guardada correctamente. Puede verla en el historial lateral.');
        } catch (err: any) {
            alert('Error al guardar versión: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCatName.trim()) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('thematic_categories').insert({ name: newCatName.trim() });
            if (error) throw error;
            setNewCatName('');
            setShowNewCatInput(false);
            fetchCategories();
        } catch (err: any) {
            alert('Error al crear categoría: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const canCreateDocument = user?.role === 'admin' || user?.role === 'titular';
    const canEditSelected = selectedDoc ? (user?.role === 'admin' || (user?.role === 'titular' && selectedDoc.author_id === user?.id)) : false;

    const filteredDocs = selectedCategory
        ? documents.filter(d => d.tematica === selectedCategory || (!d.tematica && selectedCategory === 'Sin Categorizar'))
        : documents;

    return (
        <div className={styles.centerContainer}>
            {/* GOOGLE DRIVE STYLE HEADER: Horizontally scrollable folders row */}
            <div className={styles.topFolderRow}>
                <div className={styles.folderRowHeader}>
                    <h3>Carpetas de Planificación</h3>
                    {canCreateDocument && (
                        <button className={styles.iconBtn} onClick={() => setShowNewCatInput(!showNewCatInput)} title="Nueva Carpeta">
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                {showNewCatInput && (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', maxWidth: '300px' }}>
                        <input
                            autoFocus
                            style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                            placeholder="Nombre de temática..."
                            value={newCatName}
                            onChange={e => setNewCatName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                        />
                        <button className={styles.btnPrimary} style={{ padding: '6px 12px' }} onClick={handleCreateCategory} disabled={loading}>OK</button>
                    </div>
                )}

                <div className={styles.foldersContainer}>
                    <div
                        className={`${styles.folderChip} ${selectedCategory === null ? styles.activeFolderChip : ''}`}
                        onClick={() => setSelectedCategory(null)}
                    >
                        {selectedCategory === null ? <FolderOpen size={16} color="var(--primary-color)" /> : <Folder size={16} color="#94a3b8" />}
                        <span>Todas</span>
                    </div>
                    {categories.map(cat => (
                        <div
                            key={cat.id}
                            className={`${styles.folderChip} ${selectedCategory === cat.name ? styles.activeFolderChip : ''}`}
                            onClick={() => setSelectedCategory(cat.name)}
                        >
                            {selectedCategory === cat.name ? <FolderOpen size={16} color="var(--primary-color)" /> : <Folder size={16} color="#94a3b8" />}
                            <span>{cat.name}</span>
                        </div>
                    ))}
                    <div
                        className={`${styles.folderChip} ${selectedCategory === 'Sin Categorizar' ? styles.activeFolderChip : ''}`}
                        onClick={() => setSelectedCategory('Sin Categorizar')}
                    >
                        {selectedCategory === 'Sin Categorizar' ? <FolderOpen size={16} color="var(--primary-color)" /> : <Folder size={16} color="#94a3b8" />}
                        <span style={{ fontStyle: 'italic', color: '#64748b' }}>Sin Categorizar</span>
                    </div>
                </div>
            </div>

            <div className={styles.lowerWorkspace}>
                <div className={styles.docListSidebar}>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <h4 style={{ padding: '0 12px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                            Documentos en {selectedCategory || "Todas"}
                        </h4>
                        <ul className={styles.docList}>
                            {filteredDocs.map(d => (
                                <li key={d.id}
                                    className={selectedDoc?.id === d.id ? styles.activeDoc : ''}
                                    onClick={() => setSelectedDoc(d)}
                                >
                                    <span className={styles.docTitle}>{d.title}</span>
                                    <span className={styles.docMeta}>{d.file_type.toUpperCase()}</span>
                                </li>
                            ))}
                            {filteredDocs.length === 0 && <li className={styles.emptyLi}>No hay documentos aquí.</li>}
                        </ul>
                    </div>

                    {canCreateDocument && (
                        <div className={styles.uploadSection}>
                            <h4 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 600 }}>Selección de Material</h4>
                            <input
                                type="text"
                                placeholder="Título del nuevo material"
                                value={uploadTitle}
                                onChange={e => setUploadTitle(e.target.value)}
                            />
                            <select value={uploadType} onChange={(e: any) => setUploadType(e.target.value)}>
                                <option value="editor">Editor de Texto En App</option>
                                <option value="word">Word (.docx)</option>
                                <option value="pdf">Documento PDF</option>
                                <option value="gdoc">Google Docs Link</option>
                            </select>

                            <select value={uploadCategory} onChange={(e: any) => setUploadCategory(e.target.value)}>
                                <option value="">-- Seleccionar Temática (Opcional) --</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>

                            {(uploadType === 'word' || uploadType === 'pdf') && (
                                <input type="file" accept={uploadType === 'word' ? ".docx" : ".pdf"} onChange={handleFileUploadChange} />
                            )}

                            {uploadType === 'gdoc' && (
                                <input type="url" placeholder="URL de Google Docs" value={gdocUrl} onChange={e => setGdocUrl(e.target.value)} />
                            )}

                            <button className={styles.btnPrimary} onClick={handleSaveDocument} disabled={loading} style={{ marginTop: 8 }}>
                                {loading ? 'Subiendo...' : 'Publicar Material'}
                            </button>
                        </div>
                    )}
                </div>

                <div className={styles.viewerArea}>
                    {selectedDoc ? (
                        <>
                            <div className={styles.docRibbon}>
                                <div>
                                    <h2>{selectedDoc.title}</h2>
                                    <p><strong>Autor:</strong> {selectedDoc.author_name} | <strong>Rol:</strong> {selectedDoc.author_role} | <strong>Fecha:</strong> {new Date(selectedDoc.created_at).toLocaleString()}</p>

                                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Temática:</span>
                                        {canEditSelected ? (
                                            <select
                                                value={selectedDoc.tematica || ''}
                                                onChange={(e) => handleUpdateCategory(selectedDoc.id, e.target.value)}
                                                style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem', backgroundColor: '#f8fafc' }}
                                            >
                                                <option value="">-- Sin Categorizar --</option>
                                                {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        ) : (
                                            <span className={styles.badge} style={{ margin: 0, backgroundColor: 'var(--text-secondary)' }}>{selectedDoc.tematica || 'Sin Categorizar'}</span>
                                        )}
                                    </div>

                                    {selectedDoc.curso && (
                                        <div className={styles.aiMetadata} style={{ marginTop: '16px' }}>
                                            <span className={styles.badge}>Curso: {selectedDoc.curso}</span>
                                            <span className={styles.badge}>Grado: {selectedDoc.grado} {selectedDoc.anio}</span>
                                            <span className={styles.badge}>Clase N°: {selectedDoc.num_clase}</span>
                                            <p style={{ marginTop: 8, fontSize: '0.85rem' }}><strong>Carga Horaria:</strong> {selectedDoc.carga_horaria}</p>
                                            <p style={{ fontSize: '0.85rem' }}><strong>Materiales Sugeridos:</strong> {selectedDoc.recursos}</p>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.ribbonActions}>
                                    {canEditSelected && (
                                        <>
                                            {selectedDoc.file_type === 'editor' && (
                                                <button className={styles.btnPrimary} onClick={handleCreateVersion} disabled={loading}>
                                                    Guardar Versión
                                                </button>
                                            )}
                                            <button className={styles.btnSecondary} onClick={handleAIScan} disabled={loading}>
                                                {loading ? 'Analizando...' : 'Analizar con IA'}
                                            </button>
                                            <button className={styles.btnDanger} onClick={() => handleDelete(selectedDoc.id)}>Eliminar</button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className={styles.previewContainer}>
                                {selectedDoc.file_type === 'pdf' && selectedDoc.file_url && (
                                    <iframe src={selectedDoc.file_url} width="100%" height="100%" title="PDF Prev" />
                                )}
                                {selectedDoc.file_type === 'word' && (
                                    <div className={styles.wordPreview}>
                                        {selectedDoc.file_url && <div style={{ marginBottom: 10 }}><a href={selectedDoc.file_url} target="_blank" rel="noreferrer">Descargar Original (.docx)</a></div>}
                                        {selectedDoc.content || 'Vista previa no disponible.'}
                                    </div>
                                )}
                                {selectedDoc.file_type === 'gdoc' && selectedDoc.file_url && (
                                    <iframe src={selectedDoc.file_url} width="100%" height="100%" title="GDoc Prev" />
                                )}
                                {selectedDoc.file_type === 'editor' && (
                                    <div className={styles.editorWrapper}>
                                        <RichTextEditor
                                            content={previewVersion ? (previewVersion.content || '') : (selectedDoc.content || '')}
                                            onSave={(newContent) => handleAutoSave(selectedDoc.id, newContent)}
                                            readOnly={!canEditSelected || !!previewVersion}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className={styles.noDocSelected}>
                            <div style={{ textAlign: 'center' }}>
                                <FileText size={48} color="var(--border-color)" style={{ marginBottom: 16 }} />
                                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Seleccione un documento o cargue uno nuevo</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
