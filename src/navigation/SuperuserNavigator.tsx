import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SuperuserDashboardScreen from '../screens/superuser/SuperuserDashboardScreen';
import SolicitudesScreen from '../screens/superuser/SolicitudesScreen';
import AllBusinessesScreen from '../screens/superuser/AllBusinessesScreen';
import DetalleSolicitudScreen from '../screens/superuser/DetalleSolicitudScreen';

const Stack = createStackNavigator();

export default function SuperuserNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="SuperuserDashboard" component={SuperuserDashboardScreen} />
            <Stack.Screen name="Solicitudes" component={SolicitudesScreen} />
            <Stack.Screen name="AllBusinesses" component={AllBusinessesScreen} />
            <Stack.Screen name="DetalleSolicitud" component={DetalleSolicitudScreen} />
        </Stack.Navigator>
    );
}
