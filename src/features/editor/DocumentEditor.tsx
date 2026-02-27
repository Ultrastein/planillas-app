import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDocumentStore } from '../../store/useDocumentStore';
import { supabase } from '../../lib/supabase';
import { useVersionStore } from '../../store/useVersionStore';
import { RichTextEditor } from './RichTextEditor';
import styles from './DocumentEditor.module.css';
import * as mammoth from 'mammoth';

export function DocumentEditor() {
    const { profile: user } = useAuthStore();
    const { setSelectedDocId } = useDocumentStore();
    const { previewVersion } = useVersionStore((state: any) => ({
        previewVersion: state.previewVersion
    }));

    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setSelectedDocId(selectedDoc?.id || null);
    }, [selectedDoc, setSelectedDocId]);

    // Upload state
    const [uploadType, setUploadType] = useState<'pdf' | 'word' | 'gdoc' | 'editor'>('editor');
    const [uploadTitle, setUploadTitle] = useState('');
    const [gdocUrl, setGdocUrl] = useState('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    useEffect(() => {
        fetchDocs();
    }, []);

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
                status: 'active'
            };

            const { data, error } = await supabase.from('documents').insert(newDoc).select().single();
            if (error) throw error;

            setUploadTitle('');
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
        // Simulate AI processing delay
        await new Promise(r => setTimeout(r, 2000));
        const aiData = {
            curso: 'Taller',
            grado: '3ro',
            anio: '2026',
            carga_horaria: '4hs semanales',
            tematica: 'Instalaciones Eléctricas Básicas',
            num_clase: '1',
            recursos: 'Cables, Pelacables, Destornilladores, Tablero de pruebas'
        };
        try {
            const { data, error } = await supabase.from('documents').update(aiData).eq('id', selectedDoc.id).select().single();
            if (error) throw error;
            setSelectedDoc(data);
            alert('¡Escaneo IA completado!');
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

    const canCreateDocument = user?.role === 'admin' || user?.role === 'titular';
    const canEditSelected = selectedDoc ? (user?.role === 'admin' || (user?.role === 'titular' && selectedDoc.author_id === user?.id)) : false;

    return (
        <div className={styles.centerContainer}>
            <div className={styles.docListSidebar}>
                <h3>Planificaciones Activas</h3>
                <ul>
                    {documents.map(d => (
                        <li key={d.id}
                            className={selectedDoc?.id === d.id ? styles.activeDoc : ''}
                            onClick={() => setSelectedDoc(d)}
                        >
                            <span className={styles.docTitle}>{d.title}</span>
                            <span className={styles.docMeta}>{d.file_type.toUpperCase()}</span>
                        </li>
                    ))}
                    {documents.length === 0 && <li className={styles.emptyLi}>No hay documentos.</li>}
                </ul>

                {canCreateDocument && (
                    <div className={styles.uploadSection}>
                        <h4>Subir Nuevo Documento</h4>
                        <input
                            type="text"
                            placeholder="Título"
                            value={uploadTitle}
                            onChange={e => setUploadTitle(e.target.value)}
                        />
                        <select value={uploadType} onChange={(e: any) => setUploadType(e.target.value)}>
                            <option value="editor">Editor de Texto</option>
                            <option value="word">Word (.docx)</option>
                            <option value="pdf">Documento PDF</option>
                            <option value="gdoc">Google Docs Link</option>
                        </select>

                        {(uploadType === 'word' || uploadType === 'pdf') && (
                            <input type="file" accept={uploadType === 'word' ? ".docx" : ".pdf"} onChange={handleFileUploadChange} />
                        )}

                        {uploadType === 'gdoc' && (
                            <input type="url" placeholder="URL de Google Docs" value={gdocUrl} onChange={e => setGdocUrl(e.target.value)} />
                        )}

                        <button className={styles.btnPrimary} onClick={handleSaveDocument} disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar y Publicar'}
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
                                {selectedDoc.curso && (
                                    <div className={styles.aiMetadata}>
                                        <span className={styles.badge}>Curso: {selectedDoc.curso}</span>
                                        <span className={styles.badge}>Grado: {selectedDoc.grado} {selectedDoc.anio}</span>
                                        <span className={styles.badge}>Clase N°: {selectedDoc.num_clase}</span>
                                        <p style={{ marginTop: 8, fontSize: '0.85rem' }}><strong>Temática:</strong> {selectedDoc.tematica} | <strong>Carga:</strong> {selectedDoc.carga_horaria}</p>
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
                        <p>Seleccione un documento del menú izquierdo o cargue uno nuevo.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
