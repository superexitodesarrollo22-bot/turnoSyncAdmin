import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    Image,
    Platform,
    Animated as NativeAnimated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, getLongDate } from '../../utils/helpers';
import { Appointment } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { DashboardStatSkeleton, ListScreenSkeleton } from '../../components/ui/SkeletonLoader';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import FadeInView from '../../components/ui/FadeInView';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { GradientButton } from '../../components/ui/GradientButton';

const { width } = Dimensions.get('window');

const DashboardSkeleton = () => (
    <View style={styles.skeletonContainer}>
        <View style={styles.kpiGrid}>
            {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ width: (width - 45) / 2 }}>
                    <DashboardStatSkeleton />
                </View>
            ))}
        </View>
        <ListScreenSkeleton count={3} />
    </View>
);

// --- Pantalla Principal ---
const DashboardScreen = () => {
    const navigation = useNavigation<any>();
    const { business, userProfile, signOut } = useAuth();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        todayTotal: 0,
        todayPending: 0,
        todayCompleted: 0,
        todayCancelled: 0,
        weekCount: 0,
        weekRevenue: 0,
        weekOccupancy: 0,
    });
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
    const [greeting, setGreeting] = useState('');
    const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);
    const [needsConfig, setNeedsConfig] = useState({ services: false, schedules: false });

    // Animación de entrada de la pantalla
    const screenOpacity = useRef(new NativeAnimated.Value(0)).current;

    const fetchDashboardData = useCallback(async () => {
        if (!business) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            const now = new Date().toISOString();

            // 1. KPIs del Día
            const { data: appointmentsToday } = await supabase
                .from('appointments')
                .select('id, status, price_cents')
                .eq('business_id', business.id)
                .gte('start_at', `${today}T00:00:00.000Z`)
                .lte('start_at', `${today}T23:59:59.999Z`);

            const todayStats = {
                total: appointmentsToday?.length || 0,
                pending: appointmentsToday?.filter(a => a.status === 'pending').length || 0,
                completed: appointmentsToday?.filter(a => a.status === 'completed').length || 0,
                cancelled: appointmentsToday?.filter(a => a.status === 'cancelled').length || 0,
            };

            // 2. Próximos Turnos
            const { data: upcoming } = await supabase
                .from('appointments')
                .select(`
          id, start_at, end_at, status, price_cents,
          users:client_user_id(full_name, email),
          services(name, duration_minutes)
        `)
                .eq('business_id', business.id)
                .in('status', ['pending', 'confirmed'])
                .gte('start_at', now)
                .order('start_at', { ascending: true })
                .limit(5);

            setUpcomingAppointments(upcoming as unknown as Appointment[]);

            // 3. Esta Semana
            const d = new Date();
            const first = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
            const startOfWeek = new Date(d.setDate(first)).toISOString().split('T')[0] + 'T00:00:00Z';
            const endOfWeek = new Date(d.setDate(first + 6)).toISOString().split('T')[0] + 'T23:59:59Z';

            const { data: weekData } = await supabase
                .from('appointments')
                .select('id, status, price_cents')
                .eq('business_id', business.id)
                .gte('start_at', startOfWeek)
                .lte('start_at', endOfWeek);

            const weekRev = weekData?.reduce((acc, curr) =>
                (curr.status === 'confirmed' || curr.status === 'completed') ? acc + curr.price_cents : acc, 0) || 0;

            setStats({
                todayTotal: todayStats.total,
                todayPending: todayStats.pending,
                todayCompleted: todayStats.completed,
                todayCancelled: todayStats.cancelled,
                weekCount: weekData?.length || 0,
                weekRevenue: weekRev,
                weekOccupancy: Math.min(Math.round(((weekData?.length || 0) / 100) * 100), 100),
            });

            // 4. Verificar configuración faltante
            const [{ count: sCount }, { count: schCount }] = await Promise.all([
                supabase.from('services').select('id', { count: 'exact', head: true }).eq('business_id', business.id),
                supabase.from('schedules').select('id', { count: 'exact', head: true }).eq('business_id', business.id)
            ]);
            setNeedsConfig({ services: sCount === 0, schedules: schCount === 0 });

            const status = await AsyncStorage.getItem(`onboarding_done_${business.id}`);
            setOnboardingStatus(status);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            NativeAnimated.timing(screenOpacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        }
    }, [business]);

    useEffect(() => {
        fetchDashboardData();

        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Buenos días');
        else if (hour < 19) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');
    }, [fetchDashboardData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const renderKPI = (title: string, value: number, label: string, color: string, icon: string) => (
        <PremiumCard style={styles.kpiCard}>
            <View style={[styles.kpiIconBg, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <Text style={[styles.kpiValue, { color }]}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
        </PremiumCard>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.smallLogo}>
                        <View style={styles.calendarMini} />
                    </View>
                    <Text style={styles.headerTitle}>TurnoSync ADMIN</Text>
                </View>
                <Text style={styles.businessName} numberOfLines={1}>{business?.name}</Text>
                <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Perfil')}>
                    <Text style={styles.avatarText}>
                        {userProfile?.full_name?.charAt(0) || 'A'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Perfil')}>
                    <Ionicons name="settings-outline" size={20} color="#5A5A5A" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E94560']} tintColor="#E94560" />
                }
            >
                {loading ? (
                    <DashboardSkeleton />
                ) : (
                    <NativeAnimated.View style={{ opacity: screenOpacity }}>
                        {/* Saludo */}
                        <View style={styles.greetingSection}>
                            <Text style={styles.greetingText}>{greeting}, {userProfile?.full_name?.split(' ')[0]}!</Text>
                            <Text style={styles.dateText}>{getLongDate()}</Text>
                            <Text style={styles.locationText}>{business?.name} • {business?.address?.split(',')[0] || 'Ciudad'}</Text>
                        </View>

                        {/* Banner configuración */}
                        {(onboardingStatus === 'skipped' || needsConfig.services || needsConfig.schedules) && (
                            <TouchableOpacity
                                style={styles.onboardingBanner}
                                onPress={() => navigation.navigate(needsConfig.services ? 'Servicios' : 'Horarios')}
                            >
                                <View style={styles.bannerIconBox}>
                                    <Ionicons name="warning-outline" size={24} color="#F5A623" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.bannerTitle}>Tu negocio no está completamente configurado</Text>
                                    <Text style={styles.bannerSub}>
                                        Falta: {needsConfig.services ? 'Servicios' : ''} {needsConfig.services && needsConfig.schedules ? ' • ' : ''} {needsConfig.schedules ? 'Horarios' : ''}
                                    </Text>
                                </View>
                                <View style={styles.bannerAction}>
                                    <Text style={styles.bannerActionText}>Configurar</Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* KPIs Hoy */}
                        <View style={styles.kpiGrid}>
                            {renderKPI('Turnos Hoy', stats.todayTotal, 'Total del día', '#4A9FFF', 'calendar')}
                            {renderKPI('Pendientes', stats.todayPending, 'Sin confirmar', '#F5A623', 'time')}
                            {renderKPI('Completados', stats.todayCompleted, 'Hasta ahora', '#2ECC71', 'checkmark-done')}
                            {renderKPI('Cancelados', stats.todayCancelled, 'Hoy', '#E94560', 'close-circle')}
                        </View>

                        {/* KPI Semanal */}
                        <PremiumCard gradient style={styles.weeklyCard}>
                            <View style={styles.weeklyHeader}>
                                <Text style={styles.weeklyTitle}>ESTA SEMANA</Text>
                                <Ionicons name="stats-chart" size={18} color="#E94560" />
                            </View>
                            <Text style={styles.weeklyInfo}>
                                {stats.weekCount} turnos • <Text style={styles.revenueText}>{formatCurrency(stats.weekRevenue)}</Text> en servicios
                            </Text>
                            <View style={styles.occupancyContainer}>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${stats.weekOccupancy}%` }]} />
                                </View>
                                <Text style={styles.occupancyText}>{stats.weekOccupancy}% de ocupación</Text>
                            </View>
                        </PremiumCard>

                        {/* Próximos Turnos */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Próximas citas</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Turnos')}>
                                <Text style={styles.seeMore}>Ver todas →</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.upcomingList}>
                            {upcomingAppointments.length === 0 ? (
                                <View style={{ minHeight: 180, backgroundColor: '#1E1E3A', borderRadius: 16, borderColor: '#2A2A4A', borderWidth: 1 }}>
                                    <EmptyState
                                        icon="calendar-outline"
                                        title="Sin citas próximas"
                                    />
                                </View>
                            ) : (
                                upcomingAppointments.map((item, index) => (
                                    <FadeInView delay={index * 80} key={item.id}>
                                        <PremiumCard style={styles.appointmentItem}>
                                            <View style={styles.timeBox}>
                                                <Text style={styles.timeText}>
                                                    {new Date(item.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </View>
                                            <View style={styles.appointmentInfo}>
                                                <Text style={styles.clientName}>{(item as any).users?.full_name || 'Cliente'}</Text>
                                                <Text style={styles.serviceName}>{(item as any).services?.name} • {(item as any).services?.duration_minutes} min</Text>
                                                <View style={{ marginTop: 6 }}>
                                                    <StatusBadge status={item.status as any} size="sm" />
                                                </View>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color="#2A2A4A" />
                                        </PremiumCard>
                                    </FadeInView>
                                ))
                            )}
                        </View>

                        {/* Estadísticas Rápidas */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickStatsScroll}>
                            <View style={styles.quickStatCard}>
                                <Text style={styles.quickStatLabel}>Top Servicio</Text>
                                <Text style={styles.quickStatValue} numberOfLines={1}>Corte de Cabello</Text>
                            </View>
                            <View style={styles.quickStatCard}>
                                <Text style={styles.quickStatLabel}>Hora Pico</Text>
                                <Text style={styles.quickStatValue}>16:00 - 18:00</Text>
                            </View>
                            <View style={styles.quickStatCard}>
                                <Text style={styles.quickStatLabel}>Promedio Diario</Text>
                                <Text style={styles.quickStatValue}>12 turnos</Text>
                            </View>
                        </ScrollView>

                    </NativeAnimated.View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F0' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#DEDEDB',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    smallLogo: {
        width: 24,
        height: 24,
        borderWidth: 1.5,
        borderColor: '#E94560',
        borderRadius: 4,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarMini: {
        width: 10,
        height: 6,
        borderLeftWidth: 1.5,
        borderBottomWidth: 1.5,
        borderColor: '#E94560',
        transform: [{ rotate: '-45deg' }],
    },
    headerTitle: { color: '#5A5A5A', fontSize: 10, fontWeight: 'bold' },
    businessName: { color: '#1A1A1A', fontSize: 14, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 10 },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    menuBtn: { padding: 5, marginLeft: 5 },
    scrollContent: { paddingBottom: 40 },
    greetingSection: { padding: 20 },
    greetingText: { color: '#1A1A1A', fontSize: 22, fontWeight: 'bold' },
    dateText: { color: '#5A5A5A', fontSize: 14, marginTop: 4 },
    locationText: { color: '#9A9A9A', fontSize: 12, marginTop: 2 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
    kpiCard: { width: (width - 45) / 2, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#DEDEDB' },
    kpiIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 12, right: 12 },
    kpiValue: { fontSize: 32, fontWeight: 'bold', marginTop: 8 },
    kpiLabel: { color: '#5A5A5A', fontSize: 12, marginTop: 4 },
    weeklyCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 25 },
    weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    weeklyTitle: { color: '#5A5A5A', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    weeklyInfo: { color: '#1A1A1A', fontSize: 16, marginBottom: 15 },
    revenueText: { fontWeight: 'bold', color: '#2ECC71' },
    occupancyContainer: { flexDirection: 'row', alignItems: 'center' },
    progressBarBg: { flex: 1, height: 6, backgroundColor: '#DEDEDB', borderRadius: 3, marginRight: 12, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#E94560' },
    occupancyText: { color: '#5A5A5A', fontSize: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: 'bold' },
    seeMore: { color: '#E94560', fontSize: 14 },
    upcomingList: { paddingHorizontal: 20, marginBottom: 25 },
    appointmentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#DEDEDB' },
    timeBox: { width: 60, justifyContent: 'center' },
    timeText: { color: '#1A1A1A', fontSize: 16, fontWeight: 'bold' },
    appointmentInfo: { flex: 1, paddingHorizontal: 12 },
    clientName: { color: '#1A1A1A', fontSize: 14, fontWeight: '500' },
    serviceName: { color: '#5A5A5A', fontSize: 13, marginTop: 2 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 6 },
    statusBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' },
    emptyState: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#DEDEDB', borderStyle: 'dashed' },
    emptyText: { color: '#9A9A9A', marginTop: 10 },
    quickStatsScroll: { paddingLeft: 20, marginBottom: 25 },
    quickStatCard: { width: 160, height: 90, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginRight: 15, justifyContent: 'center', borderWidth: 1, borderColor: '#DEDEDB' },
    quickStatLabel: { color: '#5A5A5A', fontSize: 12, marginBottom: 4 },
    quickStatValue: { color: '#1A1A1A', fontSize: 16, fontWeight: 'bold' },
    skeletonContainer: { paddingTop: 20 },
    onboardingBanner: { marginHorizontal: 20, marginBottom: 25, backgroundColor: 'rgba(245, 166, 35, 0.1)', borderWidth: 1, borderColor: '#F5A623', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
    bannerIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245, 166, 35, 0.15)', justifyContent: 'center', alignItems: 'center' },
    bannerTitle: { color: '#1A1A1A', fontSize: 13, fontWeight: 'bold' },
    bannerSub: { color: '#F5A623', fontSize: 12, marginTop: 2 },
    bannerAction: { backgroundColor: '#F5A623', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, marginLeft: 10 },
    bannerActionText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
});

export default DashboardScreen;
