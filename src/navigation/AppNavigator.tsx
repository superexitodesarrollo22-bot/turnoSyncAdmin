import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { StatusBar } from 'react-native';
import { supabase } from '../config/supabase';
import SplashScreen from '../screens/SplashScreen';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import SuperuserNavigator from './SuperuserNavigator';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Detectar si estamos en Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Prefijo de la URL según el entorno
const prefix = isExpoGo
    ? Linking.createURL('/')           // exp://192.168.x.x:8081/
    : 'turnosyncadmin://';             // turnosyncadmin://

// Configuración del linking para React Navigation
export const linkingConfig = {
    prefixes: [prefix, 'turnosyncadmin://'],
    config: {
        screens: {
            Auth: {
                screens: {
                    NuevaPassword: 'reset-password',
                },
            },
        },
    },
};

const Stack = createStackNavigator();
export const navigationRef = createNavigationContainerRef<any>();

type AppStage = 'splash' | 'auth' | 'onboarding' | 'main' | 'superuser';

const AppNavigator = () => {
    const { session, business, isSuperuser, loading } = useAuth();
    const [stage, setStage] = useState<AppStage>('splash');

    const checkNavigationState = useCallback(async () => {
        if (!session) {
            setStage('auth');
            return;
        }

        if (isSuperuser) {
            setStage('superuser');
            return;
        }

        if (business) {
            // 1. Verificar si ya marcó el onboarding como hecho localmente
            const doneKey = `onboarding_done_${business.id}`;
            const isDone = await AsyncStorage.getItem(doneKey);

            if (isDone === 'true') {
                setStage('main');
                return;
            }

            // 2. Si no hay registro local, verificar en DB si es realmente nuevo
            try {
                const [{ count: servicesCount }, { count: schedulesCount }] = await Promise.all([
                    supabase
                        .from('services')
                        .select('id', { count: 'exact', head: true })
                        .eq('business_id', business.id),
                    supabase
                        .from('schedules')
                        .select('id', { count: 'exact', head: true })
                        .eq('business_id', business.id),
                ]);

                if ((servicesCount === 0 || schedulesCount === 0) && isDone !== 'skipped') {
                    setStage('onboarding');
                } else {
                    setStage('main');
                }
            } catch (error) {
                console.error('Error checking new admin status:', error);
                setStage('main'); // El error de RLS puede caer aquí, vamos a main
            }
            return;
        }

        // NUEVO: Manejar caso donde hay sesión pero no hay business
        if (session && !business) {
            setStage('auth');
            return;
        }
    }, [session, business, isSuperuser]);

    // Timeout de seguridad para el Splash Screen (6 segundos máximo)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (stage === 'splash') {
                console.warn('[Safety] Splash timeout triggered. Forcing transition.');
                handleSplashFinish();
            }
        }, 6000);
        return () => clearTimeout(timer);
    }, [stage]);

    useEffect(() => {
        if (stage !== 'splash' && !loading) {
            checkNavigationState();
        }
    }, [session, business, isSuperuser, loading, stage, checkNavigationState]);

    // Manejo de Deep Links
    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            const url = event.url;
            const parsed = Linking.parse(url);

            if (parsed.hostname === 'reset-password' || parsed.path === 'reset-password') {
                if (navigationRef.isReady()) {
                    navigationRef.navigate('Auth', { screen: 'NuevaPassword' });
                }
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        return () => subscription.remove();
    }, []);

    // Manejo de Notificaciones
    useEffect(() => {
        if (isExpoGo) return;

        // Listener: usuario TOCA la notificación (app cerrada o en background)
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (!data?.appointmentId) return;

            const type = data.type as string;

            if (type === 'new_appointment' || type === 'reminder_admin') {
                // Delay para que NavigationContainer esté listo tras arranque en frío
                setTimeout(() => {
                    if (navigationRef.isReady()) {
                        navigationRef.dispatch(
                            CommonActions.navigate('Main', {
                                screen: 'Turnos',
                                params: { appointmentId: data.appointmentId },
                            })
                        );
                    }
                }, 500);
            }
        });

        // Listener: notificación recibida con app en PRIMER PLANO
        const foregroundSub = Notifications.addNotificationReceivedListener(notification => {
            console.log(
                '[Push] Notificación en primer plano:',
                notification.request.content.title
            );
        });

        return () => {
            responseSubscription.remove();
            foregroundSub.remove();
        };
    }, []);

    const handleSplashFinish = () => {
        if (!session) {
            setStage('auth');
        } else if (isSuperuser) {
            setStage('superuser');
        } else if (business) {
            checkNavigationState();
        } else {
            // Caso de error en carga o sin negocio
            setStage('auth');
        }
    };

    if (stage === 'splash') {
        return <SplashScreen onFinish={handleSplashFinish} />;
    }

    return (
        <NavigationContainer ref={navigationRef} linking={linkingConfig}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" translucent />
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
                    gestureEnabled: false,
                }}
            >
                {stage === 'auth' ? (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                ) : stage === 'superuser' ? (
                    <Stack.Screen name="Superuser" component={SuperuserNavigator} />
                ) : stage === 'onboarding' ? (
                    <Stack.Screen name="Onboarding">
                        {() => <OnboardingNavigator onComplete={() => setStage('main')} />}
                    </Stack.Screen>
                ) : (
                    <Stack.Screen name="Main" component={MainNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
