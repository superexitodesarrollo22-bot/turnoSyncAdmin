import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { UserProfile, Business } from '../types';
import { registerForPushNotifications } from '../utils/notifications';

interface AuthContextType {
    session: Session | null;
    userProfile: UserProfile | null;
    business: Business | null;
    isSuperuser: boolean;
    loading: boolean;
    expoPushToken: string | null;
    signOut: () => Promise<void>;
    refreshBusiness: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [isSuperuser, setIsSuperuser] = useState(false);
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadUserData = useCallback(async (userId: string) => {
        try {
            // Cargar Perfil
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('supabase_auth_uid', userId)
                .single();

            if (profileError) throw profileError;
            setUserProfile(profile);

            // Detectar superuser
            if (profile?.is_superuser) {
                setIsSuperuser(true);
                setBusiness(null);
                // No registrar push ni cargar business para el superuser
                return;
            }

            // Flujo normal para admins
            setIsSuperuser(false);

            // Registro de notificaciones
            const token = await registerForPushNotifications(profile.id);
            setExpoPushToken(token);

            // Cargar Negocio asociado (vía business_users)
            const { data: bizUser, error: bizError } = await supabase
                .from('business_users')
                .select('business_id, businesses(*)')
                .eq('user_id', profile.id)
                .in('role', ['admin', 'owner'])
                .single();

            if (bizUser && bizUser.businesses) {
                setBusiness(bizUser.businesses as unknown as Business);
            } else {
                setBusiness(null);
            }
        } catch (error: any) {
            console.error('Error loading user data:', error.message);
            setBusiness(null);
        }
    }, []);

    const refreshBusiness = async () => {
        if (userProfile && session) {
            await loadUserData(session!.user.id);
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                setSession(initialSession);

                if (initialSession) {
                    await loadUserData(initialSession.user.id);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session) {
                await loadUserData(session.user.id);
            } else {
                setUserProfile(null);
                setBusiness(null);
                setIsSuperuser(false);
                setExpoPushToken(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [loadUserData]);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            setSession(null);
            setUserProfile(null);
            setBusiness(null);
            setIsSuperuser(false);
            setExpoPushToken(null);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ session, userProfile, business, isSuperuser, loading, expoPushToken, signOut, refreshBusiness }}>
            {children}
        </AuthContext.Provider>
    );
};
