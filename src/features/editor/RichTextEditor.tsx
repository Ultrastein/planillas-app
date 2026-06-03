import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import styles from './RichTextEditor.module.css';

interface SelectionReplace {
    text: string;
    from: number;
    to: number;
}

interface RichTextEditorProps {
    content: string;
    onSave: (content: string) => void;
    readOnly?: boolean;
    onSelectionChange?: (text: string, from: number, to: number) => void;
    selectionReplace?: SelectionReplace | null;
    onSelectionReplaceDone?: () => void;
}

export function RichTextEditor({
    content,
    onSave,
    readOnly = false,
    onSelectionChange,
    selectionReplace,
    onSelectionReplaceDone,
}: RichTextEditorProps) {
    const [isSaving, setIsSaving] = useState(false);

    const editor = useEditor({
        extensions: [StarterKit],
        content: content,
        editable: !readOnly,
        onUpdate: () => {
            setIsSaving(true);
        },
        onSelectionUpdate: ({ editor: ed }) => {
            if (!onSelectionChange) return;
            const { from, to } = ed.state.selection;
            const text = from === to ? '' : ed.state.doc.textBetween(from, to, ' ');
            onSelectionChange(text, from, to);
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Only update if external content changes drastically (e.g., selecting a new doc or version)
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

    // Handle pending text replacement from AI
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!selectionReplace || !editor) return;
        const { text, from, to } = selectionReplace;
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, text).run();
        onSelectionReplaceDone?.();
    }, [selectionReplace]);

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
