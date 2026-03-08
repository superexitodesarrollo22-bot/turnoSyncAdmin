import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoSplashScreen from 'expo-splash-screen';

const { width } = Dimensions.get('window');

interface Props {
    onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
    // ── Animated values ────────────────────────────────────────────────────────
    const bgOpacity = useRef(new Animated.Value(0)).current;
    const ringOpacity = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(0.7)).current;
    const logoScale = useRef(new Animated.Value(0)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(30)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const adminOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // 1. Fondo
        Animated.timing(bgOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();

        // 2. Círculo exterior (fade + scale)
        Animated.parallel([
            Animated.timing(ringOpacity, {
                toValue: 1,
                duration: 400,
                delay: 200,
                useNativeDriver: true,
            }),
            Animated.timing(ringScale, {
                toValue: 1,
                duration: 400,
                delay: 200,
                useNativeDriver: true,
            }),
        ]).start();

        // 3. Logo con spring
        Animated.parallel([
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 6,
                tension: 50,
                delay: 300,
                useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 350,
                delay: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // 4. "TurnoSync" desliza desde abajo
        Animated.parallel([
            Animated.timing(titleTranslateY, {
                toValue: 0,
                duration: 450,
                delay: 600,
                useNativeDriver: true,
            }),
            Animated.timing(titleOpacity, {
                toValue: 1,
                duration: 450,
                delay: 600,
                useNativeDriver: true,
            }),
        ]).start();

        // 5. "ADMIN"
        Animated.timing(adminOpacity, {
            toValue: 1,
            duration: 400,
            delay: 900,
            useNativeDriver: true,
        }).start();

        // 6. Tagline
        Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 400,
            delay: 1100,
            useNativeDriver: true,
        }).start();

        // 7. Barra de progreso (width → no soporta native driver)
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 1200,
            delay: 1200,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) {
                // 8. Callback al terminar la barra
                ExpoSplashScreen.hideAsync().catch(() => { });
                onFinish();
            }
        });
    }, [onFinish]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 200],
    });

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            {/* ── Fondo gradiente ── */}
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
                <LinearGradient
                    colors={['#0F0F1A', '#1A1A2E', '#0F0F1A']}
                    style={StyleSheet.absoluteFill}
                    locations={[0, 0.5, 1]}
                />
            </Animated.View>

            <View style={styles.content}>
                {/* ── Círculo exterior pulsante ── */}
                <Animated.View
                    style={[
                        styles.ring,
                        {
                            opacity: ringOpacity,
                            transform: [{ scale: ringScale }],
                        },
                    ]}
                />

                {/* ── Logo central ── */}
                <Animated.View
                    style={[
                        styles.logoWrapper,
                        {
                            opacity: logoOpacity,
                            transform: [{ scale: logoScale }],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['#6C63FF', '#00D9A6']}
                        style={styles.logoGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="calendar-outline" size={48} color="#FFFFFF" />
                    </LinearGradient>
                </Animated.View>

                {/* ── Título "TurnoSync" ── */}
                <Animated.Text
                    style={[
                        styles.appName,
                        {
                            opacity: titleOpacity,
                            transform: [{ translateY: titleTranslateY }],
                        },
                    ]}
                >
                    TurnoSync
                </Animated.Text>

                {/* ── "ADMIN" ── */}
                <Animated.Text style={[styles.adminLabel, { opacity: adminOpacity }]}>
                    ADMIN
                </Animated.Text>

                {/* ── Tagline ── */}
                <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                    Gestión profesional de turnos
                </Animated.Text>

                {/* ── Barra de progreso ── */}
                <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFillWrapper, { width: progressWidth }]}>
                        <LinearGradient
                            colors={['#6C63FF', '#00D9A6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F1A',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Círculo exterior pulsante
    ring: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
        borderColor: '#6C63FF',
        opacity: 0.4,
        // sombra iOS
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 20,
        shadowOpacity: 0.5,
    },

    // Logo
    logoWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 32,
        // sombra iOS
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 20,
        shadowOpacity: 0.5,
        // elevación Android
        elevation: 12,
    },
    logoGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Textos
    appName: {
        color: '#FFFFFF',
        fontSize: 34,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    adminLabel: {
        color: '#6C63FF',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 8,
        marginBottom: 16,
    },
    tagline: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 13,
        fontWeight: '400',
        marginBottom: 60,
        letterSpacing: 0.3,
    },

    // Barra de progreso
    progressTrack: {
        position: 'absolute',
        bottom: 90,
        width: 200,
        height: 3,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    progressFillWrapper: {
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
    },
});
