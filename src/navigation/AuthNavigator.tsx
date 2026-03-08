import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RecuperarPasswordScreen from '../screens/auth/RecuperarPasswordScreen';
import SuscripcionScreen from '../screens/auth/SuscripcionScreen';
import NuevaPasswordScreen from '../screens/auth/NuevaPasswordScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { useOnboarding } from '../hooks/useOnboarding';

const Stack = createStackNavigator();

const AuthNavigator = () => {
    const { shouldShowOnboarding, completeOnboarding, loading } = useOnboarding();

    // Mientras se lee AsyncStorage no renderizar nada
    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#6C63FF" />
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
                cardStyle: { backgroundColor: '#1A1A2E' },
                headerStyle: {
                    backgroundColor: '#1A1A2E',
                },
                headerTintColor: '#FFFFFF',
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
        </Stack.Navigator>
    );
};

export default AuthNavigator;
