import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoSplashScreen from 'expo-splash-screen';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    // Refs para animaciones nativas
    const bgOpacity = useRef(new Animated.Value(0.8)).current;
    const logoScale = useRef(new Animated.Value(0.3)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(20)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const progressWidth = useRef(new Animated.Value(0)).current;
    const mainContentOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Animaciones de entrada
        Animated.parallel([
            Animated.timing(bgOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true
            }),
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 7,
                tension: 40,
                useNativeDriver: true
            }),
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 600,
                delay: 400,
                useNativeDriver: true
            }),
            Animated.timing(textTranslateY, {
                toValue: 0,
                duration: 600,
                delay: 400,
                useNativeDriver: true
            }),
            Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 600,
                delay: 800,
                useNativeDriver: true
            }),
            Animated.timing(progressWidth, {
                toValue: width * 0.6,
                duration: 1200,
                delay: 1000,
                useNativeDriver: false // Width no soporta native driver
            }),
        ]).start();

        // Delay para el fade out final sincronizado con la duración total
        const timer = setTimeout(() => {
            Animated.timing(mainContentOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            }).start(({ finished }) => {
                if (finished) {
                    ExpoSplashScreen.hideAsync().catch(() => { });
                    onFinish();
                }
            });
        }, 2200);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
                <LinearGradient
                    colors={['#1A1A2E', '#0F3460']}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            <Animated.View style={[styles.content, { opacity: mainContentOpacity }]}>
                {/* Logo de Calendario Estilizado */}
                <Animated.View style={[styles.logoContainer, {
                    opacity: logoOpacity,
                    transform: [{ scale: logoScale }]
                }]}>
                    <View style={styles.calendarBase}>
                        <View style={styles.calendarHeader} />
                        <View style={styles.calendarGrid}>
                            <View style={styles.checkMark} />
                        </View>
                    </View>
                </Animated.View>

                {/* Textos */}
                <Animated.View style={[styles.textContainer, {
                    opacity: textOpacity,
                    transform: [{ translateY: textTranslateY }]
                }]}>
                    <Text style={styles.appName}>TurnoSync</Text>
                    <Text style={styles.adminText}>ADMIN</Text>
                </Animated.View>

                <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
                    <Text style={styles.tagline}>Gestión profesional de turnos</Text>
                </Animated.View>

                {/* Barra de progreso */}
                <View style={styles.progressBarBackground}>
                    <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A1A2E',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    calendarBase: {
        width: 80,
        height: 80,
        borderWidth: 4,
        borderColor: '#E94560',
        borderRadius: 12,
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    calendarHeader: {
        width: '100%',
        height: 18,
        backgroundColor: '#E94560',
    },
    calendarGrid: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkMark: {
        width: 30,
        height: 15,
        borderLeftWidth: 4,
        borderBottomWidth: 4,
        borderColor: '#E94560',
        transform: [{ rotate: '-45deg' }],
        marginTop: -5,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    adminText: {
        fontSize: 14,
        color: '#E94560',
        letterSpacing: 8,
        marginTop: 4,
        fontWeight: '600',
        marginLeft: 8,
    },
    taglineContainer: {
        marginBottom: 60,
    },
    tagline: {
        fontSize: 14,
        color: '#A0A0B0',
        fontWeight: '400',
    },
    progressBarBackground: {
        position: 'absolute',
        bottom: 100,
        width: '60%',
        height: 2,
        backgroundColor: '#2A2A4A',
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#E94560',
        borderRadius: 1,
    },
});

export default SplashScreen;
