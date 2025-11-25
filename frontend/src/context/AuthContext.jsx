import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import supabase from '../lib/supabase.js';

const AuthContext = createContext({
  session: null,
  user: null,
  token: '',
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      setLoading(false);
      return () => { mounted = false; };
    }
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data?.session ?? null);
        setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    token: session?.access_token ?? '',
    loading,
    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
      setSession(null);
    },
  }), [session, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
