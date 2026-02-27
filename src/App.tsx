import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from './store/useAuthStore';
import { AuthPage } from './features/auth/AuthPage';
import { supabase } from './lib/supabase';
import { DesktopLayout } from './layouts/DesktopLayout';
import { AdminPanel } from './features/admin/AdminPanel';
import { DocumentEditor } from './features/editor/DocumentEditor';

function App() {
  const { setUser, setLoading, fetchProfile, isLoading } = useAuthStore();
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id).then(() => setLoading(false));
        } else {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, fetchProfile, setLoading]);

  if (isLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Cargando EduPlan Pro...</div>;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected Routes */}
          <Route path="/" element={<DesktopLayout />}>
            <Route index element={<Navigate to="/editor" replace />} />
            <Route path="editor" element={<DocumentEditor />} />
            <Route path="admin" element={<AdminPanel />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
