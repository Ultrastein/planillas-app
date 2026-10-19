import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDocumentStore } from '../../store/useDocumentStore';
import { supabase } from '../../lib/supabase';
import { useVersionStore } from '../../store/useVersionStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { RichTextEditor } from './RichTextEditor';
import styles from './DocumentEditor.module.css';
import * as mammoth from 'mammoth';
import { Plus, Search, X, ArrowLeft, ArrowRight, Maximize2, Minimize2, Copy, Check, Link2, Upload, Trash2, Printer, Sparkles, Save, LayoutGrid } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useToast } from '../../components/Toast/useToast';
import { QUICK_TEMPLATES } from '../../data/templates';
import { getCategoryColor } from '../../lib/categoryColors';

export function DocumentEditor() {
    const { profile: user } = useAuthStore();
    const { showToast } = useToast();
    const {
        selectedDoc,
        setSelectedDoc,
        setSelectedDocId,
        setAllDocuments,
        pendingCreateFromAI,
        setPendingCreateFromAI,
        pendingReplacement,
        setPendingReplacement,
        setEditorSelection,
        selectedCategory,
        setSelectedCategory,
    } = useDocumentStore();
    const previewVersion = useVersionStore((state: any) => state.previewVersion);

    const { categories } = useCategoryStore();

    const [documents, setDocuments] = useState<any[]>([]);
    const [filterGrado, setFilterGrado] = useState<string>('');
    const [filterHoras, setFilterHoras] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [creationNumClase, setCreationNumClase] = useState(''); // New State for Creation Modal Class Number

    // New States for Grid Layout
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [bulkImportJson, setBulkImportJson] = useState('');

    // Reset internal filters when category changes
    useEffect(() => {
        setFilterGrado('');
        setFilterHoras('');
        setSearchQuery('');
        setChainViewNodeId(null);
    }, [selectedCategory]);

    // Bug Fix: Clear selected doc if it doesn't belong to the newly filtered list
    useEffect(() => {
        if (!selectedDoc) return;
        const matchesCategory = selectedCategory ? (selectedDoc.tematica === selectedCategory || (!selectedDoc.tematica && selectedCategory === 'Sin Categorizar')) : true;
        const matchesGrado = filterGrado ? selectedDoc.grado?.split(',').map((s: string) => s.trim()).includes(filterGrado) : true;
        const matchesHoras = filterHoras ? selectedDoc.carga_horaria === filterHoras : true;

        if (!(matchesCategory && matchesGrado && matchesHoras)) {
            setSelectedDoc(null);
        }
    }, [selectedCategory, filterGrado, filterHoras, selectedDoc]);

    useEffect(() => {
        setSelectedDocId(selectedDoc?.id || null);
    }, [selectedDoc, setSelectedDocId]);

    // Sync allDocuments to store so AiSidebar has multi-doc chat context
    useEffect(() => {
        setAllDocuments(documents);
    }, [documents]);

    // Handle AI-generated document creation
    useEffect(() => {
        if (pendingCreateFromAI) {
            handleSaveDocumentFromAI(pendingCreateFromAI);
        }
    }, [pendingCreateFromAI]);

    // Apply AI text replacement when AiSidebar sends improved text
    useEffect(() => {
        if (pendingReplacement) {
            setPendingReplace(pendingReplacement);
        }
    }, [pendingReplacement]);

    // Reset content ref when switching documents so we have a baseline for change detection
    useEffect(() => {
        lastHandledContentRef.current = selectedDoc?.content;
    }, [selectedDoc?.id]);

    // Detect when AiSidebar inserted content at end of doc (rubric/activities)
    useEffect(() => {
        if (!selectedDoc || lastHandledContentRef.current === undefined) return;
        if (selectedDoc.content !== lastHandledContentRef.current) {
            handleAutoSave(selectedDoc.id, selectedDoc.content);
            lastHandledContentRef.current = selectedDoc.content;
        }
    }, [selectedDoc?.content]);

    // Upload state
    const [uploadType, setUploadType] = useState<'pdf' | 'word' | 'gdoc' | 'editor'>('editor');
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadCategory, setUploadCategory] = useState('');
    const [uploadTags, setUploadTags] = useState(''); // New state for Tags
    const [gdocUrl, setGdocUrl] = useState('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [pendingChainFromDocId, setPendingChainFromDocId] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

    // New states for admin author change and comments
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [chainViewNodeId, setChainViewNodeId] = useState<string | null>(null);
    const lastHandledContentRef = useRef<string | null | undefined>(undefined);
    const [pendingReplace, setPendingReplace] = useState<{ text: string; from: number; to: number } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        confirmLabel: string;
        onConfirm: () => void;
    } | null>(null);

    useEffect(() => {
        fetchDocs();
    }, []);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchAllUsers();
        }
    }, [user?.role]);

    const fetchAllUsers = async () => {
        try {
            const { data, error } = await supabase.from('users').select('*');
            if (!error && data) setAllUsers(data);
        } catch (err) {
            console.error("Error fetching users", err);
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
                    showToast('Error leyendo el archivo Word para previsualización', 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleSaveDocument = async () => {
        if (!user || !uploadTitle) { showToast('Se requiere un título.', 'warning'); return; }

        setLoading(true);
        try {
            let file_url = gdocUrl;
            let content = uploadType === 'word' || uploadType === 'editor' ? fileContent : null;

            // Generate content from AI template if selected
            if (selectedTemplate && uploadType === 'editor') {
                const template = QUICK_TEMPLATES.find(t => t.id === selectedTemplate);
                if (template) {
                    try {
                        const { generateFullPlan } = await import('../ai/aiService');
                        const description = template.prompt + (uploadTitle ? ` Título específico: "${uploadTitle}".` : '');
                        const generated = await generateFullPlan(description);
                        if (!uploadTitle) setUploadTitle(generated.title);
                        content = generated.content;
                    } catch (e) {
                        showToast('No se pudo generar con IA, se creará sin contenido.', 'warning');
                    }
                }
            }

            if (!content && uploadType === 'editor') {
                content = null; // Leave blank, content will be edited in the editor
            }

            // --- Duplicate Check Start ---
            // Fetch all active documents for duplicate comparison
            const { data: existingDocs, error: fetchDocsError } = await supabase
                .from('documents')
                .select('*') // Changed to select all so we can load the full doc
                .eq('status', 'active');

            if (fetchDocsError) throw fetchDocsError;

            // Check if title already exists
            const duplicateByTitle = existingDocs?.find(doc =>
                doc.title.trim().toLowerCase() === uploadTitle.trim().toLowerCase() &&
                (doc.num_clase || '') === (creationNumClase || '')
            );
            if (duplicateByTitle) {
                setLoading(false);
                setIsCreating(false);
                setSelectedTemplate(null);
                setSelectedDoc(duplicateByTitle);
                showToast('Ya existe un documento con este título. Te hemos redirigido a la planilla existente.', 'warning'); return;
            }

            // Check if content already exists (only for non-empty, non-trivial content)
            if (content && content.trim() !== '' && content.trim().length > 30) {
                const duplicateByContent = existingDocs?.find(doc => {
                    if (!doc.content) return false;
                    if (doc.content.trim().length < 30) return false; // skip short/placeholder content
                    return doc.content.trim() === content?.trim();
                });

                if (duplicateByContent) {
                    setLoading(false);
                    setIsCreating(false);
                    setSelectedTemplate(null);
                    setSelectedDoc(duplicateByContent);
                    showToast('Ya existe un documento con este mismo contenido. Te hemos redirigido a la planilla existente.', 'warning'); return;
                }
            }

            // Check if URL already exists (for Google Docs links)
            if (uploadType === 'gdoc' && file_url && file_url.trim() !== '') {
                const duplicateByUrl = existingDocs?.find(doc =>
                    doc.file_type === 'gdoc' &&
                    doc.file_url &&
                    doc.file_url.trim() === file_url.trim()
                );

                if (duplicateByUrl) {
                    setLoading(false);
                    setIsCreating(false);
                    setSelectedTemplate(null);
                    setSelectedDoc(duplicateByUrl);
                    showToast('Ya existe un documento con este mismo enlace. Te hemos redirigido a la planilla existente.', 'warning'); return;
                }
            }
            // --- Duplicate Check End ---

            // Upload physical file if it's PDF or Word
            if (uploadFile && (uploadType === 'pdf' || uploadType === 'word')) {
                try {
                    console.log("Starting file upload to storage...");
                    const fileExt = uploadFile.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                    const filePath = `archivos/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('planillas_archivos')
                        .upload(filePath, uploadFile);

                    if (uploadError) {
                        console.error("Storage upload error:", uploadError);
                        throw new Error(`Storage error: ${uploadError.message}`);
                    }

                    const { data: publicUrlData } = supabase.storage
                        .from('planillas_archivos')
                        .getPublicUrl(filePath);

                    file_url = publicUrlData.publicUrl;
                    console.log("File uploaded, url:", file_url);
                } catch (e: any) {
                    console.error("Exception during file upload step:", e);
                    throw new Error(`Error subiendo archivo: ${e.message}`);
                }
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
                num_clase: creationNumClase || null, // Guardar el número de clase inicial
                etiquetas: uploadTags || null, // Guardar las etiquetas insertadas
                status: 'active'
            };

            console.log("Doing insert to documents table...", newDoc);
            const { data, error } = await supabase.from('documents').insert(newDoc).select().single();
            if (error) {
                console.error("Database insert error:", error);
                throw new Error(`DB Insert Error: ${error.message}`);
            }

            console.log("Document inserted, id:", data.id);
            if (creationNumClase) {
                // Determine if we need to shift other classes for the newly inserted document
                await handleClassNumberShift(data.id, uploadCategory, uploadTitle, creationNumClase);
            }

            setUploadTitle('');
            setUploadCategory('');
            setUploadTags(''); // Cleanup tags
            setCreationNumClase(''); // Cleanup
            setFileContent(null);
            setUploadFile(null);
            setGdocUrl('');
            setSelectedTemplate(null);
            setIsCreating(false); // Close Modal

            await fetchDocs();
            setSelectedDoc(data);

            // If the user was trying to chain a class, link the previous document to this new one
            if (pendingChainFromDocId) {
                await handleUpdateNextClass(pendingChainFromDocId, data.id);
                setPendingChainFromDocId(null);
            }
        } catch (err: any) {
            console.error("Detailed handleSaveDocument error:", err);
            showToast('Error al guardar documento: ' + err.message, 'error');
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
            const parsed = parseFloat(selectedDoc.num_clase.replace(',', '.')); // Soporte comas o puntos
            if (!isNaN(parsed)) nextNumber = Math.floor(parsed) + 1; // Increment by 1 from floor value
        }

        setCreationNumClase(nextNumber.toString()); // Pre-fill number for immediate linking without user effort
        setUploadTitle(''); // Leave blank so user writes a distinct title for the new class
        setIsCreating(true);
    };

    const handleDelete = (docId: string) => {
        setConfirmModal({
            title: 'Eliminar planificación',
            message: 'El archivo será borrado y desaparecerá de la vista. Esta acción puede revertirse desde la papelera.',
            confirmLabel: 'Eliminar',
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    const { error } = await supabase
                        .from('documents')
                        .update({ status: 'deleted', delete_reason: 'Eliminado por el usuario' })
                        .eq('id', docId);
                    if (error) throw error;
                    setSelectedDoc(null);
                    fetchDocs();
                    showToast('Planificación eliminada.', 'success');
                } catch (err: any) {
                    showToast('Error eliminando: ' + err.message, 'error');
                }
            },
        });
    };

    const handleEmptyTrash = () => {
        setConfirmModal({
            title: 'Vaciar papelera',
            message: '¿Estás completamente seguro? Esto eliminará PERMANENTEMENTE todas las planificaciones borradas. No se pueden recuperar.',
            confirmLabel: 'Vaciar Papelera',
            onConfirm: async () => {
                setConfirmModal(null);
                setLoading(true);
                try {
                    const { data: deletedDocs, error: fetchError } = await supabase
                        .from('documents')
                        .select('id')
                        .eq('status', 'deleted');
                    if (fetchError) throw fetchError;
                    if (deletedDocs && deletedDocs.length > 0) {
                        const deletedIds = deletedDocs.map(d => d.id);
                        await supabase.from('comments').delete().in('document_id', deletedIds);
                        await supabase.from('document_versions').delete().in('document_id', deletedIds);
                        const { error: deleteError } = await supabase.from('documents').delete().in('id', deletedIds);
                        if (deleteError) throw deleteError;
                        showToast('Papelera vaciada correctamente.', 'success');
                    } else {
                        showToast('La papelera ya está vacía.', 'info');
                    }
                    fetchDocs();
                } catch (err: any) {
                    showToast('Error vaciando la papelera: ' + err.message, 'error');
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    const handleBulkImport = async () => {
        if (!bulkImportJson.trim() || !user) return;
        setLoading(true);
        try {
            const parsedData = JSON.parse(bulkImportJson);
            if (!Array.isArray(parsedData)) {
                throw new Error("El JSON debe ser un arreglo (Array) de objetos.");
            }

            const newDocs = parsedData.map(item => ({
                title: item.title || 'Clase sin título',
                author_id: user.id,
                author_name: user.name,
                author_role: user.role,
                file_type: 'editor',
                content: item.content || null,
                tematica: item.tematica || null,
                num_clase: item.num_clase ? String(item.num_clase) : null,
                etiquetas: item.etiquetas || null,
                curso: item.curso || null,
                grado: item.grado || null,
                anio: item.anio || null,
                carga_horaria: item.carga_horaria || null,
                recursos: item.recursos || null,
                status: 'active'
            }));

            const { error } = await supabase.from('documents').insert(newDocs);
            if (error) {
                console.error("Database insert error:", error);
                throw new Error(`DB Insert Error: ${error.message}`);
            }

            setBulkImportJson('');
            setShowBulkImport(false);
            await fetchDocs();
            showToast(`¡Se importaron ${newDocs.length} clases correctamente!`, 'success');
        } catch (err: any) {
            console.error("Detailed handleBulkImport error:", err);
            showToast('Error al importar JSON: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCategory = async (docId: string, newCategory: string) => {
        try {
            const { error } = await supabase.from('documents').update({ tematica: newCategory || null }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, tematica: newCategory || null } : prev);
            fetchDocs();
        } catch (err: any) {
            showToast('Error al actualizar temática: ' + err.message, 'error');
        }
    };

    const handleUpdateNextClass = async (docId: string, nextClassId: string | null) => {
        try {
            const { error } = await supabase.from('documents').update({ next_class_id: nextClassId || null }).eq('id', docId);
            if (error) throw error;

            // Si el documento seleccionado actualmente es el que se actualizó (raro pero posible)
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, next_class_id: nextClassId || null } : prev);

            // Actualizar arreglo local instantáneamente sin llamar a fetchDocs para evitar overwrites (race condition)
            setDocuments((prev: any[]) => prev.map(d => d.id === docId ? { ...d, next_class_id: nextClassId || null } : d));

        } catch (err: any) {
            console.error('Error al guardar siguiente clase:', err);
            showToast('No se pudo guardar el encadenado. Asegúrese de que la columna "next_class_id" existe en la tabla documents de Supabase. Err: ' + err.message, 'error');
        }
    };

    // Helper function for reusable shift logic (used in edit and create)
    const handleClassNumberShift = async (docIdToIgnore: string, tematica: string | null, ramaTitle: string, newNumStr: string) => {
        const parsedNewNum = parseFloat(newNumStr.replace(',', '.'));
        if (isNaN(parsedNewNum)) return;

        // Comprobamos si la nueva clase ocupará el número de una existente
        const existingSameNum = documents.find(d =>
            d.tematica === tematica &&
            d.title.trim().toLowerCase() === ramaTitle.trim().toLowerCase() &&
            d.id !== docIdToIgnore &&
            parseFloat(d.num_clase?.replace(',', '.') || 'NaN') === parsedNewNum
        );

        if (existingSameNum) {
            const shift = window.confirm(`Ya existe la clase ${parsedNewNum} en esta temática. ¿Deseas insertar esta clase aquí y mover las siguientes una posición hacia adelante?`);
            if (shift) {
                // Obtener todas las clases mayores o iguales
                const docsToShift = documents.filter(d =>
                    d.tematica === tematica &&
                    d.title.trim().toLowerCase() === ramaTitle.trim().toLowerCase() &&
                    d.id !== docIdToIgnore &&
                    parseFloat(d.num_clase?.replace(',', '.') || 'NaN') >= parsedNewNum
                );

                // Sort descending so we update the highest numbers first to avoid collisions
                docsToShift.sort((a, b) => {
                    const aNum = parseFloat(a.num_clase?.replace(',', '.') || '0');
                    const bNum = parseFloat(b.num_clase?.replace(',', '.') || '0');
                    return bNum - aNum;
                });

                for (const d of docsToShift) {
                    const oldVal = parseFloat(d.num_clase?.replace(',', '.') || '0');
                    // Desplazamos sumando 1
                    const shiftedNum = oldVal + 1;
                    await supabase.from('documents').update({ num_clase: shiftedNum.toString() }).eq('id', d.id);
                }
            }
        }
    };

    const handleUpdateNumClase = async (docId: string, newNum: string) => {
        try {
            const parsedNewNum = parseFloat(newNum.replace(',', '.'));
            if (!isNaN(parsedNewNum)) {
                const docToUpdate = documents.find(d => d.id === docId);
                const tematica = docToUpdate?.tematica || null;
                const ramaTitle = docToUpdate?.title || '';

                await handleClassNumberShift(docId, tematica, ramaTitle, newNum);
            }

            const { error } = await supabase.from('documents').update({ num_clase: newNum || null }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, num_clase: newNum || null } : prev);
            fetchDocs();
        } catch (err: any) {
            showToast('Error al guardar número de clase: ' + err.message, 'error');
        }
    };

    const handleUpdateMetadataField = async (docId: string, field: string, value: string) => {
        try {
            const { error } = await supabase.from('documents').update({ [field]: value || null }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, [field]: value || null } : prev);
            fetchDocs();
        } catch (err: any) {
            showToast(`Error al guardar ${field}: ` + err.message, 'error');
        }
    };

    const handleAutoSave = async (docId: string, newContent: string) => {
        try {
            const { error } = await supabase.from('documents').update({ content: newContent }).eq('id', docId);
            if (error) throw error;
            lastHandledContentRef.current = newContent;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, content: newContent } : prev);
        } catch (err) {
            console.error('Error auto-saving:', err);
        }
    };

    const handleUpdateRecursos = async (docId: string, newRecursos: string) => {
        try {
            const { error } = await supabase.from('documents').update({ recursos: newRecursos }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, recursos: newRecursos } : prev);
        } catch (err) {
            console.error('Error updating recursos:', err);
        }
    };

    const handleUpdateEtiquetas = async (docId: string, newEtiquetas: string) => {
        try {
            const { error } = await supabase.from('documents').update({ etiquetas: newEtiquetas }).eq('id', docId);
            if (error) throw error;
            setSelectedDoc((prev: any) => prev?.id === docId ? { ...prev, etiquetas: newEtiquetas } : prev);
        } catch (err) {
            console.error('Error updating etiquetas:', err);
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
            fetchDocs();
        } catch (err: any) {
            showToast('Error al actualizar docente: ' + err.message, 'error');
        }
    };

    const handleAIScan = async () => {
        if (!selectedDoc) return;
        setLoading(true);

        try {
            // Utilizamos el servicio AI para simular el análisis del texto
            const aiDataResponse = await import('../ai/aiService').then(m => m.analyzeDocumentContent(selectedDoc.content || '', selectedDoc.title || ''));
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
            showToast('¡Análisis IA completado y metadata detectada!', 'success');
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
            showToast('Versión guardada correctamente.', 'success');
        } catch (err: any) {
            showToast('Error al guardar versión: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = () => {
        if (!selectedDoc) return;
        const title = selectedDoc.title || 'Planificación';
        const author = selectedDoc.author_name || '';
        const date = new Date(selectedDoc.created_at).toLocaleDateString('es-AR');
        const content = selectedDoc.content || '<p>Sin contenido.</p>';

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('El navegador bloqueó la ventana emergente. Permitila para exportar a PDF.', 'warning');
            return;
        }

        printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 48px; max-width: 800px; margin: 0 auto; color: #1e293b; }
    h1 { font-size: 1.6rem; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 0.85rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 28px; }
    h2 { font-size: 1.15rem; margin-top: 24px; color: #334155; }
    ul, ol { padding-left: 22px; }
    li { margin-bottom: 4px; }
    p { line-height: 1.7; margin: 8px 0; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Autor: ${author} &nbsp;|&nbsp; Fecha: ${date}</div>
  ${content}
  <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 1000); };<\/script>
</body>
</html>`);
        printWindow.document.close();
    };

    const handleSaveDocumentFromAI = async (data: { title: string; content: string; metadata: any }) => {
        if (!user) return;
        setLoading(true);
        try {
            const newDoc = {
                title: data.title,
                author_id: user.id,
                author_name: user.name,
                author_role: user.role,
                file_type: 'editor',
                content: data.content,
                tematica: data.metadata?.tematica || null,
                num_clase: data.metadata?.num_clase || null,
                grado: data.metadata?.grado || null,
                anio: data.metadata?.anio || null,
                carga_horaria: data.metadata?.carga_horaria || null,
                curso: data.metadata?.curso || null,
                status: 'active',
            };
            const { data: inserted, error } = await supabase.from('documents').insert(newDoc).select().single();
            if (error) throw error;
            await fetchDocs();
            setSelectedDoc(inserted);
        } catch (err: any) {
            showToast('Error creando documento desde IA: ' + err.message, 'error');
        } finally {
            setLoading(false);
            setPendingCreateFromAI(null);
        }
    };

    const handleEditorSelectionChange = (text: string, from: number, to: number) => {
        setEditorSelection(text ? { text, from, to } : null);
    };

    const handleDuplicate = async () => {
        if (!selectedDoc || !user) return;
        setLoading(true);
        try {
            const duplicated = {
                title: `Copia de ${selectedDoc.title}`,
                author_id: user.id,
                author_name: user.name,
                author_role: user.role,
                file_type: selectedDoc.file_type,
                file_url: selectedDoc.file_type !== 'editor' ? selectedDoc.file_url : null,
                content: selectedDoc.content || null,
                tematica: selectedDoc.tematica || null,
                num_clase: null,
                etiquetas: selectedDoc.etiquetas || null,
                curso: selectedDoc.curso || null,
                grado: selectedDoc.grado || null,
                anio: selectedDoc.anio || null,
                carga_horaria: selectedDoc.carga_horaria || null,
                recursos: selectedDoc.recursos || null,
                next_class_id: null,
                status: 'active',
            };
            const { data, error } = await supabase.from('documents').insert(duplicated).select().single();
            if (error) throw error;
            await fetchDocs();
            setSelectedDoc(data);
            showToast('Clase duplicada correctamente.', 'success');
        } catch (err: any) {
            showToast('Error duplicando: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const canCreateDocument = user?.role === 'admin' || user?.role === 'titular';
    const canEditSelected = selectedDoc ? (user?.role === 'admin' || (user?.role === 'titular' && selectedDoc.author_id === user?.id)) : false;

    const getChainIds = (startDocId: string) => {
        const ids = new Set<string>();
        let current = documents.find(d => d.id === startDocId);
        while (current) {
            if (ids.has(current.id)) break;
            ids.add(current.id);
            if (!current.next_class_id) break;
            current = documents.find(d => d.id === current?.next_class_id);
        }
        current = documents.find(d => d.next_class_id === startDocId);
        while (current) {
            if (ids.has(current.id)) break;
            ids.add(current.id);
            current = documents.find(d => d.next_class_id === current?.id);
        }
        return Array.from(ids);
    };

    const chainIds = chainViewNodeId ? getChainIds(chainViewNodeId) : [];

    const filteredDocs = documents.filter(d => {
        // If in chain view, filter strictly by the chain IDs and skip other filters
        if (chainViewNodeId && chainIds.length > 0) {
            return chainIds.includes(d.id);
        }

        const matchesCategory = selectedCategory ? (d.tematica === selectedCategory || (!d.tematica && selectedCategory === 'Sin Categorizar')) : true;
        const matchesGrado = filterGrado ? d.grado?.split(',').map((s: string) => s.trim()).includes(filterGrado) : true;
        const matchesHoras = filterHoras ? d.carga_horaria === filterHoras : true;
        const matchesSearch = searchQuery ?
            (d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.author_name.toLowerCase().includes(searchQuery.toLowerCase()))
            : true;

        return matchesCategory && matchesGrado && matchesHoras && matchesSearch;
    }).sort((a, b) => {
        // We use parseFloat to handle decimal insertions correctly (e.g. 1.5)
        const parseNum = (val: string) => parseFloat(val?.replace(',', '.') || 'NaN');
        const numA = parseNum(a.num_clase);
        const numB = parseNum(b.num_clase);

        const validA = !isNaN(numA) ? numA : 999999;
        const validB = !isNaN(numB) ? numB : 999999;

        // Secondary sort by date if class numbers match or neither has one
        if (validA === validB) {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return validA - validB;
    });

    // Derive dynamic filter options based on the currently viewed category
    const categoryDocs = selectedCategory
        ? documents.filter(d => d.tematica === selectedCategory || (!d.tematica && selectedCategory === 'Sin Categorizar'))
        : documents;

    const uniqueGradosRaw = categoryDocs.flatMap(d => d.grado ? d.grado.split(',').map((s: string) => s.trim()) : []);
    const uniqueGrados = Array.from(new Set(uniqueGradosRaw.filter(Boolean)));
    const uniqueHoras = Array.from(new Set(categoryDocs.map(d => d.carga_horaria).filter(Boolean)));

    const parseClassNum = (val: string | null | undefined) => parseFloat(val?.replace(',', '.') || 'NaN');

    // Linked chain (next_class_id) in reading order, starting from its first class
    const getOrderedChain = (docId: string) => {
        let head = documents.find(d => d.id === docId);
        const visited = new Set<string>();
        while (head && !visited.has(head.id)) {
            visited.add(head.id);
            const prev = documents.find(d => d.next_class_id === head!.id);
            if (!prev || visited.has(prev.id)) break;
            head = prev;
        }
        const ordered: any[] = [];
        const seen = new Set<string>();
        let current = head;
        while (current && !seen.has(current.id)) {
            ordered.push(current);
            seen.add(current.id);
            current = current.next_class_id ? documents.find(d => d.id === current!.next_class_id) : undefined;
        }
        return ordered;
    };

    const linkedIds = new Set<string>();
    documents.forEach(d => {
        if (d.next_class_id) {
            linkedIds.add(d.id);
            linkedIds.add(d.next_class_id);
        }
    });

    const chainLabelFor = (docId: string) => {
        if (!linkedIds.has(docId)) return null;
        const length = getChainIds(docId).length;
        return length > 1 ? `Cadena · ${length} clases` : null;
    };

    // Previous / next class: explicit link first, numeric sequence of the same "rama" as fallback
    let prevClass: any = null;
    let nextClass: any = null;
    let sequence: any[] = [];
    let currentParsedNum = NaN;
    if (selectedDoc) {
        currentParsedNum = parseClassNum(selectedDoc.num_clase);
        const docRama = (selectedDoc.title || '').trim().toLowerCase();
        const siblingDocs = documents
            .filter(d =>
                d.tematica === selectedDoc.tematica &&
                (d.title || '').trim().toLowerCase() === docRama &&
                d.id !== selectedDoc.id
            )
            .map(d => ({ ...d, parsedNum: parseClassNum(d.num_clase) }))
            .filter(d => !isNaN(d.parsedNum))
            .sort((a, b) => a.parsedNum - b.parsedNum);

        const linkedNext = selectedDoc.next_class_id ? documents.find(d => d.id === selectedDoc.next_class_id) : null;
        const linkedPrev = documents.find(d => d.next_class_id === selectedDoc.id) || null;
        prevClass = linkedPrev || null;
        nextClass = linkedNext || null;

        if (!isNaN(currentParsedNum)) {
            if (!prevClass) prevClass = [...siblingDocs].reverse().find(d => d.parsedNum < currentParsedNum) || null;
            if (!nextClass) nextClass = siblingDocs.find(d => d.parsedNum > currentParsedNum) || null;
        }

        const linkedChain = getOrderedChain(selectedDoc.id);
        if (linkedChain.length > 1) {
            sequence = linkedChain;
        } else if (siblingDocs.length > 0 && !isNaN(currentParsedNum)) {
            sequence = [...siblingDocs, { ...selectedDoc, parsedNum: currentParsedNum }].sort((a, b) => a.parsedNum - b.parsedNum);
        }
    }

    const sequencePosition = selectedDoc ? sequence.findIndex(d => d.id === selectedDoc.id) : -1;
    const hasUncategorized = documents.some(d => !d.tematica);
    const libraryChips = [
        { key: 'all', label: 'Todas', value: null as string | null },
        ...categories.map(c => ({ key: c.id, label: c.name, value: c.name as string | null })),
        ...(hasUncategorized ? [{ key: 'none', label: 'Sin categorizar', value: 'Sin Categorizar' as string | null }] : []),
    ];

    const closeDocument = () => {
        setSelectedDoc(null);
    };

    const renderField = (label: string, id: string, editable: React.ReactNode, readValue: React.ReactNode) => (
        <div className={styles.field}>
            {canEditSelected ? <label htmlFor={id} className={styles.fieldLabel}>{label}</label> : <span className={styles.fieldLabel}>{label}</span>}
            {canEditSelected ? editable : <span className={styles.fieldValue}>{readValue}</span>}
        </div>
    );

    return (
        <div className={styles.centerContainer}>
            {!selectedDoc ? (
                // LIBRARY VIEW
                <div className={styles.library}>
                    <header className={styles.libraryHeader}>
                        <div className={styles.libraryTitle}>
                            <h1>{selectedCategory ? (selectedCategory === 'Sin Categorizar' ? 'Sin categorizar' : selectedCategory) : 'Planificaciones'}</h1>
                            <p>Todas las clases del equipo, ordenadas por cadena y número de clase.</p>
                        </div>
                        {canCreateDocument && (
                            <div className={styles.headerActions}>
                                {user?.role === 'admin' && (
                                    <button className={styles.btnGhostDanger} onClick={handleEmptyTrash} disabled={loading} title="Eliminar permanentemente los documentos borrados">
                                        <Trash2 size={16} aria-hidden="true" /> Vaciar papelera
                                    </button>
                                )}
                                <button className={styles.btnSecondary} onClick={() => setShowBulkImport(true)} title="Importar múltiples clases usando un JSON generado por IA externa">
                                    <Upload size={16} aria-hidden="true" /> Importar JSON
                                </button>
                                <button className={styles.btnPrimary} onClick={() => setIsCreating(true)}>
                                    <Plus size={16} aria-hidden="true" /> Nueva clase
                                </button>
                            </div>
                        )}
                    </header>

                    <div className={styles.filterCard}>
                        <div className={styles.filterRow}>
                            <div className={styles.searchInputWrapper}>
                                <label htmlFor="doc-search" className="sr-only">Buscar</label>
                                <Search size={18} aria-hidden="true" className={styles.searchIcon} />
                                <input
                                    id="doc-search"
                                    type="search"
                                    className={styles.searchInput}
                                    placeholder="Buscar por título o docente"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {uniqueGrados.length > 0 && (
                                <>
                                    <label htmlFor="filter-grado" className="sr-only">Año</label>
                                    <select id="filter-grado" value={filterGrado} onChange={(e) => setFilterGrado(e.target.value)} className={styles.filterSelect}>
                                        <option value="">Todos los años</option>
                                        {uniqueGrados.map((g: any) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </>
                            )}
                            {uniqueHoras.length > 0 && (
                                <>
                                    <label htmlFor="filter-horas" className="sr-only">Duración</label>
                                    <select id="filter-horas" value={filterHoras} onChange={(e) => setFilterHoras(e.target.value)} className={styles.filterSelect}>
                                        <option value="">Toda duración</option>
                                        {uniqueHoras.map((h: any) => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </>
                            )}
                        </div>
                        <div role="group" aria-label="Temática" className={styles.chipRow}>
                            {libraryChips.map(chip => (
                                <button
                                    key={chip.key}
                                    type="button"
                                    aria-pressed={selectedCategory === chip.value}
                                    className={`${styles.chip} ${selectedCategory === chip.value ? styles.chipActive : ''}`}
                                    onClick={() => setSelectedCategory(chip.value)}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {chainViewNodeId && (
                        <div className={styles.chainBanner}>
                            <span><Link2 size={16} aria-hidden="true" /> Mostrando solo la cadena de actividades seleccionada.</span>
                            <button type="button" onClick={() => setChainViewNodeId(null)}>Mostrar todas</button>
                        </div>
                    )}

                    <div className={styles.resultsBar}>
                        <span>{filteredDocs.length} {filteredDocs.length === 1 ? 'clase' : 'clases'}</span>
                        <span className={styles.resultsSort}>Orden: N° de clase</span>
                    </div>

                    <div className={styles.docsGrid}>
                        {filteredDocs.map(d => {
                            const color = getCategoryColor(d.tematica);
                            const chainLabel = chainLabelFor(d.id);
                            const metaParts = [[d.grado, d.anio].filter(Boolean).join(' '), d.carga_horaria].filter(Boolean);
                            return (
                                <button key={d.id} type="button" className={styles.docCard} onClick={() => setSelectedDoc(d)}>
                                    <span className={styles.cardTop}>
                                        <span className={styles.cardBadge} style={{ background: color.bg, color: color.fg }}>
                                            {d.tematica || 'Sin categorizar'}
                                        </span>
                                        {d.num_clase && <span className={styles.cardNumber}>Clase {d.num_clase}</span>}
                                    </span>
                                    <span className={styles.cardBody}>
                                        <span className={styles.cardTitle}>{d.title}</span>
                                        {metaParts.length > 0 && <span className={styles.cardMeta}>{metaParts.join(' · ')}</span>}
                                    </span>
                                    {chainLabel && (
                                        <span className={styles.cardChain}>
                                            <Link2 size={14} aria-hidden="true" /> {chainLabel}
                                        </span>
                                    )}
                                    {d.etiquetas && (
                                        <span className={styles.cardTags}>
                                            {d.etiquetas.split(',').map((tag: string) => tag.trim()).filter(Boolean).map((tag: string, i: number) => (
                                                <span key={i} className={styles.tagChip}>{tag}</span>
                                            ))}
                                        </span>
                                    )}
                                    <span className={styles.cardFooter}>
                                        <span>{d.author_name}</span>
                                        {d.created_at && <span>{formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: es })}</span>}
                                    </span>
                                </button>
                            );
                        })}
                        {filteredDocs.length === 0 && (
                            <div className={styles.emptyState}>
                                {searchQuery ? 'No se encontraron coincidencias para tu búsqueda.' : 'No hay planificaciones en esta carpeta.'}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // OPEN CLASS VIEW
                <div className={styles.docView}>
                    <header className={styles.docTopbar}>
                        <button type="button" className={styles.backLink} onClick={closeDocument}>
                            <ArrowLeft size={18} aria-hidden="true" /> Planificaciones
                        </button>
                        <div className={styles.docHeading}>
                            <span className={styles.docEyebrow}>
                                {selectedDoc.tematica || 'Sin categorizar'}
                                {selectedDoc.num_clase && ` · Clase ${selectedDoc.num_clase}${sequence.length > 1 && sequencePosition >= 0 ? ` de ${sequence.length}` : ''}`}
                            </span>
                            <h1>{selectedDoc.title}</h1>
                        </div>
                        {previewVersion && (
                            <span className={styles.previewNotice}>Viendo una versión anterior</span>
                        )}
                        <div className={styles.docActions}>
                            {selectedDoc.file_url && (
                                <button
                                    className={styles.btnSecondary}
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedDoc.file_url);
                                        setCopiedLink(true);
                                        setTimeout(() => setCopiedLink(false), 2000);
                                    }}
                                    title="Copiar enlace del documento"
                                >
                                    {copiedLink ? <><Check size={16} aria-hidden="true" /> Copiado</> : <><Copy size={16} aria-hidden="true" /> Copiar enlace</>}
                                </button>
                            )}
                            <button
                                className={styles.btnSecondary}
                                onClick={() => setIsExpanded(!isExpanded)}
                                title={isExpanded ? 'Restaurar tamaño' : 'Expandir a pantalla completa'}
                            >
                                {isExpanded ? <><Minimize2 size={16} aria-hidden="true" /> Contraer</> : <><Maximize2 size={16} aria-hidden="true" /> Expandir</>}
                            </button>
                            {canEditSelected && (
                                <>
                                    <button className={styles.btnSecondary} onClick={handleDuplicate} disabled={loading} title="Crear una copia de esta clase">
                                        <Copy size={16} aria-hidden="true" /> Duplicar
                                    </button>
                                    {selectedDoc.file_type === 'editor' && (
                                        <button className={styles.btnSecondary} onClick={handleExportPDF} title="Exportar como PDF para imprimir">
                                            <Printer size={16} aria-hidden="true" /> Exportar PDF
                                        </button>
                                    )}
                                    <button className={styles.btnGhostDanger} onClick={() => handleDelete(selectedDoc.id)}>
                                        <Trash2 size={16} aria-hidden="true" /> Eliminar
                                    </button>
                                    {selectedDoc.file_type === 'editor' && (
                                        <button className={styles.btnPrimary} onClick={handleCreateVersion} disabled={loading}>
                                            <Save size={16} aria-hidden="true" /> Guardar versión
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </header>

                    <div className={styles.docBody}>
                        {/* DETAILS PANEL */}
                        <section aria-label="Detalles de la clase" className={styles.detailsPanel}>
                            <h2 className={styles.panelTitle}>Detalles</h2>

                            <div className={styles.fieldGrid}>
                                {renderField('Clase N°', 'f-num',
                                    <input
                                        id="f-num"
                                        type="text"
                                        className={styles.input}
                                        value={selectedDoc.num_clase || ''}
                                        onChange={(e) => setSelectedDoc({ ...selectedDoc, num_clase: e.target.value })}
                                        onBlur={(e) => handleUpdateNumClase(selectedDoc.id, e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                    />,
                                    selectedDoc.num_clase || '—'
                                )}
                                {renderField('Curso', 'f-curso',
                                    <input
                                        id="f-curso"
                                        type="text"
                                        className={styles.input}
                                        value={selectedDoc.curso || ''}
                                        onChange={(e) => setSelectedDoc({ ...selectedDoc, curso: e.target.value })}
                                        onBlur={(e) => handleUpdateMetadataField(selectedDoc.id, 'curso', e.target.value)}
                                        placeholder="Ej: Historia"
                                    />,
                                    selectedDoc.curso || 'No especificado'
                                )}
                            </div>

                            <div className={styles.fieldGrid}>
                                {renderField('Grado', 'f-grado',
                                    <input
                                        id="f-grado"
                                        type="text"
                                        className={styles.input}
                                        value={selectedDoc.grado || ''}
                                        onChange={(e) => setSelectedDoc({ ...selectedDoc, grado: e.target.value })}
                                        onBlur={(e) => handleUpdateMetadataField(selectedDoc.id, 'grado', e.target.value)}
                                        placeholder="Ej: 1ro, 2do"
                                        title="Podés ingresar varios grados separados por coma"
                                    />,
                                    selectedDoc.grado || '—'
                                )}
                                {renderField('Año', 'f-anio',
                                    <input
                                        id="f-anio"
                                        type="text"
                                        className={styles.input}
                                        value={selectedDoc.anio || ''}
                                        onChange={(e) => setSelectedDoc({ ...selectedDoc, anio: e.target.value })}
                                        onBlur={(e) => handleUpdateMetadataField(selectedDoc.id, 'anio', e.target.value)}
                                        placeholder="Año"
                                    />,
                                    selectedDoc.anio || '—'
                                )}
                            </div>

                            {renderField('Duración', 'f-horas',
                                <input
                                    id="f-horas"
                                    type="text"
                                    className={styles.input}
                                    value={selectedDoc.carga_horaria || ''}
                                    onChange={(e) => setSelectedDoc({ ...selectedDoc, carga_horaria: e.target.value })}
                                    onBlur={(e) => handleUpdateMetadataField(selectedDoc.id, 'carga_horaria', e.target.value)}
                                    placeholder="Ej: 2 horas cátedra"
                                />,
                                selectedDoc.carga_horaria || 'No especificada'
                            )}

                            {renderField('Temática', 'f-tematica',
                                <select
                                    id="f-tematica"
                                    className={styles.input}
                                    value={selectedDoc.tematica || ''}
                                    onChange={(e) => handleUpdateCategory(selectedDoc.id, e.target.value)}
                                >
                                    <option value="">Sin categorizar</option>
                                    {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>,
                                selectedDoc.tematica || 'Sin categorizar'
                            )}

                            <div className={styles.field}>
                                {user?.role === 'admin' ? (
                                    <>
                                        <label htmlFor="f-autor" className={styles.fieldLabel}>Docente</label>
                                        <select
                                            id="f-autor"
                                            className={styles.input}
                                            value={selectedDoc.author_id}
                                            onChange={(e) => handleUpdateAuthor(selectedDoc.id, e.target.value)}
                                            title="Cambiar el docente asignado a esta clase (solo admins)"
                                        >
                                            {allUsers.map((u) => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                            ))}
                                        </select>
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.fieldLabel}>Docente</span>
                                        <span className={styles.fieldValue}>{selectedDoc.author_name}</span>
                                    </>
                                )}
                                <span className={styles.fieldHint}>
                                    {selectedDoc.author_role} · creada el {new Date(selectedDoc.created_at).toLocaleDateString('es-AR')}
                                </span>
                            </div>

                            <div className={styles.field}>
                                {canEditSelected ? (
                                    <>
                                        <label htmlFor="f-tags" className={styles.fieldLabel}>Etiquetas</label>
                                        <input
                                            id="f-tags"
                                            type="text"
                                            className={styles.input}
                                            value={selectedDoc.etiquetas || ''}
                                            onChange={(e) => setSelectedDoc({ ...selectedDoc, etiquetas: e.target.value })}
                                            onBlur={(e) => handleUpdateEtiquetas(selectedDoc.id, e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            placeholder="arduino, taller, examen"
                                        />
                                    </>
                                ) : (
                                    <span className={styles.fieldLabel}>Etiquetas</span>
                                )}
                                {selectedDoc.etiquetas ? (
                                    <div className={styles.cardTags}>
                                        {selectedDoc.etiquetas.split(',').map((tag: string) => tag.trim()).filter(Boolean).map((tag: string, i: number) => (
                                            <span key={i} className={styles.tagChip}>{tag}</span>
                                        ))}
                                    </div>
                                ) : !canEditSelected && <span className={styles.fieldHint}>Sin etiquetas</span>}
                            </div>

                            {renderField('Materiales y recursos', 'f-recursos',
                                <textarea
                                    id="f-recursos"
                                    rows={4}
                                    className={styles.textarea}
                                    value={selectedDoc.recursos || ''}
                                    onChange={(e) => setSelectedDoc({ ...selectedDoc, recursos: e.target.value })}
                                    onBlur={(e) => handleUpdateRecursos(selectedDoc.id, e.target.value)}
                                    placeholder="Escribí aquí los recursos necesarios"
                                />,
                                <span style={{ whiteSpace: 'pre-wrap' }}>{selectedDoc.recursos || 'No hay recursos cargados.'}</span>
                            )}

                            {canEditSelected && (
                                <button className={styles.btnAi} onClick={handleAIScan} disabled={loading}>
                                    <Sparkles size={16} aria-hidden="true" />
                                    {loading ? 'Analizando documento...' : 'Completar detalles con IA'}
                                </button>
                            )}

                            {(sequence.length > 1 || prevClass || nextClass || !isNaN(currentParsedNum)) && (
                                <div className={styles.chainSection}>
                                    <span className={styles.fieldLabel}>Cadena de actividades</span>
                                    {sequence.length > 1 && (
                                        <ol className={styles.chainList}>
                                            {sequence.map((d, i) => (
                                                <li key={d.id}>
                                                    <button
                                                        type="button"
                                                        aria-current={d.id === selectedDoc.id ? 'step' : undefined}
                                                        className={`${styles.chainItem} ${d.id === selectedDoc.id ? styles.chainItemActive : ''}`}
                                                        onClick={() => d.id !== selectedDoc.id && setSelectedDoc(documents.find(x => x.id === d.id))}
                                                    >
                                                        <span className={styles.chainNum}>{d.num_clase || i + 1}</span>
                                                        <span className={styles.chainTitle}>{d.title}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                    <div className={styles.chainNav}>
                                        {prevClass && (
                                            <button type="button" className={styles.btnSmall} onClick={() => setSelectedDoc(documents.find(d => d.id === prevClass.id))} title={`Ir a ${prevClass.title}`}>
                                                <ArrowLeft size={14} aria-hidden="true" /> Anterior
                                            </button>
                                        )}
                                        {nextClass && (
                                            <button type="button" className={styles.btnSmall} onClick={() => setSelectedDoc(documents.find(d => d.id === nextClass.id))} title={`Ir a ${nextClass.title}`}>
                                                Siguiente <ArrowRight size={14} aria-hidden="true" />
                                            </button>
                                        )}
                                        {!nextClass && canEditSelected && !isNaN(currentParsedNum) && (
                                            <button type="button" className={styles.btnSmall} onClick={handleCreateNextClassQuickAction} title="Crear una nueva clase conectada a esta">
                                                <Plus size={14} aria-hidden="true" /> Añadir siguiente
                                            </button>
                                        )}
                                    </div>
                                    <div className={styles.chainNav}>
                                        <button
                                            type="button"
                                            className={styles.btnLink}
                                            onClick={() => { setChainViewNodeId(selectedDoc.id); setSelectedDoc(null); }}
                                            title="Aislar y ver toda esta cadena en la biblioteca"
                                        >
                                            <Link2 size={14} aria-hidden="true" /> Ver cadena
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.btnLink}
                                            onClick={() => {
                                                const categoryId = selectedDoc.tematica || 'Sin Categorizar';
                                                if (selectedCategory !== categoryId) setSelectedCategory(categoryId);
                                                setChainViewNodeId(null);
                                                setSelectedDoc(null);
                                            }}
                                            title="Ver todas las clases de esta temática"
                                        >
                                            <LayoutGrid size={14} aria-hidden="true" /> Ver temática
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* DOCUMENT */}
                        <article className={`${styles.previewContainer} ${isExpanded ? styles.previewExpanded : ''}`}>
                            {isExpanded && (
                                <button type="button" className={styles.collapseBtn} onClick={() => setIsExpanded(false)}>
                                    <Minimize2 size={16} aria-hidden="true" /> Contraer
                                </button>
                            )}
                            {selectedDoc.file_type === 'pdf' && selectedDoc.file_url && (
                                <iframe src={selectedDoc.file_url} width="100%" height="100%" title="Vista previa del PDF" />
                            )}
                            {selectedDoc.file_type === 'word' && (
                                <div className={styles.wordPreview}>
                                    {selectedDoc.file_url && <div style={{ marginBottom: 10 }}><a href={selectedDoc.file_url} target="_blank" rel="noreferrer">Descargar original (.docx)</a></div>}
                                    {selectedDoc.content || 'Vista previa no disponible.'}
                                </div>
                            )}
                            {selectedDoc.file_type === 'gdoc' && selectedDoc.file_url && (
                                <iframe
                                    src={selectedDoc.file_url.includes('/edit') ? selectedDoc.file_url.replace(/\/edit.*$/, '/preview') : selectedDoc.file_url}
                                    width="100%"
                                    height="100%"
                                    title="Vista previa de Google Docs"
                                />
                            )}
                            {selectedDoc.file_type === 'editor' && (
                                <div className={styles.editorWrapper}>
                                    <RichTextEditor
                                        content={previewVersion ? (previewVersion.content || '') : (selectedDoc.content || '')}
                                        onSave={(newContent) => handleAutoSave(selectedDoc.id, newContent)}
                                        readOnly={!canEditSelected || !!previewVersion}
                                        onSelectionChange={canEditSelected ? handleEditorSelectionChange : undefined}
                                        selectionReplace={pendingReplace}
                                        onSelectionReplaceDone={() => {
                                            setPendingReplace(null);
                                            setPendingReplacement(null);
                                            setEditorSelection(null);
                                        }}
                                    />
                                </div>
                            )}
                        </article>
                    </div>
                </div>
            )}

            {/* CREATION MODAL */}
            {isCreating && (
                <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setIsCreating(false); setPendingChainFromDocId(null); setSelectedTemplate(null); } }}>
                    <div className={styles.uploadModal} role="dialog" aria-modal="true" aria-labelledby="create-title">
                        <div className={styles.modalHeader}>
                            <h2 id="create-title">{pendingChainFromDocId ? 'Nueva clase encadenada' : 'Nueva clase'}</h2>
                            <button className={styles.closeBtn} aria-label="Cerrar" onClick={() => { setIsCreating(false); setPendingChainFromDocId(null); setSelectedTemplate(null); }}>
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>
                        <div className={styles.uploadSection}>
                            <div className={styles.field}>
                                <label htmlFor="c-title" className={styles.fieldLabel}>Título</label>
                                <input
                                    id="c-title"
                                    type="text"
                                    className={styles.input}
                                    placeholder="Título de la clase o material"
                                    value={uploadTitle}
                                    onChange={e => setUploadTitle(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.field}>
                                <span className={styles.fieldLabel}>Partir de una plantilla IA (opcional)</span>
                                <div className={styles.chipRow}>
                                    {QUICK_TEMPLATES.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            aria-pressed={selectedTemplate === t.id}
                                            className={`${styles.chip} ${selectedTemplate === t.id ? styles.chipSelected : ''}`}
                                            onClick={() => {
                                                const next = selectedTemplate === t.id ? null : t.id;
                                                setSelectedTemplate(next);
                                                if (next && !uploadTitle) {
                                                    setUploadTitle(`Clase de ${t.name}`);
                                                }
                                            }}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label htmlFor="c-type" className={styles.fieldLabel}>Formato</label>
                                <select id="c-type" className={styles.input} value={uploadType} onChange={(e: any) => setUploadType(e.target.value)}>
                                    <option value="editor">Editor de texto integrado</option>
                                    <option value="word">Documento Word (.docx)</option>
                                    <option value="pdf">Archivo PDF</option>
                                    <option value="gdoc">Enlace de Google Docs</option>
                                </select>
                            </div>

                            <div className={styles.fieldGrid}>
                                <div className={styles.field}>
                                    <label htmlFor="c-cat" className={styles.fieldLabel}>Temática</label>
                                    <select id="c-cat" className={styles.input} value={uploadCategory} onChange={(e: any) => setUploadCategory(e.target.value)}>
                                        <option value="">Sin temática</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label htmlFor="c-num" className={styles.fieldLabel}>Clase N°</label>
                                    <input
                                        id="c-num"
                                        type="text"
                                        className={styles.input}
                                        placeholder="Ej: 1 o 1.5"
                                        value={creationNumClase}
                                        onChange={e => setCreationNumClase(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label htmlFor="c-tags" className={styles.fieldLabel}>Etiquetas (opcional)</label>
                                <input
                                    id="c-tags"
                                    type="text"
                                    className={styles.input}
                                    placeholder="Separadas por coma"
                                    value={uploadTags}
                                    onChange={e => setUploadTags(e.target.value)}
                                />
                            </div>

                            {(uploadType === 'word' || uploadType === 'pdf') && (
                                <div className={styles.field}>
                                    <label htmlFor="c-file" className={styles.fieldLabel}>Archivo</label>
                                    <input id="c-file" type="file" accept={uploadType === 'word' ? '.docx' : '.pdf'} onChange={handleFileUploadChange} />
                                </div>
                            )}

                            {uploadType === 'gdoc' && (
                                <div className={styles.field}>
                                    <label htmlFor="c-url" className={styles.fieldLabel}>URL pública de Google Docs</label>
                                    <input id="c-url" type="url" className={styles.input} placeholder="https://docs.google.com/..." value={gdocUrl} onChange={e => setGdocUrl(e.target.value)} />
                                </div>
                            )}

                            <button className={`${styles.btnPrimary} ${styles.btnBlock}`} onClick={handleSaveDocument} disabled={loading}>
                                {loading ? 'Subiendo...' : 'Crear y publicar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK IMPORT MODAL */}
            {showBulkImport && (
                <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) { setShowBulkImport(false); } }}>
                    <div className={`${styles.uploadModal} ${styles.uploadModalWide}`} role="dialog" aria-modal="true" aria-labelledby="import-title">
                        <div className={styles.modalHeader}>
                            <h2 id="import-title">Importar clases desde JSON</h2>
                            <button className={styles.closeBtn} aria-label="Cerrar" onClick={() => setShowBulkImport(false)}>
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>
                        <div className={styles.uploadSection}>
                            <label htmlFor="bulk-json" className={styles.modalHint}>
                                Pegá el JSON generado por tu IA externa (ChatGPT, Gemini, etc.). Tiene que ser un arreglo de objetos.
                            </label>
                            <textarea
                                id="bulk-json"
                                className={`${styles.textarea} ${styles.codeArea}`}
                                value={bulkImportJson}
                                onChange={(e) => setBulkImportJson(e.target.value)}
                                placeholder='[ { "title": "Clase 1", "tematica": "Historia", ... } ]'
                                autoFocus
                            />
                            <div className={styles.modalActions}>
                                <button className={styles.btnSecondary} onClick={() => setShowBulkImport(false)} disabled={loading}>
                                    Cancelar
                                </button>
                                <button className={styles.btnPrimary} onClick={handleBulkImport} disabled={loading || !bulkImportJson.trim()}>
                                    {loading ? 'Importando...' : 'Procesar e importar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {confirmModal && (
                <ConfirmModal
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmLabel={confirmModal.confirmLabel}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}
        </div>
    );
}
