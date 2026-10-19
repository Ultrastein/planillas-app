import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { GoogleLogin } from '@react-oauth/google';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import styles from './AuthPage.module.css';

const loginSchema = z.object({
    email: z.string().min(1, { message: 'El usuario o email es requerido' }),
    password: z.string().min(1, { message: 'Contraseña requerida' }),
});

type LoginForm = z.infer<typeof loginSchema>;

export function AuthPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });



    const onSubmit = async (data: LoginForm) => {
        setLoading(true);
        setError(null);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (signInError) throw signInError;

            navigate('/');
        } catch (err: any) {
            if (err.message?.includes('Invalid login credentials')) {
                setError('Credenciales inválidas. Si usaste Google originalmente, hacé clic en "Continuar con Google".');
            } else {
                setError(err.message || 'Error al iniciar sesión');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            if (!credentialResponse.credential) throw new Error('No credential available');

            const { error: authError } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: credentialResponse.credential,
            });

            if (authError) throw authError;

            navigate('/');
        } catch (error: any) {
            console.error(error);
            setError('Fallo la autenticación con Google: ' + (error.message || 'Error desconocido'));
        }
    };

    return (
        <div className={styles.authContainer}>
            <section className={styles.brandSide}>
                <svg aria-hidden="true" width="520" height="520" viewBox="0 0 520 520" fill="none" className={styles.brandRings}>
                    <circle cx="260" cy="260" r="250" stroke="#1F3A47" strokeWidth="2" />
                    <circle cx="260" cy="260" r="180" stroke="#1F3A47" strokeWidth="2" />
                    <circle cx="260" cy="260" r="110" stroke="#2A5563" strokeWidth="2" />
                    <circle cx="260" cy="260" r="40" fill="#39B0C4" />
                </svg>
                <div className={styles.brand}>
                    <div className={styles.brandMark} aria-hidden="true">TK</div>
                    <span className={styles.brandName}>TecnoKids Planillas</span>
                </div>
                <div className={styles.pitch}>
                    <h1>Las planificaciones del equipo, en un solo lugar.</h1>
                    <p>Creá, encadená y compartí clases. Generá rúbricas y actividades con IA a partir de lo que ya escribiste.</p>
                </div>
                <span className={styles.brandFoot}>Gestión de planificaciones docentes</span>
            </section>

            <section className={styles.formSide}>
                <div className={styles.authCard}>
                    <div className={styles.cardHeading}>
                        <h2>Iniciar sesión</h2>
                        <p>Usá tu cuenta institucional.</p>
                    </div>

                    <div className={styles.googleWrap}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => {
                                setError('El inicio de sesión con Google falló');
                            }}
                            theme="outline"
                            text="continue_with"
                            shape="rectangular"
                            size="large"
                            width="328"
                        />
                    </div>

                    <div className={styles.divider}>
                        <span>o con tus credenciales</span>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                        {error && <div className={styles.errorMessage} role="alert">{error}</div>}

                        <div className={styles.inputGroup}>
                            <label htmlFor="email">Usuario o email</label>
                            <input
                                id="email"
                                type="text"
                                autoComplete="username"
                                placeholder="tu@escuela.edu.ar"
                                {...register('email')}
                                className={errors.email ? styles.inputError : ''}
                            />
                            {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="password">Contraseña</label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                {...register('password')}
                                className={errors.password ? styles.inputError : ''}
                            />
                            {errors.password && <span className={styles.errorText}>{errors.password.message}</span>}
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                        >
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>
            </section>
        </div>
    );
}
