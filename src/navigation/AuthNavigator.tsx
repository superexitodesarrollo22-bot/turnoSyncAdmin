import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RecuperarPasswordScreen from '../screens/auth/RecuperarPasswordScreen';
import SuscripcionScreen from '../screens/auth/SuscripcionScreen';
import NuevaPasswordScreen from '../screens/auth/NuevaPasswordScreen';

const Stack = createStackNavigator();

const AuthNavigator = () => {
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
