import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    Keyboard,
    Dimensions,
    Modal,
    FlatList,
    Animated as NativeAnimated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';

const { width, height } = Dimensions.get('window');

// Opciones para los Selectores
const BUSINESS_TYPES = [
    'Peluquería / Barbería',
    'Salón de belleza',
    'Clínica / Consultorio médico',
    'Centro de estética',
    'Spa / Masajes',
    'Taller mecánico',
    'Veterinaria',
    'Estudio de tatuajes',
    'Otro',
];

const APPOINTMENT_RANGES = [
    'Menos de 50',
    'Entre 50 y 200',
    'Entre 200 y 500',
    'Más de 500',
];

const SuscripcionScreen = () => {
    const navigation = useNavigation();

    // Estado del Wizard
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Datos Formulario
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPhone, setAdminPhone] = useState('');

    const [companyName, setCompanyName] = useState('');
    const [companyType, setCompanyType] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyPhone, setCompanyPhone] = useState('');
    const [companyDesc, setCompanyDesc] = useState('');
    const [monthlyApps, setMonthlyApps] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);

    // Estados del Selector Personalizado
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerTitle, setPickerTitle] = useState('');
    const [pickerOptions, setPickerOptions] = useState<string[]>([]);
    const [pickerOnSelect, setPickerOnSelect] = useState<(val: string) => void>(() => { });

    // Ref para inputs
    const emailRef = useRef<TextInput>(null);
    const phoneRef = useRef<TextInput>(null);

    // Animación de pasos
    const stepOpacity = useRef(new NativeAnimated.Value(1)).current;

    const animateStepChange = (newStep: number) => {
        NativeAnimated.sequence([
            NativeAnimated.timing(stepOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            NativeAnimated.timing(stepOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
        setStep(newStep);
    };

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleNext = () => {
        setErrorMsg(null);
        if (step === 1) {
            if (!adminName || adminName.length < 3) {
                setErrorMsg('El nombre es demasiado corto');
                return;
            }
            if (!validateEmail(adminEmail)) {
                setErrorMsg('Formato de correo inválido');
                return;
            }
            if (adminPhone.length < 7) {
                setErrorMsg('El teléfono es inválido');
                return;
            }
            animateStepChange(2);
        }
    };

    const openPicker = (title: string, options: string[], onSelect: (val: string) => void) => {
        setPickerTitle(title);
        setPickerOptions(options);
        setPickerOnSelect(() => (val: string) => {
            onSelect(val);
            setPickerVisible(false);
        });
        setPickerVisible(true);
    };

    const handleEnviar = async () => {
        Keyboard.dismiss();
        setErrorMsg(null);

        if (!companyName || !companyType || !companyAddress || !companyPhone || !monthlyApps) {
            setErrorMsg('Por favor completa todos los campos requeridos');
            return;
        }
        if (companyDesc.length < 20) {
            setErrorMsg('La descripción debe tener al menos 20 caracteres');
            return;
        }
        if (!acceptTerms) {
            setErrorMsg('Debes aceptar los términos y condiciones');
            return;
        }

        setLoading(true);

        try {
            const { data: existing, error: checkError } = await supabase
                .from('subscription_requests')
                .select('id, status')
                .eq('admin_email', adminEmail)
                .maybeSingle();

            if (existing) {
                if (existing.status === 'pending') {
                    setErrorMsg('Ya tienes una solicitud pendiente con este correo. Te contactaremos pronto.');
                    setLoading(false);
                    return;
                } else if (existing.status === 'approved') {
                    setErrorMsg('Este correo ya tiene una cuenta activa. Inicia sesión.');
                    setLoading(false);
                    return;
                }
            }

            const { error: insertError } = await supabase
                .from('subscription_requests')
                .insert({
                    admin_full_name: adminName,
                    admin_email: adminEmail,
                    admin_phone: adminPhone,
                    company_name: companyName,
                    company_address: companyAddress,
                    company_phone: companyPhone,
                    company_description: companyDesc,
                    company_type: companyType,
                    estimated_monthly_appointments: monthlyApps,
                    status: 'pending'
                });

            if (insertError) throw insertError;

            setSubmitted(true);
        } catch (error: any) {
            console.error('Error enviando solicitud:', error.message);
            setErrorMsg('Ocurrió un error al enviar la solicitud. Intenta más tarde.');
        } finally {
            setLoading(false);
        }
    };

    const renderProgressBar = () => (
        <View style={styles.progressWrapper}>
            <View style={styles.progressContainer}>
                <View style={[styles.stepCircle, step >= 1 ? styles.stepActive : styles.stepPending]}>
                    {step > 1 ? (
                        <Ionicons name="checkmark" size={16} color="white" />
                    ) : (
                        <Text style={[styles.stepNumber, step === 1 && styles.stepNumberActive]}>1</Text>
                    )}
                </View>
                <View style={styles.progressLineContainer}>
                    <View style={[styles.progressLine, step > 1 && styles.progressLineFill]} />
                </View>
                <View style={[styles.stepCircle, step === 2 ? styles.stepActive : styles.stepPending]}>
                    <Text style={[styles.stepNumber, step === 2 && styles.stepNumberActive]}>2</Text>
                </View>
            </View>
            <Text style={styles.stepsText}>Paso {step} de 2</Text>
        </View>
    );

    const CustomPickerModal = () => (
        <Modal
            visible={pickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setPickerVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{pickerTitle}</Text>
                    <FlatList
                        data={pickerOptions}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.pickerOption}
                                onPress={() => pickerOnSelect(item)}
                            >
                                <Text style={[
                                    styles.pickerOptionText,
                                    (item === companyType || item === monthlyApps) && styles.pickerOptionSelected
                                ]}>
                                    {item}
                                </Text>
                                {(item === companyType || item === monthlyApps) && (
                                    <Ionicons name="checkmark" size={20} color="#E94560" />
                                )}
                            </TouchableOpacity>
                        )}
                        style={{ maxHeight: height * 0.5 }}
                    />
                    <TouchableOpacity
                        style={styles.modalCancel}
                        onPress={() => setPickerVisible(false)}
                    >
                        <Text style={styles.modalCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    if (submitted) {
        return (
            <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.container}>
                <View style={styles.successContainer}>
                    <View style={styles.successIconCircle}>
                        <Ionicons name="send" size={50} color="#E94560" />
                    </View>
                    <Text style={styles.successTitle}>¡Solicitud enviada!</Text>
                    <Text style={styles.successText}>
                        Hemos recibido tu solicitud de suscripción.
                    </Text>
                    <Text style={styles.successSubtext}>
                        Revisaremos tu información y nos pondremos en contacto contigo en un plazo de 24-48 horas al correo:
                    </Text>
                    <Text style={styles.successEmail}>{adminEmail}</Text>

                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={24} color="#007AFF" />
                        <Text style={styles.infoCardText}>
                            Una vez aprobada tu solicitud, recibirás un correo con tus credenciales de acceso para comenzar a usar TurnoSync Admin.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.backToLoginBtn}
                        onPress={() => navigation.navigate('Login' as never)}
                    >
                        <Text style={styles.backToLoginText}>Volver al inicio</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.container}>
            <CustomPickerModal />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => step === 2 ? animateStepChange(1) : navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Solicitud de suscripción</Text>
            </View>

            {renderProgressBar()}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <NativeAnimated.View style={[styles.stepWrapper, { opacity: stepOpacity }]}>
                        {step === 1 ? (
                            <View>
                                <Text style={styles.stepTitle}>Tus datos personales</Text>
                                <Text style={styles.stepSubtitle}>Información del administrador de la cuenta</Text>

                                <View style={styles.card}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Nombre completo *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Ej: Juan Pérez"
                                            placeholderTextColor="#606070"
                                            value={adminName}
                                            onChangeText={setAdminName}
                                            returnKeyType="next"
                                            onSubmitEditing={() => emailRef.current?.focus()}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Correo electrónico *</Text>
                                        <TextInput
                                            ref={emailRef}
                                            style={styles.input}
                                            placeholder="admin@ejemplo.com"
                                            placeholderTextColor="#606070"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={adminEmail}
                                            onChangeText={setAdminEmail}
                                            returnKeyType="next"
                                            onSubmitEditing={() => phoneRef.current?.focus()}
                                        />
                                        <Text style={styles.helperText}>Este será tu correo de acceso a TurnoSync Admin</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Teléfono / WhatsApp *</Text>
                                        <TextInput
                                            ref={phoneRef}
                                            style={styles.input}
                                            placeholder="+54 9 11 1234 5678"
                                            placeholderTextColor="#606070"
                                            keyboardType="phone-pad"
                                            value={adminPhone}
                                            onChangeText={setAdminPhone}
                                        />
                                    </View>

                                    {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                                    <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                                        <Text style={styles.primaryButtonText}>Siguiente</Text>
                                        <Ionicons name="arrow-forward" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.stepTitle}>Datos de tu empresa</Text>
                                <Text style={styles.stepSubtitle}>Cuéntanos sobre tu negocio</Text>

                                <View style={styles.card}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Nombre de la empresa *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Mi Negocio S.A."
                                            placeholderTextColor="#606070"
                                            value={companyName}
                                            onChangeText={setCompanyName}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Tipo de negocio *</Text>
                                        <TouchableOpacity
                                            style={styles.selector}
                                            onPress={() => openPicker('Tipo de negocio', BUSINESS_TYPES, setCompanyType)}
                                        >
                                            <Text style={[styles.selectorText, !companyType && { color: '#606070' }]}>
                                                {companyType || 'Seleccionar tipo...'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={20} color="#606070" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Dirección de la empresa *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Av. Principal 123, Ciudad"
                                            placeholderTextColor="#606070"
                                            value={companyAddress}
                                            onChangeText={setCompanyAddress}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Teléfono de la empresa *</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="+54 11 4444 8888"
                                            placeholderTextColor="#606070"
                                            keyboardType="phone-pad"
                                            value={companyPhone}
                                            onChangeText={setCompanyPhone}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Descripción breve del negocio *</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            placeholder="Cuéntanos brevemente qué servicios ofreces..."
                                            placeholderTextColor="#606070"
                                            multiline
                                            maxLength={300}
                                            numberOfLines={4}
                                            value={companyDesc}
                                            onChangeText={setCompanyDesc}
                                        />
                                        <Text style={styles.charCount}>{companyDesc.length}/300</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>¿Cuántos turnos manejas por mes? *</Text>
                                        <TouchableOpacity
                                            style={styles.selector}
                                            onPress={() => openPicker('Turnos por mes', APPOINTMENT_RANGES, setMonthlyApps)}
                                        >
                                            <Text style={[styles.selectorText, !monthlyApps && { color: '#606070' }]}>
                                                {monthlyApps || 'Seleccionar rango...'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={20} color="#606070" />
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.termsRow}
                                        onPress={() => setAcceptTerms(!acceptTerms)}
                                    >
                                        <View style={[styles.checkbox, acceptTerms && styles.checkboxActive]}>
                                            {acceptTerms && <Ionicons name="checkmark" size={16} color="white" />}
                                        </View>
                                        <Text style={styles.termsText}>
                                            Acepto los <Text style={styles.link}>términos y condiciones</Text> de TurnoSync
                                        </Text>
                                    </TouchableOpacity>

                                    {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                                    <View style={styles.btnRow}>
                                        <TouchableOpacity style={styles.secondaryButton} onPress={() => animateStepChange(1)}>
                                            <Text style={styles.secondaryButtonText}>Anterior</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.primaryButton, { flex: 2 }]}
                                            onPress={handleEnviar}
                                            disabled={loading}
                                        >
                                            <LinearGradient
                                                colors={['#E94560', '#C73652']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.submitGradient}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator color="white" />
                                                ) : (
                                                    <Text style={styles.primaryButtonText}>Enviar solicitud</Text>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </NativeAnimated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        marginRight: 10,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    progressWrapper: {
        alignItems: 'center',
        marginBottom: 20,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '60%',
        justifyContent: 'center',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        zIndex: 1,
    },
    stepActive: {
        backgroundColor: '#E94560',
        borderColor: '#E94560',
    },
    stepPending: {
        backgroundColor: '#1A1A2E',
        borderColor: '#3A3A5A',
    },
    stepNumber: {
        fontSize: 14,
        color: '#A0A0B0',
        fontWeight: 'bold',
    },
    stepNumberActive: {
        color: 'white',
    },
    progressLineContainer: {
        flex: 1,
        height: 2,
        backgroundColor: '#3A3A5A',
        marginHorizontal: -2,
    },
    progressLine: {
        height: '100%',
        width: '0%',
    },
    progressLineFill: {
        backgroundColor: '#E94560',
        width: '100%',
    },
    stepsText: {
        color: '#A0A0B0',
        fontSize: 12,
        marginTop: 8,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    stepWrapper: {
        flex: 1,
    },
    stepTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    stepSubtitle: {
        color: '#A0A0B0',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#1E1E3A',
        borderRadius: 20,
        padding: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#2A2A4A',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        color: 'white',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#3A3A5A',
    },
    textArea: {
        height: 100,
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    helperText: {
        color: '#707080',
        fontSize: 12,
        marginTop: 4,
    },
    charCount: {
        color: '#707080',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
    selector: {
        backgroundColor: '#2A2A4A',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#3A3A5A',
    },
    selectorText: {
        color: 'white',
        fontSize: 16,
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#E94560',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: '#E94560',
    },
    termsText: {
        color: '#A0A0B0',
        fontSize: 13,
        flex: 1,
    },
    link: {
        color: '#3498db',
        textDecorationLine: 'underline',
    },
    errorText: {
        color: '#E94560',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
    },
    primaryButton: {
        height: 52,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E94560',
        overflow: 'hidden',
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
    submitGradient: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    secondaryButton: {
        flex: 1,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    secondaryButtonText: {
        color: '#A0A0B0',
        fontSize: 16,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#1E1E3A',
        width: '100%',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#3A3A5A',
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A4A',
    },
    pickerOptionText: {
        color: '#A0A0B0',
        fontSize: 16,
    },
    pickerOptionSelected: {
        color: '#E94560',
        fontWeight: 'bold',
    },
    modalCancel: {
        marginTop: 20,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#E94560',
        fontSize: 16,
        fontWeight: '600',
    },
    // Success Styles
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    successIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1E1E3A',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#E94560',
    },
    successTitle: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    successText: {
        color: '#E94560',
        fontSize: 18,
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 12,
    },
    successSubtext: {
        color: '#A0A0B0',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 8,
    },
    successEmail: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 40,
    },
    infoCardText: {
        flex: 1,
        color: '#007AFF',
        fontSize: 12,
        marginLeft: 12,
        lineHeight: 18,
    },
    backToLoginBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    backToLoginText: {
        color: '#E94560',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SuscripcionScreen;
