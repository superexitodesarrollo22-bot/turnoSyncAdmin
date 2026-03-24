import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';

const RecuperarPasswordScreen = () => {
    const navigation = useNavigation<any>();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (resendTimer > 0) {
            timer = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [resendTimer]);

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleEnviar = async () => {
        Keyboard.dismiss();
        setErrorMsg(null);

        if (!email) {
            setErrorMsg('Por favor ingresa tu correo electrónico');
            return;
        }

        if (!validateEmail(email)) {
            setErrorMsg('Formato de correo electrónico inválido');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'turnosyncadmin://reset-password',
            });

            if (error) {
                if (error.message.includes('rate limit')) {
                    setErrorMsg('Demasiados intentos. Espera unos minutos.');
                } else {
                    setErrorMsg('No pudimos enviar el correo. Intenta de nuevo.');
                }
                return;
            }

            setSent(true);
            setResendTimer(30);
        } catch (error) {
            setErrorMsg('Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    const handleVolver = () => {
        navigation.navigate('Login');
    };

    return (
        <LinearGradient colors={['#FFFFFF', '#F5F5F0']} style={styles.container}>
            <TouchableOpacity style={styles.backButton} onPress={handleVolver}>
                <Ionicons name="arrow-back" size={24} color="#5A5A5A" />
                <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {sent ? (
                        /* ESTADO 2: ENVIADO */
                        <View style={styles.centeredContent}>
                            <View style={[styles.iconCircle, { borderColor: '#4CAF50' }]}>
                                <Ionicons name="checkmark-outline" size={50} color="#4CAF50" />
                            </View>
                            <Text style={styles.title}>¡Enlace enviado!</Text>
                            <Text style={styles.description}>
                                Revisa tu bandeja de entrada y sigue las instrucciones del correo.
                            </Text>
                            <Text style={styles.note}>
                                Si no ves el correo, revisa tu carpeta de spam o correo no deseado.
                            </Text>

                            <TouchableOpacity
                                style={styles.outlinedButton}
                                onPress={handleVolver}
                            >
                                <Text style={styles.outlinedButtonText}>Volver al inicio de sesión</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.resendButton}
                                disabled={resendTimer > 0}
                                onPress={handleEnviar}
                            >
                                <Text style={[styles.resendText, resendTimer > 0 && { color: '#606070' }]}>
                                    {resendTimer > 0 ? `Reenviar en ${resendTimer}s...` : 'Reenviar correo'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* ESTADO 1: FORMULARIO */
                        <>
                            <View style={styles.header}>
                                <View style={[styles.iconCircle, { borderColor: '#E94560' }]}>
                                    <Ionicons name="mail-unread-outline" size={40} color="#E94560" />
                                </View>
                                <Text style={styles.title}>Recuperar contraseña</Text>
                                <Text style={styles.description}>
                                    Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                                </Text>
                            </View>

                            <View style={styles.card}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Correo electrónico</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="mail-outline" size={20} color="#A0A0B0" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="admin@tuempresa.com"
                                            placeholderTextColor="#606070"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            value={email}
                                            onChangeText={setEmail}
                                        />
                                    </View>
                                </View>

                                {errorMsg && (
                                    <View style={styles.errorContainer}>
                                        <Text style={styles.errorText}>{errorMsg}</Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleEnviar}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={['#E94560', '#C73652']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradient}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.buttonText}>Enviar enlace</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 120,
        paddingBottom: 40,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
        padding: 8,
    },
    backButtonText: {
        color: '#5A5A5A',
        fontSize: 16,
        marginLeft: 4,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    centeredContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#5A5A5A',
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 20,
    },
    note: {
        fontSize: 12,
        color: '#9A9A9A',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 40,
        fontStyle: 'italic',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#DEDEDB',
    },
    inputGroup: { marginBottom: 20 },
    label: { color: '#1A1A1A', fontSize: 14, marginBottom: 8, fontWeight: '500' },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EDEDEA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DEDEDB',
        height: 52,
        paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: '#1A1A1A', fontSize: 16 },
    errorContainer: { marginBottom: 16, padding: 12, backgroundColor: 'rgba(233, 69, 96, 0.1)', borderRadius: 8 },
    errorText: { color: '#E94560', fontSize: 13, textAlign: 'center' },
    button: { height: 52, borderRadius: 12, overflow: 'hidden' },
    gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    outlinedButton: {
        width: '100%',
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BCBCBC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    outlinedButtonText: { color: '#5A5A5A', fontSize: 16, fontWeight: '600' },
    resendButton: { padding: 10 },
    resendText: { color: '#E94560', fontSize: 14, fontWeight: '500' },
});

export default RecuperarPasswordScreen;
