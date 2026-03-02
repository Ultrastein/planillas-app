import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDocumentStore } from '../../store/useDocumentStore';
import { supabase } from '../../lib/supabase';
import { useVersionStore } from '../../store/useVersionStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { RichTextEditor } from './RichTextEditor';
import styles from './DocumentEditor.module.css';
import * as mammoth from 'mammoth';
import { Folder, FolderOpen, Plus, FileText, Search, X, ArrowLeft } from 'lucide-react';

export function DocumentEditor() {
    const { profile: user } = useAuthStore();
    const { setSelectedDocId } = useDocumentStore();
    const previewVersion = useVersionStore((state: any) => state.previewVersion);

    const { categories, fetchCategories } = useCategoryStore();

    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [filterGrado, setFilterGrado] = useState<string>('');
    const [filterHoras, setFilterHoras] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [showNewCatInput, setShowNewCatInput] = useState(false);
    const [newCatName, setNewCatName] = useState('');

    // New States for Grid Layout
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Reset internal filters when category changes
    useEffect(() => {
        setFilterGrado('');
        setFilterHoras('');
        setSearchQuery('');
    }, [selectedCategory]);

    // Bug Fix: Clear selected doc if it doesn't belong to the newly filtered list
    useEffect(() => {
        if (!selectedDoc) return;
        const matchesCategory = selectedCategory ? (selectedDoc.tematica === selectedCategory || (!selectedDoc.tematica && selectedCategory === 'Sin Categorizar')) : true;
        const matchesGrado = filterGrado ? selectedDoc.grado === filterGrado : true;
        const matchesHoras = filterHoras ? selectedDoc.carga_horaria === filterHoras : true;

        if (!(matchesCategory && matchesGrado && matchesHoras)) {
            setSelectedDoc(null);
        }
    }, [selectedCategory, filterGrado, filterHoras, selectedDoc]);

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
    const [pendingChainFromDocId, setPendingChainFromDocId] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // New states for admin author change and comments
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [newCommentText, setNewCommentText] = useState('');

    useEffect(() => {
        fetchDocs();
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchAllUsers();
        }
    }, [user?.role]);

    useEffect(() => {
        if (selectedDoc) {
            fetchComments();
        } else {
            setComments([]);
        }
    }, [selectedDoc?.id]);

    const fetchAllUsers = async () => {
        try {
            const { data, error } = await supabase.from('users').select('*');
            if (!error && data) setAllUsers(data);
        } catch (err) {
            console.error("Error fetching users", err);
        }
    };

    const fetchComments = async () => {
        if (!selectedDoc) return;
        try {
            const { data, error } = await supabase.from('comments').select('*').eq('document_id', selectedDoc.id).order('created_at', { ascending: true });
            if (!error && data) setComments(data);
        } catch (err) {
            console.error("Error fetching comments", err);
        }
    };

    const fetchDocs = async () => {
        try {
            const { data, error } = await supabase.from('documents').select('*').eq('status', 'active');
            if (error) throw error;
            setDocuments(data || []);

            if (selectedDoc && !data?.find(d => d.id === selectedDoc.id)) {
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
            setIsCreating(false); // Close Modal

            await fetchDocs();
            setSelectedDoc(data);

            // If the user was trying to chain a class, link the previous document to this new one
            if (pendingChainFromDocId) {
                await handleUpdateNextClass(pendingChainFromDocId, data.id);
                setPendingChainFromDocId(null);
            }
        } catch (err: any) {
            alert('Error al guardar documento: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNextClassQuickAction = () => {
        if (!selectedDoc) return;
        setUploadCategory(selectedDoc.tematica || '');
        setPendingChainFromDocId(selectedDoc.id);

        let nextNumber = 2;
        if (selectedDoc.num_clase) {
            const parsed = parseInt(selectedDoc.num_clase);
            if (!isNaN(parsed)) nextNumber = parsed + 1;
        }

        setUploadTitle(`${selectedDoc.title} (Clase ${nextNumber})`);
        setIsCreating(true);
    };

    const handleDelete = async (docId: string) => {
        const confirmDelete = window.confirm("El archivo será borrado y desaparecerá de la vista. ¿Deseas continuar?");
        if (!confirmDelete) return;

        try {
            const { error } = await supabase
                .from('documents')
                .update({ status: 'deleted', delete_reason: 'Eliminado por el usuario' })
                .eq('id', docId);

            if (error) throw error;

            setSelectedDoc(null);
            setHasUnsavedChanges(false);
            fetchDocs();
        } catch (err: any) {
            alert('Error eliminando: ' + err.message);
        }
    };

    const handleEmptyTrash = async () => {
        const confirmEmpty = window.confirm("¿Estás completamente seguro de vaciar la papelera? Esto eliminará permanentemente todas las planificaciones borradas y no se pueden recuperar.");
        if (!confirmEmpty) return;

        setLoading(true);
        try {
            // WORKAROUND FOR FOREIGN KEY CONSTRAINT: Delete children via API first
            // 1. Get all deleted docs
            const { data: deletedDocs, error: fetchError } = await supabase
                .from('documents')
                .select('id')
                .eq('status', 'deleted');

            if (fetchError) throw fetchError;

            if (deletedDocs && deletedDocs.length > 0) {
                const deletedIds = deletedDocs.map(d => d.id);

                // 2. Delete all comments & versions for these docs
                await supabase.from('comments').delete().in('document_id', deletedIds);
                await supabase.from('document_versions').delete().in('document_id', deletedIds);

                // 3. Finally, delete the actual documents
                const { error: deleteError } = await supabase.from('documents').delete().in('id', deletedIds);
                if (deleteError) throw deleteError;

                alert("Papelera vaciada correctamente.");
            } else {
                alert("La papelera ya está vacía.");
            }

            fetchDocs();
        } catch (err: any) {
            alert('Error vaciando la papelera: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCategory = async (docId: string, newCategory: string) => {
        try {
            const { error } = await supabase.from('documents').update({ tematica: newCategory || null }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, tematica: newCategory || null } : prev);
            setHasUnsavedChanges(true);
            fetchDocs();
        } catch (err: any) {
            alert('Error al actualizar temática: ' + err.message);
        }
    };

    const handleUpdateNextClass = async (docId: string, nextClassId: string | null) => {
        try {
            const { error } = await supabase.from('documents').update({ next_class_id: nextClassId || null }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, next_class_id: nextClassId || null } : prev);
            setHasUnsavedChanges(true);
            fetchDocs();
        } catch (err: any) {
            console.error('Error al guardar siguiente clase:', err);
            // Ignore strict table schema warnings if the column doesn't exist yet, just notify user
            alert('Aviso: Asegúrese de que la columna "next_class_id" (tipo UUID) existe en la tabla documents de Supabase. Err: ' + err.message);
        }
    };

    const handleUpdateNumClase = async (docId: string, newNum: string) => {
        try {
            const { error } = await supabase.from('documents').update({ num_clase: newNum || null }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, num_clase: newNum || null } : prev);
            setHasUnsavedChanges(true);
            fetchDocs();
        } catch (err: any) {
            alert('Error al guardar número de clase: ' + err.message);
        }
    };

    const handleAutoSave = async (docId: string, newContent: string) => {
        try {
            const { error } = await supabase.from('documents').update({ content: newContent }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, content: newContent } : prev);
            setHasUnsavedChanges(true);
        } catch (err) {
            console.error('Error auto-saving:', err);
        }
    };

    const handleUpdateRecursos = async (docId: string, newRecursos: string) => {
        try {
            const { error } = await supabase.from('documents').update({ recursos: newRecursos }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, recursos: newRecursos } : prev);
            setHasUnsavedChanges(true);
        } catch (err) {
            console.error('Error updating recursos:', err);
        }
    };

    const handleUpdateAuthor = async (docId: string, newAuthorId: string) => {
        const newUser = allUsers.find(u => u.id === newAuthorId);
        if (!newUser) return;
        try {
            const updates = { author_id: newUser.id, author_name: newUser.name, author_role: newUser.role };
            const { error } = await supabase.from('documents').update(updates).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, ...updates } : prev);
            setHasUnsavedChanges(true);
            fetchDocs();
        } catch (err: any) {
            alert('Error al actualizar docente: ' + err.message);
        }
    };

    const handleAddComment = async () => {
        if (!newCommentText.trim() || !user || !selectedDoc) return;
        try {
            const { error } = await supabase.from('comments').insert({
                document_id: selectedDoc.id,
                author_id: user.id,
                author_name: user.name,
                text: newCommentText.trim()
            });
            if (error) {
                // Ignore schema warnings if table is missing, but notify user
                alert('Aviso conectando comentarios. Err: ' + error.message);
                return;
            }
            setNewCommentText('');
            fetchComments();
        } catch (err: any) {
            console.error('Error adding comment:', err);
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

    const filteredDocs = documents.filter(d => {
        const matchesCategory = selectedCategory ? (d.tematica === selectedCategory || (!d.tematica && selectedCategory === 'Sin Categorizar')) : true;
        const matchesGrado = filterGrado ? d.grado === filterGrado : true;
        const matchesHoras = filterHoras ? d.carga_horaria === filterHoras : true;
        const matchesSearch = searchQuery ?
            (d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.author_name.toLowerCase().includes(searchQuery.toLowerCase()))
            : true;

        return matchesCategory && matchesGrado && matchesHoras && matchesSearch;
    });

    // Derive dynamic filter options based on the currently viewed category
    const categoryDocs = selectedCategory
        ? documents.filter(d => d.tematica === selectedCategory || (!d.tematica && selectedCategory === 'Sin Categorizar'))
        : documents;

    const uniqueGrados = Array.from(new Set(categoryDocs.map(d => d.grado).filter(Boolean)));
    const uniqueHoras = Array.from(new Set(categoryDocs.map(d => d.carga_horaria).filter(Boolean)));

    return (
        <div className={styles.centerContainer}>
            {/* GOOGLE DRIVE STYLE HEADER: Horizontally scrollable folders row */}
            <div className={styles.topFolderRow}>
                <div className={styles.folderRowHeader}>
                    <h3>Carpetas de Planificación</h3>
                    {canCreateDocument && (
                        <button className={styles.closeBtn} onClick={() => setShowNewCatInput(!showNewCatInput)} title="Nueva Carpeta">
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
                {!selectedDoc ? (
                    // DASHBOARD GRID VIEW
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className={styles.searchFilterArea}>
                            <div className={styles.searchHeaderRow}>
                                <div className={styles.searchInputWrapper}>
                                    <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        className={styles.searchInput}
                                        placeholder="Buscar por palabra clave, título o profesor..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ paddingLeft: '44px' }}
                                    />
                                </div>
                                {canCreateDocument && (
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        {user?.role === 'admin' && (
                                            <button className={styles.btnDanger} onClick={handleEmptyTrash} disabled={loading} style={{ padding: '12px 16px', fontSize: '0.9rem' }} title="Eliminar permanentemente los documentos borrados">
                                                Vaciar Papelera
                                            </button>
                                        )}
                                        <button className={styles.btnPrimary} onClick={() => setIsCreating(true)} style={{ padding: '12px 24px', fontSize: '1rem' }}>
                                            + Nueva Clase
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Dropdown Filters beneath search */}
                            {(uniqueGrados.length > 0 || uniqueHoras.length > 0) && (
                                <div className={styles.filtersRow}>
                                    {uniqueGrados.length > 0 && (
                                        <select
                                            value={filterGrado}
                                            onChange={(e) => setFilterGrado(e.target.value)}
                                            className={styles.filterSelect}
                                        >
                                            <option value="">Todos los Años (Grados)</option>
                                            {uniqueGrados.map((g: any) => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    )}
                                    {uniqueHoras.length > 0 && (
                                        <select
                                            value={filterHoras}
                                            onChange={(e) => setFilterHoras(e.target.value)}
                                            className={styles.filterSelect}
                                        >
                                            <option value="">Todas las Duraciones</option>
                                            {uniqueHoras.map((h: any) => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.docsGridContainer}>
                            <div className={styles.docsGrid}>
                                {filteredDocs.map(d => (
                                    <div key={d.id} className={styles.docCard} onClick={() => setSelectedDoc(d)} style={{ cursor: 'pointer', position: 'relative' }}>
                                        <div className={styles.cardHeader}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {d.tematica ? (
                                                    <span className={styles.cardBadge} style={{ backgroundColor: 'var(--primary-color)' }}>
                                                        {d.tematica}
                                                    </span>
                                                ) : (
                                                    <span className={styles.cardBadge} style={{ backgroundColor: '#94a3b8' }}>
                                                        Sin Categorizar
                                                    </span>
                                                )}
                                                {/* Indicates chained class visually on the card */}
                                                {(d.next_class_id || d.num_clase) && (
                                                    <span className={styles.cardBadge} style={{ backgroundColor: '#3b82f6', fontSize: '0.7rem' }}>
                                                        Clase {d.num_clase || '?'} 🔗
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <h4 className={styles.cardTitle}>{d.title}</h4>
                                        <div className={styles.cardMeta}>
                                            <span><strong>Profe:</strong> {d.author_name}</span>
                                            {d.curso && <span><strong>Año:</strong> {d.grado} {d.anio}</span>}
                                            {d.carga_horaria && <span><strong>Duración:</strong> {d.carga_horaria}</span>}
                                        </div>
                                        <div className={styles.cardAction}>
                                            Abrir clase &rarr;
                                        </div>
                                    </div>
                                ))}
                                {filteredDocs.length === 0 && (
                                    <div className={styles.emptyState}>
                                        {searchQuery ? "No se encontraron coincidencias para tu búsqueda." : "No hay planificaciones en esta categoría."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // DOCUMENT VIEWER VIEW
                    <div className={styles.viewerArea}>
                        {selectedDoc ? (
                            <>
                                <div className={styles.docRibbon}>
                                    <div style={{ flex: 1, paddingRight: '40px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h2>{selectedDoc.title}</h2>
                                            <button
                                                className={hasUnsavedChanges ? styles.btnPrimary : styles.btnSecondary}
                                                onClick={() => {
                                                    setSelectedDoc(null);
                                                    setHasUnsavedChanges(false);
                                                }}
                                                style={{ margin: 0, padding: '8px 20px', borderRadius: '8px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                title={hasUnsavedChanges ? "Guarda los cambios y vuelve al inicio" : "Cerrar documento"}
                                            >
                                                {hasUnsavedChanges ? "Guardar y Cerrar *" : "Cerrar"} <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                            <p style={{ margin: 0 }}><strong>Autor:</strong></p>
                                            {user?.role === 'admin' ? (
                                                <select
                                                    value={selectedDoc.author_id}
                                                    onChange={(e) => handleUpdateAuthor(selectedDoc.id, e.target.value)}
                                                    style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                                                    title="Cambiar el docente asignado a esta clase (solo Admins)"
                                                >
                                                    {allUsers.map((u) => (
                                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p style={{ margin: 0 }}>{selectedDoc.author_name}</p>
                                            )}
                                            <p style={{ margin: 0, marginLeft: '8px' }}>| <strong>Rol:</strong> {selectedDoc.author_role} | <strong>Fecha:</strong> {new Date(selectedDoc.created_at).toLocaleString()}</p>
                                        </div>

                                        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Clase Siguiente:</span>
                                                {canEditSelected ? (
                                                    <select
                                                        value={selectedDoc.next_class_id || ''}
                                                        onChange={(e) => handleUpdateNextClass(selectedDoc.id, e.target.value)}
                                                        style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem', backgroundColor: '#f8fafc', maxWidth: '200px' }}
                                                    >
                                                        <option value="">-- Sin Encadenar --</option>
                                                        {documents
                                                            .filter(d => (d.tematica === selectedDoc.tematica || (!d.tematica && !selectedDoc.tematica)) && d.id !== selectedDoc.id)
                                                            .map(d => <option key={d.id} value={d.id}>{d.title} (Clase n° {d.num_clase || '?'})</option>)
                                                        }
                                                    </select>
                                                ) : (
                                                    <span style={{ fontSize: '0.85rem' }}>{documents.find(d => d.id === selectedDoc.next_class_id)?.title || 'Ninguna'}</span>
                                                )}

                                                <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                                                    {documents.some(d => d.next_class_id === selectedDoc.id) && (
                                                        <button
                                                            onClick={() => setSelectedDoc(documents.find(d => d.next_class_id === selectedDoc.id))}
                                                            style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            title="Ir a la clase anterior encadenada"
                                                        >
                                                            &larr; Clase Anterior
                                                        </button>
                                                    )}
                                                    {selectedDoc.next_class_id && (
                                                        <button
                                                            onClick={() => setSelectedDoc(documents.find(d => d.id === selectedDoc.next_class_id))}
                                                            style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            title="Ir directamente a la siguiente clase encadenada"
                                                        >
                                                            Siguiente Clase &rarr;
                                                        </button>
                                                    )}
                                                    {(selectedDoc.next_class_id || documents.some(d => d.next_class_id === selectedDoc.id)) && (
                                                        <button
                                                            onClick={async () => {
                                                                // Temporarily view only documents in this chain
                                                                const categoryId = selectedDoc.tematica || 'Sin Categorizar';
                                                                if (selectedCategory !== categoryId) setSelectedCategory(categoryId);

                                                                // Provide clear visual feedback since it filters via search conceptually
                                                                // We use the category filter along with a search hint
                                                                // This is a simplified "view all" by filtering the view to the current category.
                                                                alert('Viendo todas las clases de la temática: ' + categoryId + '. Vuelve a seleccionar la carpeta "Todas" para quitar el filtro.');
                                                                setSelectedDoc(null);
                                                            }}
                                                            style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#e2e8f0', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            title="Ver todas las clases de esta temática en la cuadrícula"
                                                        >
                                                            Ver toda la temática
                                                        </button>
                                                    )}
                                                    {!selectedDoc.next_class_id && canEditSelected && (
                                                        <button
                                                            onClick={handleCreateNextClassQuickAction}
                                                            style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#dbeafe', color: 'var(--primary-hover)', border: '1px solid currentColor', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            title="Crear una nueva clase conectada a esta"
                                                        >
                                                            <Plus size={14} /> Añadir Siguiente Clase
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {selectedDoc.curso && (
                                            <div className={styles.aiMetadata} style={{ marginTop: '16px' }}>
                                                <span className={styles.badge}>Curso: {selectedDoc.curso}</span>
                                                <span className={styles.badge}>Grado: {selectedDoc.grado} {selectedDoc.anio}</span>

                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }} className={styles.badge}>
                                                    <span>Clase N°: </span>
                                                    {canEditSelected ? (
                                                        <input
                                                            type="text"
                                                            value={selectedDoc.num_clase || ''}
                                                            onChange={(e) => setSelectedDoc({ ...selectedDoc, num_clase: e.target.value })}
                                                            onBlur={(e) => handleUpdateNumClase(selectedDoc.id, e.target.value)}
                                                            style={{ width: '40px', padding: '2px 4px', fontSize: 'inherit', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white' }}
                                                            title="Escribe y haz click fuera para guardar"
                                                        />
                                                    ) : (
                                                        <span>{selectedDoc.num_clase || '?'}</span>
                                                    )}
                                                </div>

                                                <p style={{ marginTop: 8, fontSize: '0.85rem' }}><strong>Carga Horaria:</strong> {selectedDoc.carga_horaria}</p>

                                                <div style={{ marginTop: 8 }}>
                                                    <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>Materiales y Recursos Sugeridos:</p>
                                                    {canEditSelected ? (
                                                        <textarea
                                                            value={selectedDoc.recursos || ''}
                                                            onChange={(e) => {
                                                                // Optimistic UI Update Let's not hit DB on every keystroke, handle blur instead
                                                                setSelectedDoc({ ...selectedDoc, recursos: e.target.value });
                                                            }}
                                                            onBlur={(e) => handleUpdateRecursos(selectedDoc.id, e.target.value)}
                                                            style={{ width: '100%', minHeight: '60px', padding: '8px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: '#fff', resize: 'vertical' }}
                                                            placeholder="Escribe aquí los recursos necesarios..."
                                                        />
                                                    ) : (
                                                        <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                                            {selectedDoc.recursos || 'No hay recursos especificados.'}
                                                        </p>
                                                    )}
                                                </div>
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

                                {/* COMMENTS SECTION */}
                                <div className={styles.commentsContainer}>
                                    <h4 style={{ marginBottom: '16px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Comentarios y Sugerencias</h4>
                                    <div className={styles.commentsList}>
                                        {comments.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Aún no hay comentarios. Sé el primero en opinar.</p>
                                        ) : (
                                            comments.map(comment => (
                                                <div key={comment.id} className={styles.commentItem}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <strong>{comment.author_name}</strong>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(comment.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{comment.text}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className={styles.addCommentBox}>
                                        <textarea
                                            value={newCommentText}
                                            onChange={(e) => setNewCommentText(e.target.value)}
                                            placeholder="Escribe un comentario o sugerencia sobre esta clase..."
                                            style={{ width: '100%', minHeight: '60px', padding: '10px', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', resize: 'vertical' }}
                                        />
                                        <button
                                            className={styles.btnPrimary}
                                            style={{ alignSelf: 'flex-end', marginTop: '8px' }}
                                            onClick={handleAddComment}
                                            disabled={!newCommentText.trim()}
                                        >
                                            Publicar Comentario
                                        </button>
                                    </div>
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
                )}
            </div>

            {/* FLOATING CREATION MODAL */}
            {isCreating && (
                <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setIsCreating(false); }}>
                    <div className={styles.uploadModal}>
                        <div className={styles.modalHeader}>
                            <h2>Nueva Clase</h2>
                            <button className={styles.closeBtn} onClick={() => setIsCreating(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.uploadSection}>
                            <input
                                type="text"
                                placeholder="Título de la clase o material"
                                value={uploadTitle}
                                onChange={e => setUploadTitle(e.target.value)}
                                autoFocus
                            />
                            <select value={uploadType} onChange={(e: any) => setUploadType(e.target.value)}>
                                <option value="editor">Editor de Texto Integrado</option>
                                <option value="word">Documento Word (.docx)</option>
                                <option value="pdf">Archivo PDF</option>
                                <option value="gdoc">Enlace Google Docs</option>
                            </select>

                            <select value={uploadCategory} onChange={(e: any) => setUploadCategory(e.target.value)}>
                                <option value="">-- Sin Temática --</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>

                            {(uploadType === 'word' || uploadType === 'pdf') && (
                                <input type="file" accept={uploadType === 'word' ? ".docx" : ".pdf"} onChange={handleFileUploadChange} />
                            )}

                            {uploadType === 'gdoc' && (
                                <input type="url" placeholder="URL de Google Docs Pública" value={gdocUrl} onChange={e => setGdocUrl(e.target.value)} />
                            )}

                            <button className={styles.btnPrimary} onClick={handleSaveDocument} disabled={loading} style={{ marginTop: 12, padding: '12px' }}>
                                {loading ? 'Subiendo...' : 'Crear y Publicar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
