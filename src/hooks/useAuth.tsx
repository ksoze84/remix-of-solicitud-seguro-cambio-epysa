import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { secureLogger } from '@/utils/secureLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  userProfile: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        secureLogger.info('Auth state changed:', { event, userId: session?.user?.id });
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user profile when user logs in
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              
              setUserProfile(profile);
              secureLogger.info('User profile loaded');
            } catch (error) {
              secureLogger.error('Error fetching user profile:', error);
            }
          }, 0);
        } else if (!session?.user) {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            setUserProfile(profile);
          } catch (error) {
            secureLogger.error('Error fetching user profile:', error);
          }
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        secureLogger.error('SignInWithPassword error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      secureLogger.error('Unexpected error in signInWithPassword:', error);
      return { error };
    }
  };

  const signUpWithPassword = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        secureLogger.error('SignUp error:', error);
        // Handle specific error messages
        if (error.message.includes('User must be created by an administrator first')) {
          return { error: { message: 'Usuario no autorizado. Contacta al administrador.' } };
        }
        if (error.message.includes('Only @epysa.cl email addresses are allowed')) {
          return { error: { message: 'Solo se permiten emails corporativos @epysa.cl' } };
        }
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      secureLogger.error('Unexpected error in signUpWithPassword:', error);
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`
      });
      
      if (error) {
        secureLogger.error('ResetPassword error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      secureLogger.error('Unexpected error in resetPassword:', error);
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      secureLogger.error('SignOut error:', error);
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const value = {
    user,
    session,
    loading,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    signOut,
    userProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}