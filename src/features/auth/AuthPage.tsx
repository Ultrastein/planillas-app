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
                setError('Credenciales inválidas. Si usaste Google originalmente, por favor haz clic en "Acceder con Google".');
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
            <div className={styles.authCard}>
                <div className={styles.brand}>
                    <img src="/logo.png" alt="TecnoKids Logo" className={styles.logoImage} />
                    <p>Gestión avanzada de planificaciones docentes</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => {
                            setError('El inicio de sesión con Google falló');
                        }}
                        theme="outline"
                        text="signin_with"
                        shape="rectangular"
                    />
                </div>

                <div className={styles.divider}>
                    <span>O ingresa con tus credenciales</span>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                    {error && <div className={styles.errorMessage}>{error}</div>}

                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Usuario o Email Académico</label>
                        <input
                            id="email"
                            type="text"
                            placeholder="admin / docente / tu@escuela.edu.ar"
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
                        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}
