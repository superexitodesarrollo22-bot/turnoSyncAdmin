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
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';

interface BusinessRow {
    id: string;
    name: string;
    address: string | null;
    active: boolean;
    created_at: string;
    servicesCount: number;
    staffCount: number;
    appointmentsCount: number;
}

function formatDate(iso: string) {
    const date = new Date(iso);
    return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AllBusinessesScreen({ navigation }: any) {
    const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
    const [filtered, setFiltered] = useState<BusinessRow[]>([]);
    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadBusinesses = useCallback(async () => {
        try {
            // Cargar negocios
            const { data: biz, error } = await supabase
                .from('businesses')
                .select('id, name, address, active, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Cargar contadores en paralelo por negocio
            const enriched = await Promise.all(
                (biz ?? []).map(async (b) => {
                    const [
                        { count: servicesCount },
                        { count: staffCount },
                        { count: appointmentsCount },
                    ] = await Promise.all([
                        supabase
                            .from('services')
                            .select('id', { count: 'exact', head: true })
                            .eq('business_id', b.id),
                        supabase
                            .from('staff')
                            .select('id', { count: 'exact', head: true })
                            .eq('business_id', b.id),
                        supabase
                            .from('appointments')
                            .select('id', { count: 'exact', head: true })
                            .eq('business_id', b.id),
                    ]);
                    return {
                        ...b,
                        servicesCount: servicesCount ?? 0,
                        staffCount: staffCount ?? 0,
                        appointmentsCount: appointmentsCount ?? 0,
                    };
                })
            );

            setBusinesses(enriched);
            setFiltered(enriched);
        } catch (error) {
            console.error('Error loading businesses:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadBusinesses();
    }, [loadBusinesses]);

    useEffect(() => {
        if (!searchText.trim()) {
            setFiltered(businesses);
        } else {
            setFiltered(
                businesses.filter((b) =>
                    b.name.toLowerCase().includes(searchText.toLowerCase())
                )
            );
        }
    }, [searchText, businesses]);

    const onRefresh = () => {
        setRefreshing(true);
        loadBusinesses();
    };

    const toggleActive = async (biz: BusinessRow) => {
        const newState = !biz.active;
        Alert.alert(
            newState ? 'Activar negocio' : 'Desactivar negocio',
            `¿${newState ? 'Activar' : 'Desactivar'} el negocio "${biz.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: newState ? 'Activar' : 'Desactivar',
                    style: newState ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('businesses')
                                .update({ active: newState })
                                .eq('id', biz.id);

                            if (error) throw error;

                            const updater = (list: BusinessRow[]) =>
                                list.map((b) => (b.id === biz.id ? { ...b, active: newState } : b));
                            setBusinesses(updater);
                            setFiltered(updater);
                        } catch (error: any) {
                            Alert.alert('Error', error.message ?? 'No se pudo actualizar el negocio.');
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: BusinessRow }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardName} numberOfLines={1}>
                    {item.name}
                </Text>
                <TouchableOpacity
                    style={[
                        styles.activeBadge,
                        { backgroundColor: item.active ? 'rgba(46,204,113,0.15)' : 'rgba(160,160,176,0.15)' },
                    ]}
                    onPress={() => toggleActive(item)}
                    activeOpacity={0.7}
                >
                    <View
                        style={[styles.activeDot, { backgroundColor: item.active ? '#2ECC71' : '#A0A0B0' }]}
                    />
                    <Text
                        style={[styles.activeBadgeText, { color: item.active ? '#2ECC71' : '#A0A0B0' }]}
                    >
                        {item.active ? 'ACTIVO' : 'INACTIVO'}
                    </Text>
                </TouchableOpacity>
            </View>

            {item.address ? (
                <Text style={styles.cardAddress} numberOfLines={1}>
                    <Ionicons name="location-outline" size={12} color="#8888A0" /> {item.address}
                </Text>
            ) : null}

            <Text style={styles.cardDate}>Registrado: {formatDate(item.created_at)}</Text>

            <View style={styles.countersRow}>
                <CounterChip icon="cut-outline" value={item.servicesCount} label="Servicios" />
                <CounterChip icon="people-outline" value={item.staffCount} label="Staff" />
                <CounterChip icon="calendar-outline" value={item.appointmentsCount} label="Turnos" />
            </View>
        </View>
    );

    const EmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color="#2A2A48" />
            <Text style={styles.emptyTitle}>
                {searchText ? 'Sin resultados' : 'No hay negocios'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {searchText
                    ? `No se encontró "${searchText}"`
                    : 'No hay negocios registrados en la plataforma.'}
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
                <Text style={styles.headerTitle}>Negocios registrados</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Buscador */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color="#8888A0" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar negocio..."
                    placeholderTextColor="#6060780"
                    value={searchText}
                    onChangeText={setSearchText}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearBtn}>
                        <Ionicons name="close-circle" size={18} color="#8888A0" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Count */}
            {!loading && (
                <Text style={styles.countText}>
                    {filtered.length} negocio{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                </Text>
            )}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#E94560" />
                </View>
            ) : (
                <FlatList
                    data={filtered}
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

function CounterChip({
    icon,
    value,
    label,
}: {
    icon: string;
    value: number;
    label: string;
}) {
    return (
        <View style={styles.chip}>
            <Ionicons name={icon as any} size={13} color="#A0A0C0" />
            <Text style={styles.chipText}>
                {value} {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#1A1A2E' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1E1E3A',
    },
    backBtn: { padding: 4, width: 36 },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
    },
    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E3A',
        borderRadius: 14,
        marginHorizontal: 16,
        marginTop: 14,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#2A2A48',
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: '#FFFFFF',
    },
    clearBtn: { padding: 4 },
    countText: {
        fontSize: 12,
        color: '#8888A0',
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 2,
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
        gap: 14,
        flexGrow: 1,
    },
    // Card
    card: {
        backgroundColor: '#1E1E3A',
        borderRadius: 16,
        padding: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: '#2A2A48',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        flex: 1,
        marginRight: 10,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 5,
    },
    activeDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    activeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    cardAddress: {
        fontSize: 12,
        color: '#8888A0',
    },
    cardDate: {
        fontSize: 12,
        color: '#60607A',
    },
    countersRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#12122A',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    chipText: {
        fontSize: 11,
        color: '#A0A0C0',
        fontWeight: '600',
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
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#8888A0',
        textAlign: 'center',
    },
});
