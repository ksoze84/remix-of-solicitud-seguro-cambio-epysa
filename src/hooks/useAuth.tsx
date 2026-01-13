import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { Epysa } from '@/integrations/epy/EpysaApi';
import { User } from '@/types';
import { IdatoEpysa } from 'epysa-dataproc';

interface AuthContextType {
  user: User | null;
  session: IdatoEpysa | null;
  loading: boolean;
  userProfile: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [ user, setUser ] = useState<User | null>(null);
  const [ loading, setLoading ] = useState(true);
  const [ userProfile, setUserProfile ] = useState<any>(null);

  useEffect(() => {
    Epysa.auth.getUserData()
      .then(u => {
        setUser( {login: u.login} );
        let profile : string;
        if (Epysa.auth.userHasProfile("ADMFRWRD")) 
          profile = "ADMIN";
        else if (Epysa.auth.userHasProfile("COORFRWRD"))
          profile = "COORDINADOR";
        else 
          profile = "VENDEDOR";
        setUserProfile({...u, role : profile});
      })
      .finally(() => setLoading(false));

  }, []);



  const value = useMemo(() => ({
    user,
    session : null,
    loading,
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