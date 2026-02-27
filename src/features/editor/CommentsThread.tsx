import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { MessageSquare, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import styles from './CommentsThread.module.css';

interface Comment {
    id: string;
    text: string;
    authorName: string;
    authorRole: string;
    createdAt: Date;
}

export function CommentsThread() {
    const { profile } = useAuthStore();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !profile) return;

        const comment: Comment = {
            id: crypto.randomUUID(),
            text: newComment,
            authorName: profile.name,
            authorRole: profile.role,
            createdAt: new Date(),
        };

        setComments([...comments, comment]);
        setNewComment('');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <MessageSquare size={18} />
                <h3>Sugerencias y Mejoras</h3>
            </div>

            <div className={styles.commentsList}>
                {comments.length === 0 ? (
                    <div className={styles.emptyState}>No hay sugerencias en esta planificación aún.</div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} className={styles.commentItem}>
                            <div className={styles.commentHeader}>
                                <div className={styles.avatar}>
                                    <User size={14} />
                                </div>
                                <div className={styles.authorInfo}>
                                    <span className={styles.authorName}>{c.authorName}</span>
                                    <span className={styles.authorRole}>{c.authorRole}</span>
                                </div>
                                <span className={styles.time}>{formatDistanceToNow(c.createdAt, { addSuffix: true, locale: es })}</span>
                            </div>
                            <p className={styles.commentText}>{c.text}</p>
                        </div>
                    ))
                )}
            </div>

            <form className={styles.inputArea} onSubmit={handleAddComment}>
                <input
                    type="text"
                    placeholder="Escribe una sugerencia..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit" disabled={!newComment.trim()}>
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
}
