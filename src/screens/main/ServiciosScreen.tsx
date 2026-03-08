import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Switch,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, getInitials } from '../../utils/helpers';
import { Service, Staff } from '../../types';
import Toast, { ToastRef } from '../../components/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { ListScreenSkeleton, StaffCardSkeleton } from '../../components/ui/SkeletonLoader';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import FadeInView from '../../components/ui/FadeInView';
import { GradientButton } from '../../components/ui/GradientButton';

const { width, height } = Dimensions.get('window');

const DURATION_OPTIONS = [
    { label: '15 min', value: 15 },
    { label: '20 min', value: 20 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
    { label: '90 min', value: 90 },
    { label: '2 hrs', value: 120 },
    { label: '3 hrs', value: 180 },
];

const COLORS_AVATAR = ['#E94560', '#4A9FFF', '#2ECC71', '#F1C40F', '#9B59B6', '#E67E22'];

const ServiciosScreen = () => {
    const { business, userProfile } = useAuth();
    const toastRef = useRef<ToastRef>(null);

    const [activeTab, setActiveTab] = useState<'servicios' | 'personal'>('servicios');
    const [services, setServices] = useState<Service[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal Service State
    const [serviceModalVisible, setServiceModalVisible] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [serviceFormLoading, setServiceFormLoading] = useState(false);

    // Service Form State
    const [serviceName, setServiceName] = useState('');
    const [serviceDuration, setServiceDuration] = useState(30);
    const [serviceCustomDuration, setServiceCustomDuration] = useState('');
    const [serviceShowCustomDuration, setServiceShowCustomDuration] = useState(false);
    const [servicePrice, setServicePrice] = useState('');
    const [serviceActive, setServiceActive] = useState(true);

    // Modal Staff State
    const [staffModalVisible, setStaffModalVisible] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [staffFormLoading, setStaffFormLoading] = useState(false);

    // Staff Form State
    const [staffName, setStaffName] = useState('');
    const [staffSpecialty, setStaffSpecialty] = useState('');
    const [staffActive, setStaffActive] = useState(true);

    const fetchData = useCallback(async () => {
        if (!business) return;
        setLoading(true);
        try {
            if (activeTab === 'servicios') {
                const { data, error } = await supabase
                    .from('services')
                    .select('*')
                    .eq('business_id', business.id)
                    .order('active', { ascending: false })
                    .order('name', { ascending: true });

                if (error) throw error;
                setServices(data || []);
            } else {
                const { data, error } = await supabase
                    .from('staff')
                    .select('*')
                    .eq('business_id', business.id)
                    .order('name', { ascending: true });

                if (error) throw error;
                setStaffList(data || []);
            }
        } catch (error: any) {
            console.error('Error fetching data:', error.message);
            toastRef.current?.show(`Error al cargar ${activeTab}`, 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [business, activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // --- SERVICE HANDLERS ---
    const handleOpenServiceModal = (service: Service | null = null) => {
        setEditingService(service);
        if (service) {
            setServiceName(service.name);
            setServiceDuration(service.duration_minutes);
            setServicePrice((service.price_cents / 100).toString());
            setServiceActive(service.active);

            const isPredefined = DURATION_OPTIONS.some(opt => opt.value === service.duration_minutes);
            if (!isPredefined) {
                setServiceShowCustomDuration(true);
                setServiceCustomDuration(service.duration_minutes.toString());
            } else {
                setServiceShowCustomDuration(false);
                setServiceCustomDuration('');
            }
        } else {
            setServiceName('');
            setServiceDuration(30);
            setServicePrice('');
            setServiceActive(true);
            setServiceShowCustomDuration(false);
            setServiceCustomDuration('');
        }
        setServiceModalVisible(true);
    };

    const handleSaveService = async () => {
        if (!business || !userProfile) return;

        if (serviceName.trim().length < 2) {
            toastRef.current?.show('El nombre es demasiado corto', 'error');
            return;
        }

        const finalDuration = serviceShowCustomDuration ? parseInt(serviceCustomDuration) : serviceDuration;
        if (isNaN(finalDuration) || finalDuration <= 0) {
            toastRef.current?.show('Ingresa una duración válida', 'error');
            return;
        }

        const finalPriceCents = Math.round(parseFloat(servicePrice || '0') * 100);

        setServiceFormLoading(true);
        try {
            if (editingService) {
                const { error } = await supabase
                    .from('services')
                    .update({
                        name: serviceName.trim(),
                        duration_minutes: finalDuration,
                        price_cents: finalPriceCents,
                        active: serviceActive,
                    })
                    .eq('id', editingService.id);

                if (error) throw error;

                await supabase.from('audit_logs').insert({
                    business_id: business.id,
                    user_id: userProfile.id,
                    action: 'service_updated',
                    metadata: { service_id: editingService.id, service_name: serviceName.trim() }
                });

                toastRef.current?.show('Servicio actualizado', 'success');
            } else {
                const { error, data } = await supabase
                    .from('services')
                    .insert({
                        business_id: business.id,
                        name: serviceName.trim(),
                        duration_minutes: finalDuration,
                        price_cents: finalPriceCents,
                        active: true
                    })
                    .select()
                    .single();

                if (error) throw error;

                await supabase.from('audit_logs').insert({
                    business_id: business.id,
                    user_id: userProfile.id,
                    action: 'service_created',
                    metadata: { service_id: data.id, service_name: serviceName.trim() }
                });

                toastRef.current?.show('Servicio creado con éxito', 'success');
            }

            setServiceModalVisible(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving service:', error.message);
            toastRef.current?.show('Error al guardar el servicio', 'error');
        } finally {
            setServiceFormLoading(false);
        }
    };

    const handleToggleServiceActive = async (service: Service) => {
        if (!business || !userProfile) return;
        setServices(prev => prev.map(s => s.id === service.id ? { ...s, active: !s.active } : s));
        try {
            const { error } = await supabase
                .from('services')
                .update({ active: !service.active })
                .eq('id', service.id);
            if (error) throw error;
        } catch (error: any) {
            toastRef.current?.show('Error al cambiar estado', 'error');
            fetchData();
        }
    };

    const handleDeleteService = (service: Service) => {
        Alert.alert(
            '¿Eliminar servicio?',
            `Se eliminará "${service.name}". Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('services').delete().eq('id', service.id);
                            if (error) throw error;
                            toastRef.current?.show('Servicio eliminado', 'success');
                            fetchData();
                        } catch (error: any) {
                            toastRef.current?.show('Error al eliminar servicio', 'error');
                        }
                    }
                }
            ]
        );
    };

    // --- STAFF HANDLERS ---
    const handleOpenStaffModal = (staff: Staff | null = null) => {
        setEditingStaff(staff);
        if (staff) {
            setStaffName(staff.name);
            setStaffSpecialty(staff.specialty || '');
            setStaffActive(staff.active);
        } else {
            setStaffName('');
            setStaffSpecialty('');
            setStaffActive(true);
        }
        setStaffModalVisible(true);
    };

    const handleSaveStaff = async () => {
        if (!business || !userProfile) return;

        if (staffName.trim().length < 2) {
            toastRef.current?.show('El nombre es demasiado corto', 'error');
            return;
        }

        setStaffFormLoading(true);
        try {
            if (editingStaff) {
                const { error } = await supabase
                    .from('staff')
                    .update({
                        name: staffName.trim(),
                        specialty: staffSpecialty.trim() || null,
                        active: staffActive,
                    })
                    .eq('id', editingStaff.id);

                if (error) throw error;

                await supabase.from('audit_logs').insert({
                    business_id: business.id,
                    user_id: userProfile.id,
                    action: 'staff_updated',
                    metadata: { staff_id: editingStaff.id, staff_name: staffName.trim() }
                });

                toastRef.current?.show('Miembro actualizado', 'success');
            } else {
                const { data, error } = await supabase
                    .from('staff')
                    .insert({
                        business_id: business.id,
                        name: staffName.trim(),
                        specialty: staffSpecialty.trim() || null,
                        active: true
                    })
                    .select()
                    .single();

                if (error) throw error;

                await supabase.from('audit_logs').insert({
                    business_id: business.id,
                    user_id: userProfile.id,
                    action: 'staff_created',
                    metadata: { staff_id: data.id, staff_name: staffName.trim() }
                });

                toastRef.current?.show('Miembro agregado al equipo', 'success');
            }

            setStaffModalVisible(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving staff:', error.message);
            toastRef.current?.show('Error al guardar miembro', 'error');
        } finally {
            setStaffFormLoading(false);
        }
    };

    const handleToggleStaffActive = async (staff: Staff) => {
        if (!business) return;
        setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, active: !s.active } : s));
        try {
            const { error } = await supabase
                .from('staff')
                .update({ active: !staff.active })
                .eq('id', staff.id);
            if (error) throw error;
        } catch (error: any) {
            toastRef.current?.show('Error al cambiar estado', 'error');
            fetchData();
        }
    };

    const handleDeleteStaff = (staff: Staff) => {
        Alert.alert(
            '¿Eliminar miembro?',
            `Se eliminará a "${staff.name}". Los turnos ya asignados conservarán la información, pero él/ella ya no aparecerá como opción disponible.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        if (!business || !userProfile) return;
                        try {
                            const { error } = await supabase.from('staff').delete().eq('id', staff.id);
                            if (error) throw error;

                            await supabase.from('audit_logs').insert({
                                business_id: business.id,
                                user_id: userProfile.id,
                                action: 'staff_deleted',
                                metadata: { staff_id: staff.id, staff_name: staff.name }
                            });

                            toastRef.current?.show('Miembro eliminado', 'success');
                            fetchData();
                        } catch (error: any) {
                            toastRef.current?.show('Error al eliminar', 'error');
                        }
                    }
                }
            ]
        );
    };

    const getAvatarColor = (name: string) => {
        const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return COLORS_AVATAR[charCodeSum % COLORS_AVATAR.length];
    };

    // --- RENDER ITEMS ---
    const renderServiceItem = ({ item, index }: { item: Service, index: number }) => (
        <FadeInView delay={index * 80}>
            <AnimatedPressable style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="cut-outline" size={24} color="#E94560" />
                    </View>
                    <View style={styles.cardMain}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardSubtitle}>
                            {item.duration_minutes} min • {formatCurrency(item.price_cents)}
                        </Text>
                    </View>
                    <View style={styles.cardRight}>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: item.active ? 'rgba(46, 204, 113, 0.2)' : 'rgba(160, 160, 176, 0.2)' }
                        ]}>
                            <Text style={[styles.statusText, { color: item.active ? '#2ECC71' : '#A0A0B0' }]}>
                                {item.active ? 'ACTIVO' : 'INACTIVO'}
                            </Text>
                        </View>
                        <Switch
                            value={item.active}
                            onValueChange={() => handleToggleServiceActive(item)}
                            trackColor={{ false: '#3A3A5A', true: '#2ECC71' }}
                            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : ''}
                        />
                    </View>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenServiceModal(item)}>
                        <Ionicons name="pencil-outline" size={18} color="#4A9FFF" />
                        <Text style={styles.actionBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteService(item)}>
                        <Ionicons name="trash-outline" size={18} color="#E94560" />
                        <Text style={[styles.actionBtnText, { color: '#E94560' }]}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </AnimatedPressable>
        </FadeInView>
    );

    const renderStaffItem = ({ item, index }: { item: Staff, index: number }) => (
        <FadeInView delay={index * 80}>
            <AnimatedPressable style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor(item.name) }]}>
                        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                    </View>
                    <View style={styles.cardMain}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardSubtitle}>{item.specialty || 'Sin especialidad'}</Text>
                    </View>
                    <View style={styles.cardRight}>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: item.active ? 'rgba(46, 204, 113, 0.2)' : 'rgba(160, 160, 176, 0.2)' }
                        ]}>
                            <Text style={[styles.statusText, { color: item.active ? '#2ECC71' : '#A0A0B0' }]}>
                                {item.active ? 'ACTIVO' : 'INACTIVO'}
                            </Text>
                        </View>
                        <Switch
                            value={item.active}
                            onValueChange={() => handleToggleStaffActive(item)}
                            trackColor={{ false: '#3A3A5A', true: '#2ECC71' }}
                            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : ''}
                        />
                    </View>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenStaffModal(item)}>
                        <Ionicons name="pencil-outline" size={18} color="#4A9FFF" />
                        <Text style={styles.actionBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteStaff(item)}>
                        <Ionicons name="trash-outline" size={18} color="#E94560" />
                        <Text style={[styles.actionBtnText, { color: '#E94560' }]}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </AnimatedPressable>
        </FadeInView>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <Text style={styles.headerTitle}>Gestión</Text>
                    <TouchableOpacity
                        onPress={() => activeTab === 'servicios' ? handleOpenServiceModal() : handleOpenStaffModal()}
                    >
                        <Ionicons name="add-circle" size={32} color="#E94560" />
                    </TouchableOpacity>
                </View>

                {/* Tabs internas */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'servicios' && styles.tabActive]}
                        onPress={() => setActiveTab('servicios')}
                    >
                        <Text style={[styles.tabText, activeTab === 'servicios' && styles.tabTextActive]}>Servicios</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'personal' && styles.tabActive]}
                        onPress={() => setActiveTab('personal')}
                    >
                        <Text style={[styles.tabText, activeTab === 'personal' && styles.tabTextActive]}>Personal</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.listContainer}>
                        {activeTab === 'servicios' ? (
                            <ListScreenSkeleton count={5} />
                        ) : (
                            <View>
                                {[1, 2, 3, 4, 5].map(i => <StaffCardSkeleton key={i} />)}
                            </View>
                        )}
                    </View>
                ) : (
                    <FlatList
                        data={(activeTab === 'servicios' ? services : staffList) as any}
                        renderItem={(activeTab === 'servicios' ? renderServiceItem : renderStaffItem) as any}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContainer}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E94560" />}
                        ListEmptyComponent={
                            <EmptyState
                                icon={activeTab === 'servicios' ? 'cut-outline' : 'people-outline'}
                                title={activeTab === 'servicios' ? 'Sin servicios configurados' : 'Sin miembros del equipo'}
                                subtitle={
                                    activeTab === 'servicios'
                                        ? 'Configura los servicios que ofrece tu negocio.'
                                        : 'Agrega tu primer colaborador para comenzar a gestionar turnos.'
                                }
                                actionLabel={activeTab === 'servicios' ? 'Crear servicio' : 'Agregar miembro'}
                                onAction={() => activeTab === 'servicios' ? handleOpenServiceModal() : handleOpenStaffModal()}
                            />
                        }
                    />
                )}
            </View>

            {/* Floating Action Button */}
            {!loading && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => activeTab === 'servicios' ? handleOpenServiceModal() : handleOpenStaffModal()}
                >
                    <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
            )}

            {/* MODAL SERVICIOS */}
            <Modal visible={serviceModalVisible} transparent animationType="slide" onRequestClose={() => setServiceModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingService ? 'Editar servicio' : 'Nuevo servicio'}</Text>
                            <TouchableOpacity onPress={() => setServiceModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#A0A0B0" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nombre *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Corte de cabello"
                                    placeholderTextColor="#606070"
                                    value={serviceName}
                                    onChangeText={setServiceName}
                                    maxLength={60}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Duración *</Text>
                                <View style={styles.durationGrid}>
                                    {DURATION_OPTIONS.map(opt => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[styles.durationBtn, !serviceShowCustomDuration && serviceDuration === opt.value && styles.durationBtnActive]}
                                            onPress={() => { setServiceDuration(opt.value); setServiceShowCustomDuration(false); }}
                                        >
                                            <Text style={[styles.durationBtnText, !serviceShowCustomDuration && serviceDuration === opt.value && styles.durationBtnTextActive]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    <TouchableOpacity
                                        style={[styles.durationBtn, serviceShowCustomDuration && styles.durationBtnActive]}
                                        onPress={() => setServiceShowCustomDuration(true)}
                                    >
                                        <Text style={[styles.durationBtnText, serviceShowCustomDuration && styles.durationBtnTextActive]}>Otro</Text>
                                    </TouchableOpacity>
                                </View>
                                {serviceShowCustomDuration && (
                                    <View style={styles.customDurationRow}>
                                        <TextInput
                                            style={[styles.input, { flex: 1 }]}
                                            placeholder="Minutos"
                                            placeholderTextColor="#606070"
                                            keyboardType="numeric"
                                            value={serviceCustomDuration}
                                            onChangeText={setServiceCustomDuration}
                                        />
                                        <Text style={styles.suffix}>minutos</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Precio *</Text>
                                <View style={styles.priceRow}>
                                    <Text style={styles.currency}>$</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="0.00"
                                        placeholderTextColor="#606070"
                                        keyboardType="decimal-pad"
                                        value={servicePrice}
                                        onChangeText={setServicePrice}
                                    />
                                </View>
                            </View>
                            {editingService && (
                                <View style={styles.modalToggleRow}>
                                    <Text style={styles.label}>Servicio Activo</Text>
                                    <Switch value={serviceActive} onValueChange={setServiceActive} trackColor={{ false: '#3A3A5A', true: '#2ECC71' }} />
                                </View>
                            )}
                            <GradientButton
                                label="Guardar Servicio"
                                onPress={handleSaveService}
                                loading={serviceFormLoading}
                                disabled={serviceFormLoading}
                                style={{ marginTop: 10 }}
                            />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MODAL STAFF */}
            <Modal visible={staffModalVisible} transparent animationType="slide" onRequestClose={() => setStaffModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingStaff ? 'Editar miembro' : 'Nuevo miembro'}</Text>
                            <TouchableOpacity onPress={() => setStaffModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#A0A0B0" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.avatarPreviewCenter}>
                                <View style={[styles.avatarCircleLarge, { backgroundColor: getAvatarColor(staffName || 'A') }]}>
                                    <Text style={styles.avatarTextLarge}>{getInitials(staffName || 'A')}</Text>
                                </View>
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nombre completo *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Juan García"
                                    placeholderTextColor="#606070"
                                    value={staffName}
                                    onChangeText={setStaffName}
                                    maxLength={60}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Especialidad / Cargo</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Peluquero, Colorista..."
                                    placeholderTextColor="#606070"
                                    value={staffSpecialty}
                                    onChangeText={setStaffSpecialty}
                                    maxLength={50}
                                />
                            </View>
                            {editingStaff && (
                                <View style={styles.modalToggleRow}>
                                    <Text style={styles.label}>Miembro Activo</Text>
                                    <Switch value={staffActive} onValueChange={setStaffActive} trackColor={{ false: '#3A3A5A', true: '#2ECC71' }} />
                                </View>
                            )}
                            <GradientButton
                                label="Guardar Personal"
                                onPress={handleSaveStaff}
                                loading={staffFormLoading}
                                disabled={staffFormLoading}
                                style={{ marginTop: 10 }}
                            />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Toast ref={toastRef} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1A1A2E' },
    header: { paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { color: 'white', fontSize: 26, fontWeight: 'bold' },
    tabsContainer: { flexDirection: 'row', backgroundColor: '#16213E', borderRadius: 12, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: '#E94560' },
    tabText: { color: '#A0A0B0', fontSize: 14, fontWeight: 'bold' },
    tabTextActive: { color: 'white' },
    content: { flex: 1 },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 15, paddingBottom: 100 },
    card: { backgroundColor: '#1E1E3A', borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#2A2A4A' },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(233, 69, 96, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    cardMain: { flex: 1 },
    cardTitle: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    cardSubtitle: { color: '#A0A0B0', fontSize: 14, marginTop: 4 },
    cardRight: { alignItems: 'flex-end' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#2A2A4A', marginTop: 15, paddingTop: 15 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 30 },
    actionBtnText: { color: '#4A9FFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
    fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#E94560', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
    emptyTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
    emptySubtitle: { color: '#A0A0B0', fontSize: 14, textAlign: 'center', marginTop: 10, paddingHorizontal: 40, lineHeight: 22 },
    emptyBtn: { backgroundColor: '#E94560', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 15, marginTop: 30 },
    emptyBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1E1E3A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: height * 0.9 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    inputGroup: { marginBottom: 20 },
    label: { color: 'white', fontSize: 14, fontWeight: '600', marginBottom: 10 },
    input: { backgroundColor: '#2A2A4A', borderRadius: 12, height: 55, paddingHorizontal: 15, color: 'white', fontSize: 16, borderWidth: 1, borderColor: '#3A3A5A' },
    durationGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -5 },
    durationBtn: { width: (width - 70) / 3, margin: 5, backgroundColor: '#2A2A4A', height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#3A3A5A' },
    durationBtnActive: { backgroundColor: '#E94560', borderColor: '#E94560' },
    durationBtnText: { color: '#A0A0B0', fontSize: 14, fontWeight: '500' },
    durationBtnTextActive: { color: 'white', fontWeight: 'bold' },
    customDurationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15 },
    suffix: { color: '#A0A0B0', marginLeft: 12, fontSize: 15 },
    priceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A4A', borderRadius: 12, height: 55, paddingHorizontal: 15, borderWidth: 1, borderColor: '#3A3A5A' },
    currency: { color: '#A0A0B0', fontSize: 18, marginRight: 10 },
    priceInput: { flex: 1, color: 'white', fontSize: 18, fontWeight: 'bold' },
    modalToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#2A2A4A', marginBottom: 15 },
    saveBtn: { height: 55, borderRadius: 15, overflow: 'hidden', marginTop: 10 },
    saveGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    // Staff extras
    avatarPreviewCenter: { alignItems: 'center', marginBottom: 25 },
    avatarCircleLarge: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    avatarTextLarge: { color: 'white', fontSize: 36, fontWeight: 'bold' },
});

export default ServiciosScreen;
