import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/main/DashboardScreen';
import ServiciosScreen from '../screens/main/ServiciosScreen';
import HorariosScreen from '../screens/main/HorariosScreen';
import TurnosScreen from '../screens/main/TurnosScreen';
import PerfilScreen from '../screens/main/PerfilScreen';
import NotificacionesConfigScreen from '../screens/main/NotificacionesConfigScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;

                    if (route.name === 'Inicio') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Turnos') {
                        iconName = focused ? 'clipboard' : 'clipboard-outline';
                    } else if (route.name === 'Servicios') {
                        iconName = focused ? 'cut' : 'cut-outline';
                    } else if (route.name === 'Horarios') {
                        iconName = focused ? 'calendar' : 'calendar-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#E94560',
                tabBarInactiveTintColor: '#A0A0B0',
                tabBarStyle: {
                    backgroundColor: '#16213E',
                    borderTopColor: '#2A2A4A',
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                },
            })}
        >
            <Tab.Screen name="Inicio" component={DashboardScreen} />
            <Tab.Screen name="Turnos" component={TurnosScreen} />
            <Tab.Screen name="Servicios" component={ServiciosScreen} />
            <Tab.Screen name="Horarios" component={HorariosScreen} />
        </Tab.Navigator>
    );
};

const MainNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            }}
        >
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen
                name="Perfil"
                component={PerfilScreen}
                options={{
                    cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS
                }}
            />
            <Stack.Screen
                name="NotificacionesConfig"
                component={NotificacionesConfigScreen}
            />
        </Stack.Navigator>
    );
};

export default MainNavigator;
