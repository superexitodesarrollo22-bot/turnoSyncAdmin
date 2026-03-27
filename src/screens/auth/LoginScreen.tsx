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
    const { session, signOut } = useAuth();

    if (session) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F0' }}>
                <ActivityIndicator size="large" color="#E94560" />
            </View>
        );
    }

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const passwordRef = useRef<TextInput>(null);
    const isMounted = useRef(true);

    React.useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

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
            // PASO 1: Iniciar sesión con Supabase
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
            if (!user) {
                setLoading(false);
                return;
            }

            // PASO 2: Obtener perfil del usuario
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('supabase_auth_uid', user.id)
                .single();

            if (profileError || !profile) {
                await supabase.auth.signOut();
                setErrorMsg('No se pudo encontrar el perfil de usuario');
                setLoading(false);
                return;
            }

            // PASO 3: Verificar si es superuser
            if (profile.is_superuser === true) {
                // Registro de log para superuser
                await supabase.from('audit_logs').insert({
                    user_id: profile.id,
                    action: 'admin_login_superuser',
                    metadata: { platform: Platform.OS }
                }).select().single();
                
                return; // Éxito, el AuthContext manejará la sesión activa
            }

            // PASO 4: Verificar permisos de admin/owner en business_users (Máximo 3 intentos)
            let hasPermissions = false;
            for (let i = 0; i < 3; i++) {
                const { data: permissions, error: permError } = await supabase
                    .from('business_users')
                    .select('role')
                    .eq('user_id', profile.id)
                    .in('role', ['admin', 'owner']);

                if (!permError && permissions && permissions.length > 0) {
                    hasPermissions = true;
                    break;
                }
                
                // Delay de 500ms entre intentos para tolerar lag de RLS
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            if (!hasPermissions) {
                // LIMPIAR SESIÓN SI NO TIENE PERMISOS
                await supabase.auth.signOut();
                setErrorMsg('Tu cuenta no tiene permisos de administrador.');
                setLoading(false);
                return;
            }

            // PASO 5: Registrar audit log de acceso exitoso
            try {
                await supabase.from('audit_logs').insert({
                    user_id: profile.id,
                    action: 'admin_login_success',
                    metadata: { platform: Platform.OS }
                });
            } catch (e) {
                console.error('Error recording audit log:', e);
            }

            // No llamamos setLoading(false) aquí si queremos que la navegación ocurra con el spinner
            // O podemos llamarlo, el AuthContext reaccionará de todas formas.
        } catch (error: any) {
            console.error('Login error:', error);
            setErrorMsg(error.message || 'Ocurrió un error inesperado');
            setLoading(false);
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    };

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
                    <NativeAnimated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
                        <View style={styles.smallLogoContainer}>
                            <View style={styles.calendarBase}>
                                <View style={styles.calendarHeader} />
                                <View style={styles.checkMark} />
                            </View>
                        </View>
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
                            <LinearGradient
                                colors={['#E94560', '#C73652']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.subscribeGradient}
                            >
                                <Text style={styles.subscribeButtonText}>Solicitar suscripción</Text>
                            </LinearGradient>
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
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#5A5A5A',
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
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#1A1A1A',
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
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
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#1A1A1A',
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
        backgroundColor: '#DEDEDB',
    },
    separatorText: {
        color: '#5A5A5A',
        paddingHorizontal: 16,
        fontSize: 14,
    },
    subscribeButton: {
        height: 52,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 20,
    },
    subscribeGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subscribeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default LoginScreen;
