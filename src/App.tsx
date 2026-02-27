import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { AuthPage } from './features/auth/AuthPage';
import { DesktopLayout } from './layouts/DesktopLayout';
import { AdminPanel } from './features/admin/AdminPanel';
import { DocumentEditor } from './features/editor/DocumentEditor';

function App() {
  const { setUser, setProfile, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    // Check for mock login first
    const mockAuthStr = localStorage.getItem('mock_auth');
    if (mockAuthStr) {
      try {
        const mockProfile = JSON.parse(mockAuthStr);
        const mockUser = { id: mockProfile.id, email: mockProfile.email, user_metadata: { full_name: mockProfile.name } } as any;
        setUser(mockUser);
        setProfile(mockProfile);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Error parsing mock_auth', e);
      }
    }

    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch profile
        try {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (data) {
            setProfile(data);
          } else {
            setProfile({
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.full_name || session.user.email!.split('@')[0],
              role: 'admin', // Mock default to admin for testing since supabase is missing
            });
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading]);

  if (isLoading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Cargando EduPlan Pro...</div>;
  }

  return (
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
  );
}

export default App;
