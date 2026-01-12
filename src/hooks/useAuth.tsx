import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { secureLogger } from '@/utils/secureLogger';
import { Epysa } from '@/integrations/epy/EpysaApi';
import { User } from '@/types';

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

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [ user, setUser ] = useState<User | null>(null);
  const [ loading, setLoading ] = useState(true);
  const [ userProfile, setUserProfile ] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    Epysa.auth.getUserData()
      .then(u => {
        setUser( {login: u.login} );
        let profile : string;
        if (Epysa.auth.userHasProfile("ADMFRWRD")) 
          profile = "ADMIN";
        else 
          profile = "VENDEDOR";
        setUserProfile({...u, role : profile});
      })
      .finally(() => setLoading(false));

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
          emailRedirectTo: `${globalThis.location.origin}/`
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
        redirectTo: `${globalThis.location.origin}/`
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

  const value = useMemo(() => ({
    user,
    session : null,
    loading,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    signOut,
    userProfile
  }), [user, loading, userProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}