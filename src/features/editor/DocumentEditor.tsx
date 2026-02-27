import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { useVersionStore } from '../../store/useVersionStore';
import { useAuthStore } from '../../store/useAuthStore';
import styles from './DocumentEditor.module.css';

// Mocked save function
const saveDocumentSnapshot = async (content: string, authorId: string, authorName: string) => {
    // Here you would use supabase to insert a new version into the 'document_versions' table.
    return {
        id: crypto.randomUUID(),
        document_id: 'doc-1', // Assuming a static doc for now
        content,
        author_id: authorId,
        author_name: authorName,
        created_at: new Date().toISOString(),
    };
};

export function DocumentEditor() {
    const { previewVersion, addVersion } = useVersionStore();
    const { profile } = useAuthStore();
    const [currentContent, setCurrentContent] = useState('<h2>Planificación Taller 2026</h2><p>Comienza a escribir los fundamentos técnicos aquí...</p>');

    const editor = useEditor({
        extensions: [
            StarterKit,
        ],
        content: previewVersion ? previewVersion.content : currentContent,
        editable: !previewVersion, // Lock editing if we are previewing an old version
        onUpdate: ({ editor }) => {
            if (!previewVersion) {
                setCurrentContent(editor.getHTML());
            }
        },
    });

    // Whenever the preview version changes, or if we go back to current, update the editor content
    useEffect(() => {
        if (editor && !editor.isDestroyed) {
            const contentToDisplay = previewVersion ? previewVersion.content : currentContent;
            // We use commands.setContent so it doesn't trigger onUpdate unnecessarily
            editor.commands.setContent(contentToDisplay, { emitUpdate: false });
            editor.setEditable(!previewVersion);
        }
    }, [previewVersion, editor, currentContent]);

    const handleSaveSnapshot = async () => {
        if (!editor || previewVersion || !profile) return; // Cannot save from a preview

        const htmlContent = editor.getHTML();
        const newSnap = await saveDocumentSnapshot(htmlContent, profile.id, profile.name);
        addVersion(newSnap);
        alert('Nueva versión inmutable guardada exitosamente.');
    };

    const handleRestorePreview = () => {
        if (!previewVersion || !editor) return;
        setCurrentContent(previewVersion.content);
        // Clearing the preview means we are back to editing the "current" which is now the restored content
        useVersionStore.getState().setPreviewVersion(null);
        alert(`Versión restaurada. Los cambios no se guardarán permanentemente hasta que presiones "Crear Snapshot".`);
    }

    return (
        <div className={styles.editorContainer}>
            {previewVersion && (
                <div className={styles.previewBanner}>
                    <p>
                        ⚠️ Estás previsualizando una versión antigua guardada por <strong>{previewVersion.author_name}</strong> el {new Date(previewVersion.created_at).toLocaleString()}.
                        Modo solo lectura.
                    </p>
                    <div className={styles.previewActions}>
                        <button className={styles.btnSecondary} onClick={() => useVersionStore.getState().setPreviewVersion(null)}>
                            Volver al Actual
                        </button>
                        <button className={styles.btnPrimary} onClick={handleRestorePreview}>
                            Restaurar esta Versión
                        </button>
                    </div>
                </div>
            )}

            {!previewVersion && (
                <div className={styles.editorToolbar}>
                    <span className={styles.statusText}>Editando el documento actual...</span>
                    <button className={styles.btnPrimary} onClick={handleSaveSnapshot}>
                        Crear Snapshot (Guardar Versión)
                    </button>
                </div>
            )}

            <div className={styles.tiptapWrapper}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
