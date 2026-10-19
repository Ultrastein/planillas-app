import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDocumentStore } from '../../store/useDocumentStore';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import styles from './CommentsThread.module.css';

export function CommentsThread() {
    const { profile: user } = useAuthStore();
    const { selectedDocId } = useDocumentStore();
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (selectedDocId) {
            fetchComments();
        } else {
            setComments([]);
        }
    }, [selectedDocId]);

    const fetchComments = async () => {
        try {
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('document_id', selectedDocId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            setComments(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user || !selectedDocId) return;

        try {
            const comment = {
                document_id: selectedDocId,
                text: newComment,
                author_id: user.id,
                author_name: user.name,
            };

            const { error } = await supabase.from('comments').insert(comment);
            if (error) throw error;

            setNewComment('');
            fetchComments();
        } catch (err) {
            console.error('Error adding comment', err);
        }
    };

    if (!selectedDocId) return null;

    return (
        <div className={styles.container}>
            <div className={styles.commentsList}>
                {comments.length === 0 ? (
                    <div className={styles.emptyState}>
                        <MessageSquare size={20} aria-hidden="true" />
                        Todavía no hay comentarios en esta clase.
                    </div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} className={styles.commentItem}>
                            <span className={styles.commentHeader}>
                                <span className={styles.authorName}>{c.author_name}</span>
                                <span className={styles.time}>· {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}</span>
                            </span>
                            <p className={styles.commentText}>{c.text}</p>
                        </div>
                    ))
                )}
            </div>

            <form className={styles.inputArea} onSubmit={handleAddComment}>
                <label htmlFor="new-comment" className={styles.inputLabel}>Nuevo comentario</label>
                <textarea
                    id="new-comment"
                    rows={3}
                    placeholder="Escribí un comentario o sugerencia sobre esta clase"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit" disabled={!newComment.trim()}>
                    <Send size={16} aria-hidden="true" /> Publicar
                </button>
            </form>
        </div>
    );
}
