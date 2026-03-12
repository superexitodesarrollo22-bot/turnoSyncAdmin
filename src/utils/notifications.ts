import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SDK 54: usar ExecutionEnvironment en lugar de appOwnership
const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotifications(
    userId: string
): Promise<string | null> {
    if (!Device.isDevice) {
        console.log('[Push] Solo funciona en dispositivo físico');
        return null;
    }

    if (isExpoGo) {
        console.log('[Push] Expo Go: remote push no disponible SDK53+.');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Push] Permiso denegado');
        return null;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('turnos', {
            name: 'Turnos',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#E94560',
            sound: 'default',
        });
    }

    try {
        // En Expo Go, no pasar projectId
        const tokenData = isExpoGo
            ? await Notifications.getExpoPushTokenAsync()
            : await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId,
            });

        const token = tokenData.data;
        console.log('[Push] Token:', token);

        const { data: existing } = await supabase
            .from('user_devices')
            .select('id')
            .eq('user_id', userId)
            .eq('expo_push_token', token)
            .maybeSingle();

        if (!existing) {
            await supabase
                .from('user_devices')
                .insert({ user_id: userId, expo_push_token: token });
        }

        return token;
    } catch (error) {
        // En Expo Go esto puede fallar sin projectId registrado - es normal
        console.log('[Push] Token no disponible en este entorno:', error);
        return null;
    }
}

export async function getNotificationMapping(appointmentId: string): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(`notif_map_${appointmentId}`);
    } catch (e) {
        return null;
    }
}

export async function removeNotificationMapping(appointmentId: string) {
    try {
        await AsyncStorage.removeItem(`notif_map_${appointmentId}`);
    } catch (e) { }
}

export async function scheduleAppointmentReminder(
    appointment: {
        id: string;
        clientName: string;
        serviceName: string;
        start_at: string;
    },
    reminderMinutes: number = 15
): Promise<string | null> {
    const startTime = new Date(appointment.start_at);
    const reminderTime = new Date(startTime.getTime() - reminderMinutes * 60 * 1000);

    if (reminderTime <= new Date()) return null;

    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: `⏰ Turno en ${reminderMinutes} minutos`,
                body: `${appointment.clientName} — ${appointment.serviceName}`,
                data: { appointmentId: appointment.id, type: 'reminder' },
                sound: 'default',
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderTime },
        });

        // Guardar mapeo para poder cancelar luego si es necesario
        await AsyncStorage.setItem(`notif_map_${appointment.id}`, notificationId);

        return notificationId;
    } catch (error) {
        console.log('[Push] Error programando recordatorio:', error);
        return null;
    }
}

export async function cancelAppointmentReminder(appointmentId: string) {
    try {
        const notificationId = await getNotificationMapping(appointmentId);
        if (notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
            await removeNotificationMapping(appointmentId);
        }
    } catch (e) { }
}

export async function cancelAllReminders() {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        // Nota: Idealmente limpiar AsyncStorage también pero para simplificar...
    } catch (e) { }
}
