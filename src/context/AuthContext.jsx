import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const DEMO_SESSION_KEY = 'quizlet-demo-session';

const demoUser = {
  id: 'demo-user',
  email: 'demo@local.test',
  user_metadata: { display_name: 'Demo Student' },
  isDemo: true,
};

function profileFromUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Student',
    email: user.email,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (
    !supabase && localStorage.getItem(DEMO_SESSION_KEY) === 'active' ? demoUser : null
  ));
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({ name, email, password }) => {
    if (!supabase) throw new Error('Connect Supabase to create real accounts.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).href,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async ({ email, password }) => {
    if (!supabase) throw new Error('Connect Supabase to sign in to a real account.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const continueAsDemo = () => {
    localStorage.setItem(DEMO_SESSION_KEY, 'active');
    setUser(demoUser);
  };

  const signOut = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } else {
      localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
    }
  };

  const value = useMemo(() => ({
    user,
    profile: profileFromUser(user),
    loading,
    configured: isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    continueAsDemo,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The hook intentionally shares this module with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
