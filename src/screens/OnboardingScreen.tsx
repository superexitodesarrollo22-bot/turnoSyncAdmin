import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    Animated,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ── Slide data ──────────────────────────────────────────────────────────────
interface SlideData {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    description: string;
    gradientColors: [string, string];
}

const SLIDES: SlideData[] = [
    {
        icon: 'people-outline',
        iconColor: '#E94560',
        title: 'Gestiona tu equipo',
        description:
            'Controla los turnos de todo tu staff desde un solo lugar con total visibilidad',
        gradientColors: ['#FFFFFF', '#F5F5F0'],
    },
    {
        icon: 'calendar-outline',
        iconColor: '#2ECC71',
        title: 'Agenda inteligente',
        description:
            'Visualiza y administra citas en tiempo real. Confirmaciones automáticas para tus clientes',
        gradientColors: ['#FFFFFF', '#F5F5F0'],
    },
    {
        icon: 'stats-chart-outline',
        iconColor: '#FFB547',
        title: 'Reportes y métricas',
        description:
            'Analiza el rendimiento de tu negocio con estadísticas claras y exportables',
        gradientColors: ['#FFFFFF', '#F5F5F0'],
    },
];

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
    onDone: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function OnboardingScreen({ onDone }: Props) {
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const goToNext = () => {
        const next = activeIndex + 1;
        if (next >= SLIDES.length) {
            onDone();
            return;
        }
        // Fade out → scroll → fade in
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            flatListRef.current?.scrollToIndex({ index: next, animated: false });
            setActiveIndex(next);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        });
    };

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / width);
        if (idx !== activeIndex) setActiveIndex(idx);
    };

    const renderSlide = ({ item }: { item: SlideData }) => (
        <View style={styles.slide}>
            <LinearGradient
                colors={item.gradientColors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            {/* Círculo del icono */}
            <View
                style={[
                    styles.iconCircle,
                    { backgroundColor: item.iconColor + '26' },
                ]}
            >
                <Ionicons name={item.icon} size={56} color={item.iconColor} />
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
        </View>
    );

    const isLast = activeIndex === SLIDES.length - 1;

    return (
        <View style={styles.container}>
            {/* Botón Saltar */}
            {!isLast && (
                <SafeAreaView style={styles.skipArea} edges={['top']}>
                    <TouchableOpacity onPress={onDone} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Saltar</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            )}

            {/* Slides */}
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    renderItem={renderSlide}
                    keyExtractor={(_, i) => String(i)}
                    horizontal
                    pagingEnabled
                    scrollEnabled={false}          // navegamos programáticamente
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScroll}
                    scrollEventThrottle={16}
                    getItemLayout={(_, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                />
            </Animated.View>

            {/* Footer: dots + botón */}
            <SafeAreaView style={styles.footer} edges={['bottom']}>
                {/* Dots */}
                <View style={styles.dots}>
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === activeIndex ? styles.dotActive : styles.dotInactive,
                            ]}
                        />
                    ))}
                </View>

                {/* Botón principal */}
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={isLast ? onDone : goToNext}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#E94560', '#C62C46']}
                        style={styles.primaryBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.primaryBtnText}>
                            {isLast ? 'Comenzar' : 'Siguiente'}
                        </Text>
                        <Ionicons
                            name={isLast ? 'checkmark-outline' : 'arrow-forward-outline'}
                            size={20}
                            color="#FFFFFF"
                            style={{ marginLeft: 8 }}
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // Saltar
    skipArea: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 10,
    },
    skipBtn: {
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    skipText: {
        color: '#5A5A5A',
        fontSize: 14,
        fontWeight: '500',
    },

    // Slide
    slide: {
        width,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        overflow: 'hidden',
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    description: {
        fontSize: 16,
        color: '#5A5A5A',
        textAlign: 'center',
        lineHeight: 24,
    },

    // Footer
    footer: {
        paddingBottom: 20,
        paddingHorizontal: 24,
        backgroundColor: '#F5F5F0',
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        width: 24,
        backgroundColor: '#E94560',
    },
    dotInactive: {
        width: 8,
        backgroundColor: '#DEDEDB',
    },

    // Botón principal
    primaryBtn: {
        width: '80%',
        height: 56,
        alignSelf: 'center',
        borderRadius: 16,
        overflow: 'hidden',
    },
    primaryBtnGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
