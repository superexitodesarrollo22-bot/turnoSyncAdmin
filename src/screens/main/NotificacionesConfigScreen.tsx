import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ScrollView,
    Linking,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast, { ToastRef } from '../../components/Toast';
import { cancelAllReminders } from '../../utils/notifications';

const REMINDER_OPTIONS = [
    { label: 'No recordar', value: 0 },
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
];

const NotificacionesConfigScreen = ({ navigation }: any) => {
    const { business, refreshBusiness } = useAuth();
    const toastRef = useRef<ToastRef>(null);

    const [loading, setLoading] = useState(false);
    const [globalEnabled, setGlobalEnabled] = useState(business?.push_notifications_enabled ?? true);
    const [reminderMinutes, setReminderMinutes] = useState(15);
    const [newAppointmentEnabled, setNewAppointmentEnabled] = useState(true);
    const [cancelledEnabled, setCancelledEnabled] = useState(true);

    useEffect(() => {
        loadLocalSettings();
    }, []);

    const loadLocalSettings = async () => {
        try {
            const reminder = await AsyncStorage.getItem('notif_reminder_minutes');
            const newApp = await AsyncStorage.getItem('notif_new_appointment');
            const cancelled = await AsyncStorage.getItem('notif_cancelled');

            if (reminder) setReminderMinutes(parseInt(reminder));
            if (newApp) setNewAppointmentEnabled(newApp === 'true');
            if (cancelled) setCancelledEnabled(cancelled === 'true');
        } catch (e) {
            console.error('Error loading local settings:', e);
        }
    };

    const saveLocalSetting = async (key: string, value: string) => {
        try {
            await AsyncStorage.setItem(key, value);
        } catch (e) {
            console.error('Error saving local setting:', e);
        }
    };

    const handleToggleGlobal = async (value: boolean) => {
        if (!business) return;
        setGlobalEnabled(value);
        setLoading(true);

        try {
            const { error } = await supabase
                .from('businesses')
                .update({ push_notifications_enabled: value })
                .eq('id', business.id);

            if (error) throw error;

            if (!value) {
                await cancelAllReminders();
            }

            refreshBusiness();
            toastRef.current?.show(`Notificaciones ${value ? 'activadas' : 'desactivadas'}`, 'info');
        } catch (error) {
            toastRef.current?.show('Error al actualizar preferencia', 'error');
            setGlobalEnabled(!value);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#FFFFFF', '#F5F5F0']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notificaciones</Text>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.section}>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="notifications" size={22} color="#E94560" />
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.cardTitle}>Notificaciones de turnos</Text>
                                <Text style={styles.cardSubtitle}>Recibe alertas sobre la actividad del negocio</Text>
                            </View>
                            <Switch
                                value={globalEnabled}
                                onValueChange={handleToggleGlobal}
                                trackColor={{ false: '#3A3A5A', true: '#E94560' }}
                                disabled={loading}
                            />
                        </View>
                    </View>
                </View>

                {globalEnabled && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recordatorios</Text>
                        <View style={styles.card}>
                            <View style={[styles.row, { marginBottom: 15 }]}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(74, 159, 255, 0.1)' }]}>
                                    <Ionicons name="time" size={22} color="#4A9FFF" />
                                </View>
                                <View style={styles.rowContent}>
                                    <Text style={styles.cardTitle}>Tiempo de alerta</Text>
                                    <Text style={styles.cardSubtitle}>Recibir aviso antes del turno</Text>
                                </View>
                                <Text style={styles.valueText}>{reminderMinutes === 0 ? 'Off' : `${reminderMinutes} min`}</Text>
                            </View>

                            <View style={styles.optionsGrid}>
                                {REMINDER_OPTIONS.map(opt => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[styles.optionBtn, reminderMinutes === opt.value && styles.optionBtnActive]}
                                        onPress={() => {
                                            setReminderMinutes(opt.value);
                                            saveLocalSetting('notif_reminder_minutes', opt.value.toString());
                                        }}
                                    >
                                        <Text style={[styles.optionText, reminderMinutes === opt.value && styles.optionTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Eventos</Text>
                        <View style={styles.card}>
                            <View style={styles.row}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(46, 204, 113, 0.1)' }]}>
                                    <Ionicons name="calendar-outline" size={22} color="#2ECC71" />
                                </View>
                                <View style={styles.rowContent}>
                                    <Text style={styles.cardTitle}>Nuevo turno agendado</Text>
                                    <Text style={styles.cardSubtitle}>Cuando un cliente reserva una cita</Text>
                                </View>
                                <Switch
                                    value={newAppointmentEnabled}
                                    onValueChange={(v) => {
                                        setNewAppointmentEnabled(v);
                                        saveLocalSetting('notif_new_appointment', v.toString());
                                    }}
                                    trackColor={{ false: '#3A3A5A', true: '#2ECC71' }}
                                />
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.row}>
                                <View style={[styles.iconContainer, { backgroundColor: 'rgba(233, 69, 96, 0.1)' }]}>
                                    <Ionicons name="close-circle" size={22} color="#E94560" />
                                </View>
                                <View style={styles.rowContent}>
                                    <Text style={styles.cardTitle}>Turno cancelado</Text>
                                    <Text style={styles.cardSubtitle}>Cuando un cliente cancela su reserva</Text>
                                </View>
                                <Switch
                                    value={cancelledEnabled}
                                    onValueChange={(v) => {
                                        setCancelledEnabled(v);
                                        saveLocalSetting('notif_cancelled', v.toString());
                                    }}
                                    trackColor={{ false: '#3A3A5A', true: '#E94560' }}
                                />
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Las notificaciones se programan localmente en tu dispositivo. Deben estar permitidas en la configuración del sistema móvil.
                    </Text>
                    <TouchableOpacity
                        style={styles.settingsBtn}
                        onPress={() => Linking.openSettings()}
                    >
                        <Ionicons name="settings" size={18} color="#4A9FFF" />
                        <Text style={styles.settingsBtnText}>Abrir configuración del sistema</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Toast ref={toastRef} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F0' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#DEDEDB' },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { padding: 5, marginRight: 15 },
    headerTitle: { color: '#1A1A1A', fontSize: 20, fontWeight: 'bold' },
    scroll: { padding: 20 },
    section: { marginBottom: 25 },
    sectionTitle: { color: '#5A5A5A', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 5 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#DEDEDB' },
    row: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(233, 69, 96, 0.1)', justifyContent: 'center', alignItems: 'center' },
    rowContent: { flex: 1, marginLeft: 15 },
    cardTitle: { color: '#1A1A1A', fontSize: 16, fontWeight: 'bold' },
    cardSubtitle: { color: '#5A5A5A', fontSize: 12, marginTop: 2 },
    valueText: { color: '#E94560', fontWeight: 'bold', fontSize: 14, marginRight: 10 },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginTop: 10 },
    optionBtn: { flex: 1, minWidth: '30%', backgroundColor: '#EDEDEA', borderRadius: 8, paddingVertical: 10, alignItems: 'center', margin: 5, borderWidth: 1, borderColor: '#DEDEDB' },
    optionBtnActive: { backgroundColor: '#E94560', borderColor: '#E94560' },
    optionText: { color: '#5A5A5A', fontSize: 12, fontWeight: '600' },
    optionTextActive: { color: 'white' },
    divider: { height: 1, backgroundColor: '#DEDEDB', marginVertical: 15 },
    footer: { marginTop: 10, paddingHorizontal: 10, alignItems: 'center' },
    footerText: { color: '#9A9A9A', fontSize: 12, textAlign: 'center', lineHeight: 18 },
    settingsBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 20, padding: 10 },
    settingsBtnText: { color: '#4A9FFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
});

export default NotificacionesConfigScreen;
