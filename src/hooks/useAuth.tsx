import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  restaurantRole: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isKitchen: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [restaurantRole, setRestaurantRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRoles = async (userId: string) => {
    console.log('Fetching roles for user:', userId);
    
    // Fetch user_roles (para super admin)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (roleError) {
      console.log('user_roles query error (normal for non-admins):', roleError.message);
    }
    setUserRole(roleData?.role ?? null);

    // Fetch user_restaurants (para dono/funcionário)
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('user_restaurants')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (restaurantError) {
      console.error('user_restaurants query error:', restaurantError.message);
    }
    
    console.log('Restaurant role fetched:', restaurantData?.role);
    setRestaurantRole(restaurantData?.role ?? null);
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRoles(session.user.id);
        } else {
          setUserRole(null);
          setRestaurantRole(null);
        }
      }
    );

    // Check for existing session
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserRoles(session.user.id);
      }
      
      setLoading(false);
    };

    initSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      toast.success('Conta criada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logout realizado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer logout');
      throw error;
    }
  };

  // isSuperAdmin: user_roles.role === 'admin' (só o joel ou super admins globais)
  const isSuperAdmin = userRole === 'admin';
  
  // isOwner: user_restaurants.role === 'owner' (donos de restaurantes)
  const isOwner = restaurantRole === 'owner';
  
  // isAdmin: Super Admin OU Dono (ambos têm acesso administrativo)
  const isAdmin = isSuperAdmin || isOwner;
  
  // isManager: gerentes ou acima
  const isManager = isAdmin || userRole === 'manager' || restaurantRole === 'admin' || restaurantRole === 'manager';
  
  // isKitchen: cozinha
  const isKitchen = userRole === 'kitchen';

  const value = {
    user,
    session,
    userRole,
    restaurantRole,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isManager,
    isKitchen,
    isSuperAdmin,
    isOwner,
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
