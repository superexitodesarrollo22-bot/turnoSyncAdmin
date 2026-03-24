import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Switch,
    Animated as NativeAnimated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { registerForPushNotifications } from '../../utils/notifications';
import { formatCurrency } from '../../utils/helpers';
import Toast, { ToastRef } from '../../components/Toast';

const { width } = Dimensions.get('window');

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];
const INTERVAL_OPTIONS = [15, 30, 60];

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
    const { business, userProfile, refreshBusiness } = useAuth();
    const toastRef = useRef<ToastRef>(null);

    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Animación de pasos
    const stepOpacity = useRef(new NativeAnimated.Value(1)).current;

    const animateStepChange = (newStep: number) => {
        NativeAnimated.sequence([
            NativeAnimated.timing(stepOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            NativeAnimated.timing(stepOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
        setStep(newStep);
    };

    // Step 1: Business Data
    const [bizName, setBizName] = useState(business?.name || '');
    const [bizDesc, setBizDesc] = useState(business?.description || '');
    const [bizPhone, setBizPhone] = useState(business?.phone || '');
    const [bizWhatsapp, setBizWhatsapp] = useState(business?.whatsapp || '');
    const [bizAddress, setBizAddress] = useState(business?.address || '');

    // Step 2: First Service
    const [services, setServices] = useState<any[]>([]);
    const [currServiceName, setCurrServiceName] = useState('');
    const [currServiceDuration, setCurrServiceDuration] = useState(30);
    const [currServicePrice, setCurrServicePrice] = useState('');

    // Step 3: Schedules
    const [standardOption, setStandardOption] = useState(0); // 0: Mon-Fri, 1: Mon-Sat, 2: All days
    const [slotInterval, setSlotInterval] = useState(30);

    const nextStep = () => animateStepChange(step + 1);

    const handleSaveBusiness = async () => {
        if (!business) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    name: bizName,
                    description: bizDesc,
                    phone: bizPhone,
                    whatsapp: bizWhatsapp,
                    address: bizAddress,
                })
                .eq('id', business.id);

            if (error) throw error;
            await refreshBusiness();
            nextStep();
        } catch (error: any) {
            toastRef.current?.show('Error al guardar datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const addService = () => {
        if (currServiceName.trim().length < 2) {
            toastRef.current?.show('Nombre de servicio inválido', 'error');
            return;
        }
        const newService = {
            name: currServiceName.trim(),
            duration_minutes: currServiceDuration,
            price_cents: Math.round(parseFloat(currServicePrice || '0') * 100),
            active: true,
            business_id: business?.id
        };
        setServices([...services, newService]);
        setCurrServiceName('');
        setCurrServicePrice('');
        setCurrServiceDuration(30);
    };

    const removeService = (index: number) => {
        setServices(services.filter((_, i) => i !== index));
    };

    const handleSaveServices = async () => {
        if (services.length === 0) {
            Alert.alert('¿Continuar?', 'No has agregado ningún servicio. Podrás hacerlo después, pero los clientes no podrán reservar aún.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Omitir', onPress: nextStep }
            ]);
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('services').insert(services);
            if (error) throw error;
            nextStep();
        } catch (error: any) {
            toastRef.current?.show('Error al guardar servicios', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSchedules = async () => {
        if (!business) return;
        setLoading(true);
        try {
            await supabase.from('schedules').delete().eq('business_id', business.id);

            let daysToCreate = [];
            if (standardOption === 0) daysToCreate = [1, 2, 3, 4, 5]; // Mon-Fri
            else if (standardOption === 1) daysToCreate = [1, 2, 3, 4, 5, 6]; // Mon-Sat
            else daysToCreate = [0, 1, 2, 3, 4, 5, 6]; // All days

            const scheduleRecords = daysToCreate.map(day => ({
                business_id: business.id,
                weekday: day,
                start_time: '09:00:00',
                end_time: '18:00:00'
            }));

            const { error: scError } = await supabase.from('schedules').insert(scheduleRecords);
            if (scError) throw scError;

            const { error: bizError } = await supabase
                .from('businesses')
                .update({ slot_interval_minutes: slotInterval })
                .eq('id', business.id);
            if (bizError) throw bizError;

            nextStep();
        } catch (error: any) {
            toastRef.current?.show('Error al configurar horarios', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleNotifs = async (activate: boolean) => {
        if (activate && userProfile) {
            const token = await registerForPushNotifications(userProfile.id);
            if (token) {
                toastRef.current?.show('Notificaciones activadas', 'success');
            } else {
                toastRef.current?.show('Se requiere permiso para notificaciones', 'error');
            }
        }
        nextStep();
    };

    const handleFinish = async () => {
        if (!business) return;
        setLoading(true);
        try {
            const key = `onboarding_done_${business.id}`;
            await AsyncStorage.setItem(key, 'true');
            onComplete();
        } catch (error) {
            onComplete();
        }
    };

    const handleSkip = () => {
        Alert.alert(
            'Saltar configuración',
            'Podrás completar la configuración desde el panel de administración. ¿Deseas continuar sin configurar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, ir al panel',
                    onPress: async () => {
                        if (business) {
                            await AsyncStorage.setItem(`onboarding_done_${business.id}`, 'skipped');
                        }
                        onComplete();
                    }
                }
            ]
        );
    };

    const renderStepIndicators = (activeIdx: number) => (
        <View style={styles.indicators}>
            {[0, 1, 2, 3].map(i => (
                <View key={i} style={[styles.dot, activeIdx >= i && styles.dotActive]} />
            ))}
        </View>
    );

    const renderWelcome = () => (
        <NativeAnimated.View style={[styles.stepContent, { opacity: stepOpacity }]}>
            <View style={styles.welcomeHero}>
                <Ionicons name="rocket-outline" size={100} color="#E94560" />
                <Text style={styles.title}>¡Bienvenido a TurnoSync Admin!</Text>
                <Text style={styles.subtitle}>Hola, {userProfile?.full_name || 'Admin'}</Text>
                <Text style={styles.heroText}>
                    Tu cuenta ha sido activada para <Text style={{ color: '#1A1A1A', fontWeight: 'bold' }}>{business?.name}</Text>.
                    Vamos a configurar tu negocio en 3 pasos rápidos para que puedas empezar a recibir turnos hoy mismo.
                </Text>
            </View>
            <TouchableOpacity style={styles.mainBtn} onPress={nextStep}>
                <LinearGradient colors={['#E94560', '#C73652']} style={styles.btnGradient}>
                    <Text style={styles.mainBtnText}>¡Empecemos!</Text>
                </LinearGradient>
            </TouchableOpacity>
        </NativeAnimated.View>
    );

    const renderBusinessData = () => (
        <NativeAnimated.View style={[styles.stepContent, { opacity: stepOpacity }]}>
            {renderStepIndicators(0)}
            <Text style={styles.stepTitle}>Datos de tu empresa</Text>
            <Text style={styles.stepSubtitle}>Tus clientes verán esta información al reservar.</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre de la empresa *</Text>
                    <TextInput style={styles.input} value={bizName} onChangeText={setBizName} />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descripción breve</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                        multiline value={bizDesc} onChangeText={setBizDesc}
                        placeholder="Ej: La mejor barbería de la ciudad con café gratis."
                        placeholderTextColor="#606070"
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>WhatsApp de contacto</Text>
                    <TextInput style={styles.input} value={bizWhatsapp} onChangeText={setBizWhatsapp} keyboardType="phone-pad" />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Dirección física</Text>
                    <TextInput style={styles.input} value={bizAddress} onChangeText={setBizAddress} />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipText}>Configurar después</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={handleSaveBusiness} disabled={loading}>
                    <LinearGradient colors={['#E94560', '#C73652']} style={styles.nextBtnGradient}>
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.nextBtnText}>Guardar y continuar →</Text>}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </NativeAnimated.View>
    );

    const renderServices = () => (
        <NativeAnimated.View style={[styles.stepContent, { opacity: stepOpacity }]}>
            {renderStepIndicators(1)}
            <Text style={styles.stepTitle}>¿Qué servicios ofreces?</Text>
            <Text style={styles.stepSubtitle}>Agrega al menos uno para que tus clientes puedan reservar.</Text>

            <View style={styles.miniForm}>
                <TextInput
                    style={styles.miniInput}
                    placeholder="Nombre: Ej. Corte de cabello"
                    placeholderTextColor="#606070"
                    value={currServiceName}
                    onChangeText={setCurrServiceName}
                />
                <View style={styles.durationRow}>
                    {DURATION_OPTIONS.map(d => (
                        <TouchableOpacity
                            key={d}
                            style={[styles.durBtn, currServiceDuration === d && styles.durBtnActive]}
                            onPress={() => setCurrServiceDuration(d)}
                        >
                            <Text style={[styles.durBtnText, currServiceDuration === d && styles.durBtnTextActive]}>{d}</Text>
                        </TouchableOpacity>
                    ))}
                    <Text style={{ color: '#A0A0B0', marginLeft: 8 }}>min</Text>
                </View>
                <View style={styles.priceMiniRow}>
                    <Text style={styles.currency}>$</Text>
                    <TextInput
                        style={styles.miniInputPrice}
                        placeholder="Precio: 15.00"
                        placeholderTextColor="#606070"
                        keyboardType="decimal-pad"
                        value={currServicePrice}
                        onChangeText={setCurrServicePrice}
                    />
                    <TouchableOpacity style={styles.addServiceBtn} onPress={addService}>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.listLabel}>Servicios agregados:</Text>
            <ScrollView style={styles.servicesListScroll}>
                {services.map((s, i) => (
                    <View key={i} style={styles.serviceChip}>
                        <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
                        <Text style={styles.serviceChipText}>{s.name} • {s.duration_minutes}m • {formatCurrency(s.price_cents)}</Text>
                        <TouchableOpacity onPress={() => removeService(i)}>
                            <Ionicons name="close-circle" size={18} color="#E94560" />
                        </TouchableOpacity>
                    </View>
                ))}
                {services.length === 0 && <Text style={styles.emptyText}>Aún no has agregado servicios.</Text>}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipText}>Configurar después</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={handleSaveServices} disabled={loading}>
                    <LinearGradient colors={['#E94560', '#C73652']} style={styles.nextBtnGradient}>
                        <Text style={styles.nextBtnText}>Siguiente →</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </NativeAnimated.View>
    );

    const renderSchedules = () => (
        <NativeAnimated.View style={[styles.stepContent, { opacity: stepOpacity }]}>
            {renderStepIndicators(2)}
            <Text style={styles.stepTitle}>¿Cuándo atiendes?</Text>
            <Text style={styles.stepSubtitle}>Configura rápidamente tus días y horarios.</Text>

            <View style={styles.scheduleOptions}>
                {[
                    'Lunes a Viernes 9:00 - 18:00',
                    'Lunes a Sábado 9:00 - 18:00',
                    'Todos los días 9:00 - 18:00'
                ].map((opt, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.schedOpt, standardOption === i && styles.schedOptActive]}
                        onPress={() => setStandardOption(i)}
                    >
                        <Ionicons name={standardOption === i ? "radio-button-on" : "radio-button-off"} size={20} color={standardOption === i ? "#E94560" : "#A0A0B0"} />
                        <Text style={[styles.schedOptText, standardOption === i && styles.schedOptTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.labelInterval}>¿Cada cuánto tiempo agendas un turno?</Text>
            <View style={styles.intervalGrid}>
                {INTERVAL_OPTIONS.map(val => (
                    <TouchableOpacity
                        key={val}
                        style={[styles.intBtn, slotInterval === val && styles.intBtnActive]}
                        onPress={() => setSlotInterval(val)}
                    >
                        <Text style={[styles.intBtnText, slotInterval === val && styles.intBtnTextActive]}>{val} min</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipText}>Configurar después</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={handleSaveSchedules} disabled={loading}>
                    <LinearGradient colors={['#E94560', '#C73652']} style={styles.nextBtnGradient}>
                        <Text style={styles.nextBtnText}>Finalizar setup →</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </NativeAnimated.View>
    );

    const renderNotifications = () => (
        <NativeAnimated.View style={[styles.stepContent, { opacity: stepOpacity }]}>
            {renderStepIndicators(3)}
            <View style={styles.notifHero}>
                <Ionicons name="notifications-outline" size={80} color="#4A9FFF" />
                <Text style={styles.stepTitle}>¿Recibir alertas de turnos?</Text>
                <Text style={styles.stepSubtitle}>
                    Te notificaremos cuando un cliente agende o cancele un turno, y 15 minutos antes de cada cita.
                </Text>
            </View>

            <View style={styles.notifActions}>
                <TouchableOpacity style={styles.mainBtn} onPress={() => handleNotifs(true)}>
                    <LinearGradient colors={['#4A9FFF', '#3477F5']} style={styles.btnGradient}>
                        <Text style={styles.mainBtnText}>Activar notificaciones</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mainBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3A3A5A', marginTop: 15 }]} onPress={() => handleNotifs(false)}>
                    <Text style={[styles.mainBtnText, { color: '#A0A0B0' }]}>Ahora no</Text>
                </TouchableOpacity>
            </View>
        </NativeAnimated.View>
    );

    const renderSuccess = () => (
        <NativeAnimated.View style={[styles.stepContent, { opacity: stepOpacity }]}>
            <View style={styles.successHero}>
                <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={60} color="white" />
                </View>
                <Text style={styles.title}>¡Todo listo!</Text>
                <Text style={styles.heroText}>Tu negocio está configurado y listo para recibir clientes.</Text>
            </View>

            <View style={styles.nameCard}>
                <Text style={styles.nameCardLabel}>Tus clientes te buscarán como:</Text>
                <Text style={styles.nameCardVal}>"{business?.name}"</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={() => toastRef.current?.show('Nombre copiado', 'success')}>
                    <Ionicons name="copy-outline" size={16} color="#4A9FFF" />
                    <Text style={styles.copyText}>Copiar nombre</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.mainBtn, { marginTop: 40 }]} onPress={handleFinish}>
                <LinearGradient colors={['#E94560', '#C73652']} style={styles.btnGradient}>
                    <Text style={styles.mainBtnText}>Ir al panel de administración</Text>
                </LinearGradient>
            </TouchableOpacity>
        </NativeAnimated.View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#FFFFFF', '#F5F5F0']} style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.safeArea}>
                        {step === 0 && renderWelcome()}
                        {step === 1 && renderBusinessData()}
                        {step === 2 && renderServices()}
                        {step === 3 && renderSchedules()}
                        {step === 4 && renderNotifications()}
                        {step === 5 && renderSuccess()}
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
            <Toast ref={toastRef} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1, padding: 30, paddingTop: 60 },
    stepContent: { flex: 1, justifyContent: 'center' },
    indicators: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DEDEDB', marginHorizontal: 4 },
    dotActive: { backgroundColor: '#E94560' },
    welcomeHero: { alignItems: 'center', marginBottom: 40 },
    title: { color: '#1A1A1A', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
    subtitle: { color: '#E94560', fontSize: 18, fontWeight: '600', marginTop: 10 },
    heroText: { color: '#5A5A5A', fontSize: 16, textAlign: 'center', marginTop: 20, lineHeight: 24 },
    mainBtn: { height: 56, borderRadius: 15, overflow: 'hidden' },
    btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mainBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    stepTitle: { color: '#1A1A1A', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    stepSubtitle: { color: '#5A5A5A', fontSize: 15, marginBottom: 30 },
    formScroll: { flex: 1 },
    inputGroup: { marginBottom: 20 },
    label: { color: '#1A1A1A', fontSize: 14, fontWeight: '600', marginBottom: 10 },
    input: { backgroundColor: '#FFFFFF', height: 50, borderRadius: 12, paddingHorizontal: 15, color: '#1A1A1A', fontSize: 16, borderWidth: 1, borderColor: '#DEDEDB' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20 },
    skipBtn: { padding: 10 },
    skipText: { color: '#9A9A9A', fontSize: 14, textDecorationLine: 'underline' },
    nextBtn: { height: 50, borderRadius: 12, overflow: 'hidden', paddingHorizontal: 20 },
    nextBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    nextBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    miniForm: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#DEDEDB' },
    miniInput: { backgroundColor: '#F5F5F0', height: 45, borderRadius: 10, paddingHorizontal: 15, color: '#1A1A1A', marginBottom: 15, borderWidth: 1, borderColor: '#DEDEDB' },
    durationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    durBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EDEDEA', marginRight: 6 },
    durBtnActive: { backgroundColor: '#E94560' },
    durBtnText: { color: '#5A5A5A', fontSize: 12 },
    durBtnTextActive: { color: 'white', fontWeight: 'bold' },
    priceMiniRow: { flexDirection: 'row', alignItems: 'center' },
    currency: { color: '#5A5A5A', fontSize: 18, marginRight: 8 },
    miniInputPrice: { flex: 1, backgroundColor: '#F5F5F0', height: 45, borderRadius: 10, paddingHorizontal: 15, color: '#1A1A1A', borderWidth: 1, borderColor: '#DEDEDB' },
    addServiceBtn: { backgroundColor: '#E94560', width: 45, height: 45, borderRadius: 10, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
    listLabel: { color: '#5A5A5A', fontSize: 13, marginBottom: 10 },
    servicesListScroll: { maxHeight: 150 },
    serviceChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#DEDEDB' },
    serviceChipText: { flex: 1, color: '#1A1A1A', fontSize: 13, marginHorizontal: 10 },
    emptyText: { color: '#9A9A9A', fontStyle: 'italic', fontSize: 14 },
    scheduleOptions: { marginBottom: 30 },
    schedOpt: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#DEDEDB' },
    schedOptActive: { borderColor: '#E94560', backgroundColor: 'rgba(233, 69, 96, 0.05)' },
    schedOptText: { color: '#5A5A5A', fontSize: 14, marginLeft: 12 },
    schedOptTextActive: { color: '#1A1A1A', fontWeight: 'bold' },
    labelInterval: { color: '#1A1A1A', fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
    intervalGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    intBtn: { flex: 1, height: 45, backgroundColor: '#FFFFFF', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#DEDEDB' },
    intBtnActive: { backgroundColor: '#E94560', borderColor: '#E94560' },
    intBtnText: { color: '#5A5A5A', fontSize: 13 },
    intBtnTextActive: { color: 'white', fontWeight: 'bold' },
    notifHero: { alignItems: 'center', paddingVertical: 40 },
    notifActions: { marginTop: 20 },
    successHero: { alignItems: 'center', marginBottom: 40 },
    checkCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#2ECC71', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    nameCard: { backgroundColor: '#FFFFFF', padding: 25, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#DEDEDB' },
    nameCardLabel: { color: '#5A5A5A', fontSize: 14, marginBottom: 15 },
    nameCardVal: { color: '#1A1A1A', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    copyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74, 159, 255, 0.05)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
    copyText: { color: '#4A9FFF', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
});

export default OnboardingScreen;
