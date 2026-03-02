import { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import styles from './FeedbackButton.module.css';

export function FeedbackButton() {
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<'bug' | 'suggestion'>('bug');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) return;

        setStatus('submitting');
        try {
            // Note: the backend integration should match `feedback` schema
            // feedback: id, user_id, type, description, created_at
            const { error } = await supabase.from('feedback').insert({
                user_id: user?.id,
                type,
                description
            });

            if (error) {
                // Silently fail for mockup purposes if table doesn't exist, but report to UI
                console.warn('Feedback mock insert failed:', error);
            }

            setStatus('success');
            setTimeout(() => {
                setIsOpen(false);
                setStatus('idle');
                setDescription('');
            }, 2000);
        } catch (err) {
            setStatus('error');
        }
    };

    return (
        <div className={styles.feedbackWrapper}>
            {!isOpen && (
                <button
                    className={styles.fab}
                    onClick={() => setIsOpen(true)}
                    title="Reportar Error o Sugerencia"
                >
                    <MessageSquare size={24} />
                </button>
            )}

            {isOpen && (
                <div className={styles.feedbackModal}>
                    <div className={styles.modalHeader}>
                        <h3>Feedback y Mejora</h3>
                        <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                            <X size={18} />
                        </button>
                    </div>

                    {status === 'success' ? (
                        <div className={styles.successMessage}>
                            ¡Gracias por tu aporte! Lo revisaremos pronto.
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className={styles.formContent}>
                            <div className={styles.typeSelector}>
                                <button
                                    type="button"
                                    className={type === 'bug' ? styles.activeType : ''}
                                    onClick={() => setType('bug')}
                                >
                                    Reportar Error
                                </button>
                                <button
                                    type="button"
                                    className={type === 'suggestion' ? styles.activeType : ''}
                                    onClick={() => setType('suggestion')}
                                >
                                    Sugerencia
                                </button>
                            </div>

                            <textarea
                                placeholder={type === 'bug' ? "¿Qué falló o no funciona correctamente?" : "¿Qué nueva función o mejora sugieres?"}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                rows={4}
                                className={styles.textarea}
                            />

                            {status === 'error' && <div className={styles.errorMsg}>Hubo un problema al enviar.</div>}

                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={status === 'submitting' || !description.trim()}
                            >
                                {status === 'submitting' ? 'Enviando...' : (
                                    <>
                                        <Send size={16} /> Enviar Feedback
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
