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
    Alert,
    Animated as NativeAnimated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
    const navigation = useNavigation<any>();
    const { signOut } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const passwordRef = useRef<TextInput>(null);

    // Animaciones nativas
    const headerOpacity = useRef(new NativeAnimated.Value(0)).current;
    const headerTranslateY = useRef(new NativeAnimated.Value(20)).current;
    const cardOpacity = useRef(new NativeAnimated.Value(0)).current;
    const cardTranslateY = useRef(new NativeAnimated.Value(20)).current;
    const footerOpacity = useRef(new NativeAnimated.Value(0)).current;
    const footerTranslateY = useRef(new NativeAnimated.Value(20)).current;

    React.useEffect(() => {
        NativeAnimated.stagger(200, [
            NativeAnimated.parallel([
                NativeAnimated.timing(headerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                NativeAnimated.timing(headerTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
            ]),
            NativeAnimated.parallel([
                NativeAnimated.timing(cardOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                NativeAnimated.timing(cardTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
            ]),
            NativeAnimated.parallel([
                NativeAnimated.timing(footerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                NativeAnimated.timing(footerTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
            ]),
        ]).start();
    }, []);

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleLogin = async () => {
        Keyboard.dismiss();
        setErrorMsg(null);

        if (!email || !password) {
            setErrorMsg('Por favor completa todos los campos');
            return;
        }

        if (!validateEmail(email)) {
            setErrorMsg('Formato de correo electrónico inválido');
            return;
        }

        if (password.length < 6) {
            setErrorMsg('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message === 'Invalid login credentials') {
                    setErrorMsg('Email o contraseña incorrectos');
                } else if (error.message.includes('Email not confirmed')) {
                    setErrorMsg('Debes confirmar tu email primero');
                } else {
                    setErrorMsg('Error al iniciar sesión. Intenta de nuevo.');
                }
                setLoading(false);
                return;
            }

            const user = data.user;
            if (!user) throw new Error('Usuario no encontrado tras login');

            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('id, full_name')
                .eq('supabase_auth_uid', user.id)
                .single();

            if (profileError || !profile) {
                throw new Error('No se pudo encontrar el perfil de usuario');
            }

            const { data: bizUser, error: bizUserError } = await supabase
                .from('business_users')
                .select('business_id')
                .eq('user_id', profile.id)
                .in('role', ['admin', 'owner'])
                .single();

            if (bizUserError || !bizUser) {
                await supabase.auth.signOut();
                setErrorMsg('Tu cuenta no tiene permisos de administrador.');
                setLoading(false);
                return;
            }

            await supabase.from('audit_logs').insert({
                business_id: bizUser.business_id,
                user_id: profile.id,
                action: 'admin_login',
                metadata: {
                    timestamp: new Date().toISOString(),
                    platform: 'TurnoSyncAdmin',
                    device: Platform.OS
                }
            });
        } catch (error: any) {
            console.error('Login error:', error);
            setErrorMsg(error.message || 'Ocurrió un error inesperado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.container}>
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
                    <NativeAnimated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
                        <View style={styles.smallLogoContainer}>
                            <View style={styles.calendarBase}>
                                <View style={styles.calendarHeader} />
                                <View style={styles.checkMark} />
                            </View>
                        </View>
                        <Text style={styles.appName}>
                            TurnoSync <Text style={styles.adminTag}>ADMIN</Text>
                        </Text>
                        <Text style={styles.welcomeTitle}>Bienvenido</Text>
                        <Text style={styles.subtitle}>Panel de administración</Text>
                    </NativeAnimated.View>

                    {/* Form Card */}
                    <NativeAnimated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }]}>
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
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Contraseña</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#A0A0B0" style={styles.inputIcon} />
                                <TextInput
                                    ref={passwordRef}
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="••••••••"
                                    placeholderTextColor="#606070"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    returnKeyType="done"
                                    onSubmitEditing={handleLogin}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="#A0A0B0"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {errorMsg && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{errorMsg}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#E94560', '#C73652']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.loginGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.loginButtonText}>Ingresar al panel</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('RecuperarPassword')}
                            style={styles.forgotButton}
                        >
                            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                        </TouchableOpacity>
                    </NativeAnimated.View>

                    {/* New User Section */}
                    <NativeAnimated.View style={[styles.footer, { opacity: footerOpacity, transform: [{ translateY: footerTranslateY }] }]}>
                        <View style={styles.separatorContainer}>
                            <View style={styles.line} />
                            <Text style={styles.separatorText}>¿Eres nuevo aquí?</Text>
                            <View style={styles.line} />
                        </View>

                        <TouchableOpacity
                            style={styles.subscribeButton}
                            onPress={() => navigation.navigate('Suscripcion')}
                        >
                            <Text style={styles.subscribeButtonText}>Solicitar suscripción</Text>
                        </TouchableOpacity>
                    </NativeAnimated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    smallLogoContainer: {
        marginBottom: 16,
    },
    calendarBase: {
        width: 50,
        height: 50,
        borderWidth: 3,
        borderColor: '#E94560',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarHeader: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: 10,
        backgroundColor: '#E94560',
    },
    checkMark: {
        width: 20,
        height: 10,
        borderLeftWidth: 3,
        borderBottomWidth: 3,
        borderColor: '#E94560',
        transform: [{ rotate: '-45deg' }],
        marginTop: 2,
    },
    appName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 20,
    },
    adminTag: {
        color: '#E94560',
        fontSize: 12,
        fontWeight: '600',
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#A0A0B0',
    },
    card: {
        backgroundColor: '#1E1E3A',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#FFFFFF',
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A2A4A',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3A3A5A',
        height: 52,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
    },
    eyeIcon: {
        padding: 8,
    },
    errorContainer: {
        marginBottom: 16,
    },
    errorText: {
        color: '#E94560',
        fontSize: 14,
        textAlign: 'center',
    },
    loginButton: {
        height: 52,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 10,
    },
    loginGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    forgotButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    forgotText: {
        color: '#E94560',
        fontSize: 14,
    },
    footer: {
        marginTop: 40,
        paddingBottom: 20,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#2A2A4A',
    },
    separatorText: {
        color: '#A0A0B0',
        paddingHorizontal: 16,
        fontSize: 14,
    },
    subscribeButton: {
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E94560',
        justifyContent: 'center',
        alignItems: 'center',
    },
    subscribeButtonText: {
        color: '#E94560',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default LoginScreen;
