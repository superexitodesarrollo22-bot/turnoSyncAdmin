import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { SubscriptionRequest } from '../../types';

type TabKey = 'pending' | 'approved' | 'rejected';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobadas' },
    { key: 'rejected', label: 'Rechazadas' },
];

const STATUS_COLORS: Record<TabKey, { bg: string; text: string }> = {
    pending: { bg: '#F5A623', text: '#1A1A2E' },
    approved: { bg: '#2ECC71', text: '#1A1A2E' },
    rejected: { bg: '#E94560', text: '#FFFFFF' },
};

const STATUS_LABELS: Record<TabKey, string> = {
    pending: 'PENDIENTE',
    approved: 'APROBADA',
    rejected: 'RECHAZADA',
};

function formatDate(iso: string) {
    const date = new Date(iso);
    return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SolicitudesScreen({ navigation }: any) {
    const [selectedTab, setSelectedTab] = useState<TabKey>('pending');
    const [solicitudes, setSolicitudes] = useState<SubscriptionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadSolicitudes = useCallback(async (tab: TabKey) => {
        try {
            const { data, error } = await supabase
                .from('subscription_requests')
                .select('*')
                .eq('status', tab)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSolicitudes(data ?? []);
        } catch (error) {
            console.error('Error loading solicitudes:', error);
            setSolicitudes([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        setSolicitudes([]);
        loadSolicitudes(selectedTab);
    }, [selectedTab, loadSolicitudes]);

    const onRefresh = () => {
        setRefreshing(true);
        loadSolicitudes(selectedTab);
    };

    const renderItem = ({ item }: { item: SubscriptionRequest }) => {
        const status = item.status as TabKey;
        const statusColor = STATUS_COLORS[status] ?? STATUS_COLORS.pending;

        return (
            <View style={styles.card}>
                {/* Header row */}
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                        <Text style={[styles.statusText, { color: statusColor.text }]}>
                            {STATUS_LABELS[status]}
                        </Text>
                    </View>
                    <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
                </View>

                {/* Empresa */}
                <View style={styles.cardRow}>
                    <Ionicons name="business-outline" size={16} color="#4A9FFF" />
                    <View style={styles.cardTextGroup}>
                        <Text style={styles.cardCompany}>{item.company_name}</Text>
                        <Text style={styles.cardCompanyType}>{item.company_description?.slice(0, 60)}</Text>
                    </View>
                </View>

                {/* Admin */}
                <View style={styles.cardRow}>
                    <Ionicons name="person-outline" size={16} color="#8888A0" />
                    <View style={styles.cardTextGroup}>
                        <Text style={styles.cardAdminName}>{item.full_name}</Text>
                        <Text style={styles.cardAdminEmail}>{item.email}</Text>
                        <Text style={styles.cardAdminPhone}>📞 {item.phone}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={() => navigation.navigate('DetalleSolicitud', { solicitud: item })}
                    activeOpacity={0.75}
                >
                    <Text style={styles.detailBtnText}>Ver detalle y gestionar</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        );
    };

    const EmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={72} color="#2ECC71" />
            <Text style={styles.emptyTitle}>
                {selectedTab === 'pending'
                    ? '¡Todo al día!'
                    : selectedTab === 'approved'
                        ? 'Sin aprobadas aún'
                        : 'Sin rechazadas'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {selectedTab === 'pending'
                    ? 'No hay solicitudes pendientes.'
                    : `No hay solicitudes ${selectedTab === 'approved' ? 'aprobadas' : 'rechazadas'}.`}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Solicitudes de suscripción</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
                        onPress={() => setSelectedTab(tab.key)}
                    >
                        <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                        {selectedTab === tab.key && <View style={styles.tabIndicator} />}
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#E94560" />
                </View>
            ) : (
                <FlatList
                    data={solicitudes}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={EmptyState}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E94560" />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#1A1A2E' },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1E1E3A',
    },
    backBtn: {
        padding: 4,
        width: 36,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
    },
    // Tabs
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#12122A',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingBottom: 10,
        position: 'relative',
    },
    tabActive: {},
    tabText: {
        fontSize: 13,
        color: '#8888A0',
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#E94560',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: '15%',
        right: '15%',
        height: 2,
        backgroundColor: '#E94560',
        borderRadius: 2,
    },
    // Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // List
    listContent: {
        padding: 16,
        paddingBottom: 40,
        gap: 16,
        flexGrow: 1,
    },
    // Card
    card: {
        backgroundColor: '#1E1E3A',
        borderRadius: 16,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#2A2A48',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusBadge: {
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    cardDate: {
        fontSize: 12,
        color: '#8888A0',
    },
    cardRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
    },
    cardTextGroup: {
        flex: 1,
    },
    cardCompany: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    cardCompanyType: {
        fontSize: 12,
        color: '#8888A0',
        marginTop: 2,
    },
    cardAdminName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#D0D0E0',
    },
    cardAdminEmail: {
        fontSize: 12,
        color: '#8888A0',
        marginTop: 1,
    },
    cardAdminPhone: {
        fontSize: 12,
        color: '#8888A0',
        marginTop: 1,
    },
    detailBtn: {
        backgroundColor: '#E94560',
        borderRadius: 10,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    detailBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    // Empty state
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#8888A0',
        textAlign: 'center',
    },
});
