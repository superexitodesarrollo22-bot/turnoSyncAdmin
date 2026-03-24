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

const NuevaPasswordScreen = () => {
    const navigation = useNavigation<any>();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(3);

    // Fortaleza de la contraseña
    const [strength, setStrength] = useState(0); // 0-4
    const [strengthText, setStrengthText] = useState('Muy débil');
    const [strengthColor, setStrengthColor] = useState('#606070');

    useEffect(() => {
        evaluateStrength(password);
    }, [password]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (success && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (success && countdown === 0) {
            navigation.navigate('Login');
        }
        return () => clearInterval(timer);
    }, [success, countdown]);

    const evaluateStrength = (pass: string) => {
        let score = 0;
        if (pass.length === 0) {
            setStrength(0);
            setStrengthText('Muy débil');
            setStrengthColor('#606070');
            return;
        }
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        setStrength(score);

        switch (score) {
            case 1:
                setStrengthText('Débil');
                setStrengthColor('#E94560');
                break;
            case 2:
                setStrengthText('Media');
                setStrengthColor('#FFD700');
                break;
            case 3:
                setStrengthText('Fuerte');
                setStrengthColor('#4CAF50');
                break;
            case 4:
                setStrengthText('Muy fuerte');
                setStrengthColor('#00C853');
                break;
            default:
                setStrengthText('Muy débil');
                setStrengthColor('#606070');
        }
    };

    const handleActualizar = async () => {
        Keyboard.dismiss();
        setErrorMsg(null);

        if (password !== confirmPassword) {
            setErrorMsg('Las contraseñas no coinciden');
            return;
        }

        if (strength < 2) {
            setErrorMsg('La contraseña es demasiado débil');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            setSuccess(true);
        } catch (error: any) {
            console.error('Update password error:', error.message);
            setErrorMsg('No pudimos actualizar tu contraseña. El enlace puede haber expirado.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <LinearGradient colors={['#FFFFFF', '#F5F5F0']} style={styles.container}>
                <View style={styles.centeredContent}>
                    <View style={styles.successIconContainer}>
                        <Ionicons name="checkmark-circle" size={100} color="#00C853" />
                    </View>
                    <Text style={styles.successTitle}>
                        ¡Contraseña actualizada!
                    </Text>
                    <Text style={styles.successSubtitle}>
                        Tu contraseña fue cambiada exitosamente.
                    </Text>
                    <Text style={styles.countdownText}>
                        Volviendo al inicio en {countdown}s...
                    </Text>
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
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="key-outline" size={40} color="#E94560" />
                        </View>
                        <Text style={styles.title}>Nueva contraseña</Text>
                        <Text style={styles.description}>
                            Elige una contraseña segura para tu cuenta.
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nueva contraseña</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#606070" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="#606070"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#A0A0B0" />
                                </TouchableOpacity>
                            </View>

                            {/* Strength Indicator */}
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBars}>
                                    {[1, 2, 3, 4].map((i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.strengthBar,
                                                { backgroundColor: i <= strength ? strengthColor : '#2A2A4A' }
                                            ]}
                                        />
                                    ))}
                                </View>
                                <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthText}</Text>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirmar contraseña</Text>
                            <View style={[
                                styles.inputWrapper,
                                confirmPassword.length > 0 && {
                                    borderColor: password === confirmPassword ? '#00C853' : '#E94560'
                                }
                            ]}>
                                <Ionicons name="lock-closed-outline" size={20} color="#606070" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="#606070"
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                <View style={styles.rightIcons}>
                                    {confirmPassword.length > 0 && (
                                        <Ionicons
                                            name={password === confirmPassword ? "checkmark-circle" : "close-circle"}
                                            size={20}
                                            color={password === confirmPassword ? "#00C853" : "#E94560"}
                                            style={{ marginRight: 8 }}
                                        />
                                    )}
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                        <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#A0A0B0" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {errorMsg && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.button,
                                (strength < 2 || password !== confirmPassword) && styles.buttonDisabled
                            ]}
                            onPress={handleActualizar}
                            disabled={loading || strength < 2 || password !== confirmPassword}
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
                                    <Text style={styles.buttonText}>Actualizar contraseña</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
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
        paddingTop: 80,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#DEDEDB',
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
    },
    description: {
        fontSize: 14,
        color: '#5A5A5A',
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 20,
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
    eyeIcon: { padding: 4 },
    rightIcons: { flexDirection: 'row', alignItems: 'center' },
    strengthContainer: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    strengthBars: {
        flexDirection: 'row',
        flex: 1,
        marginRight: 10,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        marginRight: 4,
    },
    strengthLabel: { fontSize: 12, fontWeight: '600', minWidth: 70, textAlign: 'right' },
    errorContainer: { marginBottom: 16 },
    errorText: { color: '#E94560', fontSize: 14, textAlign: 'center' },
    button: { height: 52, borderRadius: 12, overflow: 'hidden', marginTop: 10 },
    buttonDisabled: { opacity: 0.5 },
    gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    successIconContainer: { marginBottom: 30 },
    successTitle: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
    successSubtitle: { fontSize: 16, color: '#5A5A5A', textAlign: 'center', marginBottom: 40 },
    countdownText: { fontSize: 14, color: '#E94560', fontWeight: '500' },
});

export default NuevaPasswordScreen;
