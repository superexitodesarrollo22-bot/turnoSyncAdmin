import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import Toast, { ToastRef } from '../../components/Toast';
import { getInitials } from '../../utils/helpers';
import { cancelAllReminders } from '../../utils/notifications';

const TIMEZONES = [
    'America/Guayaquil',
    'America/Bogota',
    'America/Lima',
    'America/Mexico_City',
    'America/Buenos_Aires',
    'America/Santiago',
    'America/Caracas',
    'America/La_Paz',
    'America/Asuncion',
];

const PerfilScreen = ({ navigation }: any) => {
    const { userProfile, business, signOut, refreshBusiness, session } = useAuth();
    const toastRef = useRef<ToastRef>(null);

    // States Personal
    const [fullName, setFullName] = useState(userProfile?.full_name || '');
    const [isChangingPersonal, setIsChangingPersonal] = useState(false);

    // States Empresa
    const [bizName, setBizName] = useState(business?.name || '');
    const [bizDesc, setBizDesc] = useState(business?.description || '');
    const [bizAddress, setBizAddress] = useState(business?.address || '');
    const [bizPhone, setBizPhone] = useState(business?.phone || '');
    const [bizWhatsapp, setBizWhatsapp] = useState(business?.whatsapp || '');
    const [bizTimezone, setBizTimezone] = useState(business?.timezone || 'America/Guayaquil');
    const [isLoading, setIsLoading] = useState(false);

    // States Password Modal

    // Checks for changes
    const hasPersonalChanges = fullName !== userProfile?.full_name;
    const hasBusinessChanges =
        bizName !== business?.name ||
        bizDesc !== (business?.description || '') ||
        bizAddress !== (business?.address || '') ||
        bizPhone !== (business?.phone || '') ||
        bizWhatsapp !== (business?.whatsapp || '') ||
        bizTimezone !== business?.timezone;

    const handleUpdateProfile = async () => {
        if (!userProfile) return;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ full_name: fullName })
                .eq('id', userProfile.id);

            if (error) throw error;
            toastRef.current?.show('Perfil actualizado', 'success');
            await refreshBusiness();
        } catch (error: any) {
            toastRef.current?.show(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateBusiness = async () => {
        if (!business) return;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    name: bizName,
                    description: bizDesc,
                    address: bizAddress,
                    phone: bizPhone,
                    whatsapp: bizWhatsapp,
                    timezone: bizTimezone,
                })
                .eq('id', business.id);

            if (error) throw error;

            await supabase.from('audit_logs').insert({
                business_id: business.id,
                user_id: userProfile?.id,
                action: 'business_updated',
                metadata: {
                    updated_at: new Date().toISOString()
                }
            });

            toastRef.current?.show('Datos del negocio actualizados', 'success');
            await refreshBusiness();
        } catch (error: any) {
            toastRef.current?.show(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };


    const handleSignOut = () => {
        Alert.alert(
            'Cerrar sesión',
            '¿Estás seguro que deseas cerrar sesión?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cerrar sesión',
                    style: 'destructive',
                    onPress: async () => {
                        await cancelAllReminders();
                        signOut();
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LinearGradient colors={['#FFFFFF', '#F5F5F0']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Mi Perfil</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.profileHeader}>
                    <View style={styles.avatarBig}>
                        <Text style={styles.avatarTextBig}>{getInitials(userProfile?.full_name || '')}</Text>
                    </View>
                    <Text style={styles.adminName}>{userProfile?.full_name}</Text>
                    <Text style={styles.adminEmail}>{userProfile?.email}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>ADMINISTRADOR</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View>
                    {/* Datos Personales */}
                    <SectionTitle title="Mis datos personales" />
                    <View style={styles.card}>
                        <Label text="Nombre completo" />
                        <TextInput
                            style={styles.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Tu nombre"
                            placeholderTextColor="#9A9A9A"
                        />

                        <Label text="Email" />
                        <View style={[styles.input, styles.inputDisabled]}>
                            <Ionicons name="lock-closed" size={16} color="#9A9A9A" style={{ marginRight: 10 }} />
                            <Text style={{ color: '#9A9A9A' }}>{userProfile?.email}</Text>
                        </View>
                        <Text style={styles.infoText}>Para cambiar tu email contacta al soporte.</Text>

                        {hasPersonalChanges && (
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleUpdateProfile}
                                disabled={isLoading}
                            >
                                {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Guardar cambios</Text>}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Datos del Negocio */}
                    <SectionTitle title="Datos de mi empresa" />
                    <View style={styles.card}>
                        <Label text="Nombre de la empresa" />
                        <TextInput
                            style={styles.input}
                            value={bizName}
                            onChangeText={setBizName}
                            placeholder="Nombre"
                            placeholderTextColor="#9A9A9A"
                        />

                        <Label text="Descripción" />
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            value={bizDesc}
                            onChangeText={setBizDesc}
                            placeholder="Breve descripción..."
                            placeholderTextColor="#9A9A9A"
                            multiline
                            maxLength={200}
                        />

                        <Label text="Dirección" />
                        <TextInput
                            style={styles.input}
                            value={bizAddress}
                            onChangeText={setBizAddress}
                            placeholder="Dirección física"
                            placeholderTextColor="#9A9A9A"
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Label text="Teléfono" />
                                <TextInput
                                    style={styles.input}
                                    value={bizPhone}
                                    onChangeText={setBizPhone}
                                    placeholder="Teléfono"
                                    placeholderTextColor="#9A9A9A"
                                    keyboardType="phone-pad"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Label text="WhatsApp" />
                                <TextInput
                                    style={styles.input}
                                    value={bizWhatsapp}
                                    onChangeText={setBizWhatsapp}
                                    placeholder="WhatsApp"
                                    placeholderTextColor="#9A9A9A"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <Label text="Zona horaria" />
                        <View style={styles.timezonePicker}>
                            {TIMEZONES.map(tz => (
                                <TouchableOpacity
                                    key={tz}
                                    style={[styles.tzItem, bizTimezone === tz && styles.tzItemActive]}
                                    onPress={() => setBizTimezone(tz)}
                                >
                                    <Text style={[styles.tzText, bizTimezone === tz && styles.tzTextActive]}>{tz.split('/')[1].replace('_', ' ')}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {hasBusinessChanges && (
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleUpdateBusiness}
                                disabled={isLoading}
                            >
                                {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Guardar datos del negocio</Text>}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Configuración */}
                    <SectionTitle title="Configuración" />
                    <View style={styles.card}>
                        <MenuItem
                            icon="notifications-outline"
                            title="Notificaciones push"
                            onPress={() => navigation.navigate('NotificacionesConfig')}
                        />
                        <View style={styles.divider} />
                        <MenuItem
                            icon="document-text-outline"
                            title="Términos y condiciones"
                            onPress={() => Alert.alert('Términos', 'Contenido de los términos y condiciones de la plataforma.')}
                        />
                        <View style={styles.divider} />
                        <MenuItem
                            icon="information-circle-outline"
                            title="Acerca de TurnoSync Admin"
                            onPress={() => Alert.alert('Acerca de', 'TurnoSync Admin v1.0.0\nSistema de gestión de turnos profesional.')}
                        />
                    </View>

                    <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={20} color="#E94560" />
                        <Text style={styles.signOutText}>Cerrar sesión</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>Versión 1.0.0 (Building with Antigravity)</Text>
                </View>
            </ScrollView>


            <Toast ref={toastRef} />
        </KeyboardAvoidingView>
    );
};

const SectionTitle = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
);

const Label = ({ text }: { text: string }) => (
    <Text style={styles.label}>{text}</Text>
);

const MenuItem = ({ icon, title, onPress }: { icon: any, title: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuItemLeft}>
            <Ionicons name={icon} size={20} color="#5A5A5A" />
            <Text style={styles.menuItemText}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#DEDEDB" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F0' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 30, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#DEDEDB' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { padding: 5 },
    headerTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: 'bold' },
    profileHeader: { alignItems: 'center', marginTop: 20 },
    avatarBig: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 10, shadowColor: '#E94560', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    avatarTextBig: { color: 'white', fontSize: 28, fontWeight: 'bold' },
    adminName: { color: '#1A1A1A', fontSize: 22, fontWeight: 'bold' },
    adminEmail: { color: '#5A5A5A', fontSize: 14, marginTop: 4 },
    badge: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#E94560' },
    badgeText: { color: '#E94560', fontSize: 10, fontWeight: 'bold' },
    scroll: { padding: 20, paddingBottom: 60 },
    sectionTitle: { color: '#5A5A5A', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 15, marginTop: 10 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 25, borderWidth: 1, borderColor: '#DEDEDB' },
    label: { color: '#9A9A9A', fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
    input: { backgroundColor: '#EDEDEA', borderRadius: 12, borderWidth: 1, borderColor: '#DEDEDB', color: '#1A1A1A', padding: 14, fontSize: 15, height: 50 },
    inputDisabled: { flexDirection: 'row', alignItems: 'center', opacity: 0.7 },
    infoText: { color: '#9A9A9A', fontSize: 11, marginTop: 8, fontStyle: 'italic' },
    saveBtn: { height: 52, backgroundColor: '#E94560', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    row: { flexDirection: 'row', marginTop: 15 },
    timezonePicker: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    tzItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EDEDEA', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#DEDEDB' },
    tzItemActive: { backgroundColor: '#E94560', borderColor: '#E94560' },
    tzText: { color: '#5A5A5A', fontSize: 12 },
    tzTextActive: { color: 'white', fontWeight: 'bold' },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
    menuItemText: { color: '#1A1A1A', fontSize: 15, marginLeft: 15 },
    divider: { height: 1, backgroundColor: '#DEDEDB', marginVertical: 4 },
    signOutBtn: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: '#E94560', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    signOutText: { color: '#E94560', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    versionText: { color: '#BCBCBC', fontSize: 11, textAlign: 'center', marginTop: 30 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: '#DEDEDB' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: 'bold' },
});

export default PerfilScreen;
