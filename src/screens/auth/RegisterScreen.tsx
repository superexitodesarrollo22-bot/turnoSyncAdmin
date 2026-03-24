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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';

const RegisterScreen = () => {
    const navigation = useNavigation();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

    const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

    const handleRegister = async () => {
        Keyboard.dismiss();
        setErrorMsg(null);

        if (!fullName || fullName.trim().length < 3) {
            setErrorMsg('El nombre debe tener al menos 3 caracteres');
            return;
        }
        if (!validateEmail(email)) {
            setErrorMsg('Formato de correo inválido');
            return;
        }
        if (password.length < 8) {
            setErrorMsg('La contraseña debe tener al menos 8 caracteres');
            return;
        }
        if (password !== confirmPassword) {
            setErrorMsg('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                    },
                },
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    setErrorMsg('Este correo ya tiene una cuenta. Iniciá sesión.');
                } else {
                    setErrorMsg(error.message);
                }
                return;
            }

            setSuccess(true);
        } catch (err: any) {
            setErrorMsg(err.message || 'Error inesperado. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <LinearGradient colors={['#FFFFFF', '#F5F5F0']} style={styles.container}>
                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Ionicons name="checkmark-circle" size={72} color="#4CAF50" />
                    </View>
                    <Text style={styles.successTitle}>¡Cuenta creada!</Text>
                    <Text style={styles.successText}>
                        Revisá tu correo para confirmar tu cuenta. Una vez confirmada,
                        podrás iniciar sesión cuando el equipo de TurnoSync te habilite
                        el acceso de administrador.
                    </Text>
                    <TouchableOpacity
                        style={styles.loginBtn}
                        onPress={() => navigation.navigate('Login' as never)}
                    >
                        <Text style={styles.loginBtnText}>Ir al inicio de sesión</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#FFFFFF', '#F5F5F0']} style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={styles.title}>Crear cuenta</Text>
                        <Text style={styles.subtitle}>
                            Registrate para solicitar acceso como administrador
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.label}>Nombre completo</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Tu nombre"
                            placeholderTextColor="#606080"
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                            returnKeyType="next"
                            onSubmitEditing={() => emailRef.current?.focus()}
                        />

                        <Text style={styles.label}>Correo electrónico</Text>
                        <TextInput
                            ref={emailRef}
                            style={styles.input}
                            placeholder="tu@correo.com"
                            placeholderTextColor="#606080"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="next"
                            onSubmitEditing={() => passwordRef.current?.focus()}
                        />

                        <Text style={styles.label}>Contraseña</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                ref={passwordRef}
                                style={styles.passwordInput}
                                placeholder="Mínimo 8 caracteres"
                                placeholderTextColor="#606080"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                returnKeyType="next"
                                onSubmitEditing={() => confirmRef.current?.focus()}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={22}
                                    color="#888"
                                />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Confirmar contraseña</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                ref={confirmRef}
                                style={styles.passwordInput}
                                placeholder="Repetí la contraseña"
                                placeholderTextColor="#606080"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirm}
                                returnKeyType="done"
                                onSubmitEditing={handleRegister}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(p => !p)}>
                                <Ionicons
                                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                                    size={22}
                                    color="#888"
                                />
                            </TouchableOpacity>
                        </View>

                        {errorMsg && (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.registerBtnText}>Crear cuenta</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginLink}
                            onPress={() => navigation.navigate('Login' as never)}
                        >
                            <Text style={styles.loginLinkText}>
                                ¿Ya tenés cuenta?{' '}
                                <Text style={styles.loginLinkBold}>Iniciá sesión</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60 },
    backButton: { marginBottom: 24 },
    header: { marginBottom: 32 },
    title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#5A5A5A', lineHeight: 22 },
    form: { flex: 1 },
    label: { fontSize: 13, fontWeight: '600', color: '#9A9A9A', marginBottom: 8, marginTop: 16 },
    input: {
        backgroundColor: '#EDEDEA',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#DEDEDB',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EDEDEA',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#DEDEDB',
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1A1A1A',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(233, 69, 96, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginTop: 16,
        gap: 8,
    },
    errorText: { color: '#E94560', fontSize: 13, flex: 1 },
    registerBtn: {
        backgroundColor: '#E94560',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    registerBtnDisabled: { opacity: 0.6 },
    registerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    loginLink: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
    loginLinkText: { color: '#5A5A5A', fontSize: 14 },
    loginLinkBold: { color: '#E94560', fontWeight: '700' },
    successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    successIcon: { marginBottom: 24 },
    successTitle: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
    successText: { fontSize: 15, color: '#5A5A5A', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    loginBtn: {
        backgroundColor: '#E94560',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 40,
        alignItems: 'center',
    },
    loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default RegisterScreen;
