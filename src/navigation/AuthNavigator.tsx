import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RecuperarPasswordScreen from '../screens/auth/RecuperarPasswordScreen';
import SuscripcionScreen from '../screens/auth/SuscripcionScreen';
import NuevaPasswordScreen from '../screens/auth/NuevaPasswordScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { useOnboarding } from '../hooks/useOnboarding';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createStackNavigator();

const AuthNavigator = () => {
    const { shouldShowOnboarding, completeOnboarding, loading } = useOnboarding();

    // Mientras se lee AsyncStorage no renderizar nada
    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#E94560" />
            </View>
        );
    }

    // Primera vez → mostrar onboarding antes del stack de auth
    if (shouldShowOnboarding) {
        return <OnboardingScreen onDone={completeOnboarding} />;
    }

    return (
        <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: '#FFFFFF' },
                headerStyle: {
                    backgroundColor: '#FFFFFF',
                },
                headerTintColor: '#1A1A1A',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
                name="RecuperarPassword"
                component={RecuperarPasswordScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Suscripcion"
                component={SuscripcionScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="NuevaPassword"
                component={NuevaPasswordScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
};

export default AuthNavigator;
