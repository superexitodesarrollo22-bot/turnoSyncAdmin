import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';

interface KPIData {
    pendingCount: number;
    businessCount: number;
    approvedCount: number;
    totalRequests: number;
}

export default function SuperuserDashboardScreen({ navigation }: any) {
    const { userProfile, signOut } = useAuth();
    const [kpi, setKpi] = useState<KPIData>({
        pendingCount: 0,
        businessCount: 0,
        approvedCount: 0,
        totalRequests: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 18) return 'Buenas tardes';
        return 'Buenas noches';
    };

    const loadKPIs = useCallback(async () => {
        try {
            const [
                { count: pendingCount },
                { count: businessCount },
                { count: approvedCount },
                { count: totalRequests },
            ] = await Promise.all([
                supabase
                    .from('subscription_requests')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'pending'),
                supabase
                    .from('businesses')
                    .select('id', { count: 'exact', head: true })
                    .eq('active', true),
                supabase
                    .from('subscription_requests')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'approved'),
                supabase
                    .from('subscription_requests')
                    .select('id', { count: 'exact', head: true }),
            ]);

            setKpi({
                pendingCount: pendingCount ?? 0,
                businessCount: businessCount ?? 0,
                approvedCount: approvedCount ?? 0,
                totalRequests: totalRequests ?? 0,
            });
        } catch (error) {
            console.error('Error loading superuser KPIs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadKPIs();
    }, [loadKPIs]);

    const onRefresh = () => {
        setRefreshing(true);
        loadKPIs();
    };

    const firstName = userProfile?.full_name?.split(' ')[0] ?? 'Admin';

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E94560" />
                }
            >
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.logoText}>TurnoSync</Text>
                        <View style={styles.superBadge}>
                            <Text style={styles.superBadgeText}>SUPER ADMIN</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.headerName} numberOfLines={1}>
                            {userProfile?.full_name ?? 'Superuser'}
                        </Text>
                        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                            <Ionicons name="log-out-outline" size={22} color="#A0A0B0" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* SALUDO */}
                <View style={styles.greetingSection}>
                    <Text style={styles.greetingText}>
                        {getGreeting()}, {firstName} 👋
                    </Text>
                    <Text style={styles.greetingSubtext}>Panel de control de la plataforma</Text>
                </View>

                {/* KPI GRID */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#E94560" />
                    </View>
                ) : (
                    <View style={styles.kpiGrid}>
                        <KPICard
                            title="SOLICITUDES PENDIENTES"
                            value={kpi.pendingCount}
                            subtitle="Por revisar"
                            color="#F5A623"
                            icon="time-outline"
                        />
                        <KPICard
                            title="NEGOCIOS ACTIVOS"
                            value={kpi.businessCount}
                            subtitle="En la plataforma"
                            color="#2ECC71"
                            icon="business-outline"
                        />
                        <KPICard
                            title="SOLICITUDES APROBADAS"
                            value={kpi.approvedCount}
                            subtitle="Historial"
                            color="#4A9FFF"
                            icon="checkmark-circle-outline"
                        />
                        <KPICard
                            title="TOTAL SOLICITUDES"
                            value={kpi.totalRequests}
                            subtitle="Acumuladas"
                            color="#A0A0B0"
                            icon="layers-outline"
                        />
                    </View>
                )}

                {/* ACCESOS RÁPIDOS */}
                <Text style={styles.sectionTitle}>Accesos rápidos</Text>

                {/* Solicitudes */}
                <View style={styles.quickAccessWrapper}>
                    {kpi.pendingCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{kpi.pendingCount}</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.quickAccessCard}
                        onPress={() => navigation.navigate('Solicitudes')}
                        activeOpacity={0.75}
                    >
                        <View style={styles.quickAccessLeft}>
                            <View style={[styles.quickIcon, { backgroundColor: 'rgba(249,167,35,0.15)' }]}>
                                <Ionicons name="document-text-outline" size={26} color="#F5A623" />
                            </View>
                            <View style={styles.quickTextGroup}>
                                <Text style={styles.quickTitle}>Solicitudes de suscripción</Text>
                                <Text style={styles.quickSubtitle}>
                                    {kpi.pendingCount > 0
                                        ? `${kpi.pendingCount} pendiente${kpi.pendingCount > 1 ? 's' : ''} de revisión`
                                        : '¡Todo al día! Sin pendientes'}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#A0A0B0" />
                    </TouchableOpacity>
                </View>

                {/* Negocios */}
                <TouchableOpacity
                    style={styles.quickAccessCard}
                    onPress={() => navigation.navigate('AllBusinesses')}
                    activeOpacity={0.75}
                >
                    <View style={styles.quickAccessLeft}>
                        <View style={[styles.quickIcon, { backgroundColor: 'rgba(46,204,113,0.15)' }]}>
                            <Ionicons name="storefront-outline" size={26} color="#2ECC71" />
                        </View>
                        <View style={styles.quickTextGroup}>
                            <Text style={styles.quickTitle}>Negocios registrados</Text>
                            <Text style={styles.quickSubtitle}>Ver todas las empresas</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#A0A0B0" />
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function KPICard({
    title,
    value,
    subtitle,
    color,
    icon,
}: {
    title: string;
    value: number;
    subtitle: string;
    color: string;
    icon: string;
}) {
    return (
        <View style={[styles.kpiCard, { borderTopColor: color }]}>
            <Ionicons name={icon as any} size={22} color={color} style={styles.kpiIcon} />
            <Text style={[styles.kpiValue, { color }]}>{value}</Text>
            <Text style={styles.kpiTitle}>{title}</Text>
            <Text style={styles.kpiSubtitle}>{subtitle}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#1A1A2E',
    },
    container: {
        flex: 1,
        backgroundColor: '#1A1A2E',
        paddingHorizontal: 16,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        marginTop: 8,
    },
    headerLeft: {
        flexDirection: 'column',
    },
    logoText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    superBadge: {
        marginTop: 3,
        backgroundColor: 'rgba(233,69,96,0.2)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(233,69,96,0.5)',
    },
    superBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#E94560',
        letterSpacing: 1.2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        maxWidth: '55%',
    },
    headerName: {
        fontSize: 14,
        color: '#C0C0D0',
        fontWeight: '500',
    },
    signOutBtn: {
        padding: 6,
        backgroundColor: '#1E1E3A',
        borderRadius: 10,
    },
    // Greeting
    greetingSection: {
        marginTop: 8,
        marginBottom: 24,
    },
    greetingText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    greetingSubtext: {
        fontSize: 14,
        color: '#8888A0',
        marginTop: 4,
    },
    // Loading
    loadingContainer: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // KPI Grid
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 28,
    },
    kpiCard: {
        width: '47.5%',
        backgroundColor: '#1E1E3A',
        borderRadius: 16,
        padding: 16,
        borderTopWidth: 3,
    },
    kpiIcon: {
        marginBottom: 10,
    },
    kpiValue: {
        fontSize: 34,
        fontWeight: '800',
    },
    kpiTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8888A0',
        marginTop: 4,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    kpiSubtitle: {
        fontSize: 12,
        color: '#60607A',
        marginTop: 2,
    },
    // Quick access
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    quickAccessWrapper: {
        position: 'relative',
        marginBottom: 12,
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: 10,
        backgroundColor: '#E94560',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        zIndex: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    quickAccessCard: {
        backgroundColor: '#1E1E3A',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderLeftWidth: 4,
        borderLeftColor: '#E94560',
        marginBottom: 12,
    },
    quickAccessLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 14,
    },
    quickIcon: {
        width: 50,
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickTextGroup: {
        flex: 1,
    },
    quickTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    quickSubtitle: {
        fontSize: 12,
        color: '#8888A0',
        marginTop: 3,
    },
});
