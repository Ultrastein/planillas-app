import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import styles from './AuthPage.module.css';

const loginSchema = z.object({
    email: z.string().min(1, { message: 'El usuario o email es requerido' }),
    password: z.string().min(1, { message: 'Contraseña requerida' }),
});

type LoginForm = z.infer<typeof loginSchema>;

export function AuthPage() {
    const navigate = useNavigate();
    const { setUser, setProfile } = useAuthStore();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const enterFullscreen = () => {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch((e) => console.log('Fullscreen error:', e));
        }
    };

    const onSubmit = async (data: LoginForm) => {
        setLoading(true);
        setError(null);
        
        try {
            // Mock Login for Admin
            if (data.email === 'admin' && data.password === 'admin') {
                const mockProfile = { id: 'admin-123', email: 'admin@eduplan.pro', name: 'Administrador', role: 'admin' as const };
                const mockUser = { id: 'admin-123', email: 'admin@eduplan.pro', user_metadata: { full_name: 'Administrador' } } as any;
                localStorage.setItem('mock_auth', JSON.stringify(mockProfile));
                setUser(mockUser);
                setProfile(mockProfile);
                enterFullscreen();
                navigate('/');
                return;
            }

            // Mock Login for Docente
            if (data.email === 'docente' && data.password === 'docente') {
                const mockProfile = { id: 'docente-123', email: 'docente@eduplan.pro', name: 'Docente', role: 'titular' as const };
                const mockUser = { id: 'docente-123', email: 'docente@eduplan.pro', user_metadata: { full_name: 'Docente' } } as any;
                localStorage.setItem('mock_auth', JSON.stringify(mockProfile));
                setUser(mockUser);
                setProfile(mockProfile);
                enterFullscreen();
                navigate('/');
                return;
            }

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (authError) throw authError;

            if (authData.user) {
                const { data: profileData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();

                setUser(authData.user);
                if (profileData) {
                    setProfile(profileData);
                } else {
                    setProfile({
                        id: authData.user.id,
                        email: authData.user.email!,
                        name: authData.user.user_metadata?.full_name || authData.user.email!.split('@')[0],
                        role: 'titular',
                    });
                }
                enterFullscreen();
                navigate('/');
            }
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

    const handleGoogleLogin = async () => {
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                }
            });
            if (error) throw error;
        } catch (err: any) {
            console.log('Google Auth Error from Backend, using Mock Auth for preview:', err.message);
            // Mock Fallback for Google since backend is not configured properly yet
            const mockProfile = { id: 'google-mock', email: 'usuario.google@gmail.com', name: 'Usuario Google', role: 'titular' as const };
            const mockUser = { id: 'google-mock', email: 'usuario.google@gmail.com', user_metadata: { full_name: 'Usuario Google' } } as any;
            localStorage.setItem('mock_auth', JSON.stringify(mockProfile));
            setUser(mockUser);
            setProfile(mockProfile);
            enterFullscreen();
            navigate('/');
        }
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.brand}>
                    <h1>EduPlan Pro</h1>
                    <p>Gestión avanzada de planificaciones docentes</p>
                </div>

                <button
                    className={styles.googleBtn}
                    onClick={handleGoogleLogin}
                    type="button"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" width={18} height={18} />
                    <span>Acceder con Google</span>
                </button>

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
