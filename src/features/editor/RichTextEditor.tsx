import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
    content: string;
    onSave: (content: string) => void;
    readOnly?: boolean;
}

export function RichTextEditor({ content, onSave, readOnly = false }: RichTextEditorProps) {
    const [isSaving, setIsSaving] = useState(false);

    const editor = useEditor({
        extensions: [StarterKit],
        content: content,
        editable: !readOnly,
        onUpdate: () => {
            // Debounced save
            setIsSaving(true);
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Only update if external content changes drastically (e.g., selecting a new doc or version)
            // Be careful not to reset cursor position by checking if it's already matching
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    useEffect(() => {
        if (isSaving) {
            const timeout = setTimeout(() => {
                if (editor) {
                    onSave(editor.getHTML());
                    setIsSaving(false);
                }
            }, 1000); // 1-second debounce for auto-save
            return () => clearTimeout(timeout);
        }
    }, [isSaving, editor, onSave]);

    if (!editor) return null;

    return (
        <div className={styles.editorContainer}>
            {!readOnly && (
                <div className={styles.toolbar}>
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={editor.isActive('bold') ? styles.active : ''}
                    >
                        <strong>B</strong>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={editor.isActive('italic') ? styles.active : ''}
                    >
                        <em>I</em>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={editor.isActive('heading', { level: 2 }) ? styles.active : ''}
                    >
                        H2
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={editor.isActive('bulletList') ? styles.active : ''}
                    >
                        Lista
                    </button>
                    <span className={styles.saveStatus}>
                        {isSaving ? 'Guardando...' : 'Guardado'}
                    </span>
                </div>
            )}
            <EditorContent editor={editor} className={styles.contentArea} />
        </div>
    );
}
