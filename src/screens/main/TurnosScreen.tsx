import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRoute } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    Modal,
    ActivityIndicator,
    Platform,
    Dimensions,
    ScrollView,
    RefreshControl,
    LayoutAnimation,
    StatusBar,
    Animated as NativeAnimated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatTime12h, getISODate, getLongDate, getShortDayName } from '../../utils/helpers';
import { getActiveStaff } from '../../services/staffService';
import { Appointment, AppointmentStatus, Staff } from '../../types';
import Toast, { ToastRef } from '../../components/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import {
    scheduleAppointmentReminder,
    cancelAppointmentReminder,
    getNotificationMapping,
    removeNotificationMapping
} from '../../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ListScreenSkeleton } from '../../components/ui/SkeletonLoader';
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import FadeInView from '../../components/ui/FadeInView';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { GradientButton } from '../../components/ui/GradientButton';
import { PremiumCard } from '../../components/ui/PremiumCard';

const { width, height } = Dimensions.get('window');

type ViewMode = 'list' | 'week' | 'day';

const STATUS_FILTERS: { label: string; value: AppointmentStatus | 'all' }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Pendiente', value: 'pending' },
    { label: 'Confirmado', value: 'confirmed' },
    { label: 'Completado', value: 'completed' },
    { label: 'Cancelado', value: 'cancelled' },
];

const STATUS_COLORS: Record<AppointmentStatus, string> = {
    pending: '#F5A623',
    confirmed: '#2ECC71',
    completed: '#4A9FFF',
    cancelled: '#E94560',
};

const TurnosScreen = ({ navigation }: any) => {
    const { business, userProfile } = useAuth();
    const toastRef = useRef<ToastRef>(null);
    const route = useRoute();

    // Lee el appointmentId si la pantalla se abrió desde una notificación push
    const appointmentIdFromNotif = (route.params as any)?.appointmentId as string | undefined;

    // States
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [notifSettings, setNotifSettings] = useState({ reminder: 15, new: true, cancelled: true });

    // Staff Assignment
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [staffAssignModalVisible, setStaffAssignModalVisible] = useState(false);
    const [assigningLoading, setAssigningLoading] = useState(false);
    const [clientsMap, setClientsMap] = useState<Record<string, any>>({});

    // Realtime Indicator animation
    const liveDotOpacity = useRef(new NativeAnimated.Value(0.4)).current;
    useEffect(() => {
        NativeAnimated.loop(
            NativeAnimated.sequence([
                NativeAnimated.timing(liveDotOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                NativeAnimated.timing(liveDotOpacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const fetchAppointments = useCallback(async () => {
        if (!business) return;
        setLoading(true);
        try {
            const dateStr = getISODate(selectedDate);
            let query = supabase
                .from('appointments')
                .select(`
                    id, start_at, end_at, status, price_cents, notes,
                    created_at, client_user_id,
                    services(id, name, duration_minutes),
                    staff(id, name, specialty, photo_url)
                `)
                .eq('business_id', business.id)
                .gte('start_at', `${dateStr}T00:00:00.000Z`)
                .lte('start_at', `${dateStr}T23:59:59.999Z`);

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query.order('start_at', { ascending: true });

            if (error) throw error;
            const apps = data as unknown as Appointment[] || [];
            setAppointments(apps);

            // Cargar datos de clientes via RPC para evitar bloqueo de RLS
            if (apps.length > 0) {
                const newMap: Record<string, any> = {};
                await Promise.all(
                    apps.map(async (app) => {
                        try {
                            const { data: clientData } = await supabase
                                .rpc('get_appointment_client', {
                                    p_appointment_id: app.id
                                });
                            if (clientData && clientData.length > 0) {
                                newMap[app.client_user_id] = clientData[0];
                            }
                        } catch (e) {
                            console.log('Error cargando cliente:', e);
                        }
                    })
                );
                setClientsMap(newMap);
            }

            scheduleFutureReminders(apps);
        } catch (error: any) {
            console.error('Error fetching appointments:', error.message);
            toastRef.current?.show('Error al cargar turnos', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [business, selectedDate, statusFilter]);

    // Abre el detalle del turno cuando la pantalla se navega desde una notificación
    useEffect(() => {
        if (!appointmentIdFromNotif || !business) return;
        buscarTurnoPorId(appointmentIdFromNotif);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appointmentIdFromNotif, business]);

    // Busca un turno por id aunque no esté en la vista actual
    const buscarTurnoPorId = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    id, start_at, end_at, status, price_cents, notes,
                    created_at, client_user_id,
                    services(id, name, duration_minutes),
                    staff(id, name, specialty, photo_url)
                `)
                .eq('id', id)
                .eq('business_id', business!.id)
                .single();

            if (error || !data) return;

            // Cargar datos del cliente via RPC
            try {
                const { data: clientData } = await supabase
                    .rpc('get_appointment_client', { p_appointment_id: id });
                if (clientData && clientData.length > 0) {
                    setClientsMap(prev => ({
                        ...prev,
                        [data.client_user_id]: clientData[0]
                    }));
                }
            } catch (e) {
                console.log('Error cargando cliente por id:', e);
            }

            const fechaDelTurno = new Date(data.start_at);
            setSelectedDate(fechaDelTurno);
            setSelectedAppointment(data as unknown as Appointment);
        } catch (err) {
            console.error('[Push] Error al buscar turno por id:', err);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    // Supabase Realtime
    useEffect(() => {
        if (!business) return;

        const channel = supabase
            .channel(`business-appointments-${business.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'appointments',
                    filter: `business_id=eq.${business.id}`
                },
                (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload;

                    if (eventType === 'INSERT' && notifSettings.new) {
                        Notifications.scheduleNotificationAsync({
                            content: {
                                title: '📅 Nuevo turno agendado',
                                body: `Tienes una nueva cita para el ${new Date(newRecord.start_at).toLocaleDateString()}`,
                                data: { appointmentId: newRecord.id, type: 'new_appointment' },
                            },
                            trigger: null,
                        });
                    }

                    if (eventType === 'UPDATE' && newRecord.status === 'cancelled' && oldRecord.status !== 'cancelled' && notifSettings.cancelled) {
                        Notifications.scheduleNotificationAsync({
                            content: {
                                title: '❌ Turno cancelado',
                                body: `Se ha cancelado el turno de las ${formatTime12h(newRecord.start_at)}`,
                                data: { appointmentId: newRecord.id, type: 'cancelled' },
                            },
                            trigger: null,
                        });
                    }

                    fetchAppointments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [business, fetchAppointments]);

    const scheduleFutureReminders = useCallback(async (apps: Appointment[]) => {
        if (!business?.push_notifications_enabled || notifSettings.reminder === 0) return;

        for (const app of apps) {
            if (app.status === 'pending' || app.status === 'confirmed') {
                const existing = await getNotificationMapping(app.id);
                if (!existing) {
                    await scheduleAppointmentReminder({
                        id: app.id,
                        clientName: (app as any).users?.full_name || 'Cliente',
                        serviceName: (app as any).services?.name || 'Servicio',
                        start_at: app.start_at
                    }, notifSettings.reminder);
                }
            }
        }
    }, [business, notifSettings.reminder]);

    useEffect(() => {
        const loadSettings = async () => {
            const r = await AsyncStorage.getItem('notif_reminder_minutes');
            const n = await AsyncStorage.getItem('notif_new_appointment');
            const c = await AsyncStorage.getItem('notif_cancelled');
            setNotifSettings({
                reminder: r ? parseInt(r) : 15,
                new: n !== 'false',
                cancelled: c !== 'false'
            });
        };
        loadSettings();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAppointments();
    };

    const changeDate = (direction: number) => {
        const nextDate = new Date(selectedDate);
        nextDate.setDate(selectedDate.getDate() + direction);
        setSelectedDate(nextDate);
    };

    const fetchStaff = useCallback(async () => {
        if (!business) return;
        const data = await getActiveStaff(business.id);
        setStaffList(data);
    }, [business]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const handleAssignStaff = async (staffId: string | null) => {
        if (!business || !selectedAppointment) return;
        setAssigningLoading(true);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ staff_id: staffId })
                .eq('id', selectedAppointment.id);

            if (error) throw error;

            toastRef.current?.show('Personal asignado correctamente', 'success');
            setStaffAssignModalVisible(false);
            fetchAppointments();

            const updatedStaff = staffId ? staffList.find(s => s.id === staffId) : undefined;
            setSelectedAppointment({
                ...selectedAppointment,
                staff_id: staffId,
                staff: updatedStaff
            });
        } catch (error: any) {
            toastRef.current?.show('Error al asignar personal', 'error');
        } finally {
            setAssigningLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: AppointmentStatus) => {
        if (!business || !userProfile) return;

        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', id)
                .eq('business_id', business.id);

            if (error) throw error;

            toastRef.current?.show(`Turno ${newStatus === 'cancelled' ? 'cancelado' : 'actualizado'}`, newStatus === 'cancelled' ? 'error' : 'success');
            setSelectedAppointment(null);
            fetchAppointments();

            await supabase.from('audit_logs').insert({
                business_id: business.id,
                user_id: userProfile.id,
                action: `appointment_${newStatus}_by_admin`,
                metadata: { appointment_id: id }
            });
        } catch (error: any) {
            toastRef.current?.show('Error al actualizar el turno', 'error');
        }
    };

    const handleCancelClick = (item: Appointment) => {
        Alert.alert(
            '¿Cancelar turno?',
            `Se cancelará el turno de ${getClient(item)?.full_name || 'Cliente'} para las ${formatTime12h(item.start_at)}.\n\nEsta acción dejará el espacio libre para otros clientes.`,
            [
                { text: 'No, mantener', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: () => handleUpdateStatus(item.id, 'cancelled')
                }
            ]
        );
    };

    const getClient = useCallback((item: Appointment) => {
        return clientsMap[item.client_user_id] || null;
    }, [clientsMap]);

    const renderAppointmentItem = ({ item, index }: { item: Appointment, index: number }) => {
        const isCancelled = item.status === 'cancelled';
        const client = getClient(item);
        const service = (item as any).services;

        return (
            <FadeInView delay={index * 60}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedAppointment(item)}
                    style={[
                        styles.appointmentCard,
                        isCancelled && { opacity: 0.55 }
                    ]}
                >
                    <View style={[styles.statusBand, { backgroundColor: STATUS_COLORS[item.status] }]} />

                    <View style={styles.cardContent}>
                        {/* Fila principal: hora + cliente + badge */}
                        <View style={styles.cardRow}>
                            <View style={styles.timeBlock}>
                                <Text style={styles.timeText}>{formatTime12h(item.start_at)}</Text>
                                <Text style={styles.durationText}>{service?.duration_minutes} min</Text>
                            </View>

                            <View style={styles.clientBlock}>
                                <Text style={[styles.clientName, isCancelled && styles.strikethrough]} numberOfLines={1}>
                                    {client?.full_name || 'Invitado'}
                                </Text>
                                <Text style={styles.clientContact} numberOfLines={1}>
                                    {client?.email || 'Sin email'}
                                </Text>
                            </View>

                            <StatusBadge status={item.status} size="sm" />
                        </View>

                        {/* Fila secundaria: servicio + staff + cancelar */}
                        <View style={styles.cardRow2}>
                            <Ionicons name="cut-outline" size={12} color="#707080" />
                            <Text style={[styles.serviceNameText, isCancelled && styles.strikethrough]} numberOfLines={1}>
                                {service?.name} • {formatCurrency(item.price_cents)}
                            </Text>
                            <Ionicons name="person-outline" size={12} color="#707080" style={{ marginLeft: 8 }} />
                            <Text style={styles.staffNameSmall} numberOfLines={1}>
                                {item.staff?.name || 'Sin asignar'}
                            </Text>

                            {(item.status === 'pending' || item.status === 'confirmed') && (
                                <TouchableOpacity
                                    style={styles.cancelBtnSmall}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleCancelClick(item);
                                    }}
                                >
                                    <Text style={styles.cancelBtnTextSmall}>Cancelar</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Notas (solo si existen) */}
                        {item.notes ? (
                            <View style={styles.notesBox}>
                                <Text style={styles.notesText} numberOfLines={1}>"{item.notes}"</Text>
                            </View>
                        ) : null}
                    </View>
                </TouchableOpacity>
            </FadeInView>
        );
    };

    const renderWeekView = () => {
        const start = new Date(selectedDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            weekDays.push(d);
        }

        return (
            <View style={styles.weekContainer}>
                <View style={styles.weekDaysGrid}>
                    {weekDays.map((d, i) => {
                        const isSelected = getISODate(d) === getISODate(selectedDate);
                        return (
                            <TouchableOpacity
                                key={i}
                                style={[styles.weekDayBtn, isSelected && styles.weekDayBtnActive]}
                                onPress={() => setSelectedDate(d)}
                            >
                                <Text style={[styles.weekDayLabel, isSelected && styles.weekDayLabelActive]}>
                                    {getShortDayName(d.getDay())}
                                </Text>
                                <Text style={[styles.weekDayNum, isSelected && styles.weekDayNumActive]}>
                                    {d.getDate()}
                                </Text>
                                <View style={[styles.dot, { opacity: 0.3 }]} />
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <FlatList
                    data={appointments}
                    renderItem={renderAppointmentItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E94560" />}
                    ListEmptyComponent={
                        <View style={{ paddingTop: 40 }}>
                            <EmptyState
                                icon="calendar-outline"
                                title="Sin turnos por hoy"
                                subtitle="No hay citas programadas. Las nuevas reservas aparecerán aquí."
                            />
                        </View>
                    }
                />
            </View>
        );
    };

    const renderTimelineView = () => {
        const hours = Array.from({ length: 15 }, (_, i) => i + 8);

        return (
            <ScrollView
                style={styles.timelineScroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E94560" />}
            >
                {hours.map(hour => {
                    const appsInHour = appointments.filter(a => {
                        const h = new Date(a.start_at).getHours();
                        return h === hour;
                    });

                    return (
                        <View key={hour} style={styles.timelineRow}>
                            <View style={styles.timelineTime}>
                                <Text style={styles.timelineTimeText}>{hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}</Text>
                            </View>
                            <View style={styles.timelineContent}>
                                {appsInHour.length > 0 ? (
                                    appsInHour.map(a => (
                                        <TouchableOpacity
                                            key={a.id}
                                            style={[styles.timelineApp, { backgroundColor: STATUS_COLORS[a.status] + '40', borderColor: STATUS_COLORS[a.status] }]}
                                            onPress={() => setSelectedAppointment(a)}
                                        >
                                            <Text style={styles.timelineAppName}>{(a as any).users?.full_name}</Text>
                                            <Text style={styles.timelineAppService}>{(a as any).services?.name}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.timelineEmpty}>
                                        <Text style={styles.timelineEmptyText}>Disponible</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        );
    };

    const StaffAssignmentModal = () => (
        <Modal visible={staffAssignModalVisible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.dialogBox}>
                    <Text style={styles.dialogTitle}>Asignar Personal</Text>
                    <Text style={styles.dialogSubtitle}>Selecciona quién atenderá este turno</Text>

                    <ScrollView style={{ maxHeight: 300 }}>
                        <TouchableOpacity
                            style={styles.staffOption}
                            onPress={() => handleAssignStaff(null)}
                        >
                            <View style={[styles.staffOptionCircle, { backgroundColor: '#3A3A5A' }]}>
                                <Ionicons name="person-remove-outline" size={20} color="white" />
                            </View>
                            <Text style={styles.staffOptionName}>Sin asignar</Text>
                        </TouchableOpacity>

                        {staffList.map(s => (
                            <TouchableOpacity
                                key={s.id}
                                style={styles.staffOption}
                                onPress={() => handleAssignStaff(s.id)}
                            >
                                <View style={[styles.staffOptionCircle, { backgroundColor: '#4A9FFF' }]}>
                                    <Text style={styles.staffOptionInitial}>{s.name.charAt(0)}</Text>
                                </View>
                                <View>
                                    <Text style={styles.staffOptionName}>{s.name}</Text>
                                    <Text style={styles.staffOptionSpecialty}>{s.specialty || 'Personal'}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.dialogCloseBtn}
                        onPress={() => setStaffAssignModalVisible(false)}
                    >
                        <Text style={styles.dialogCloseText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const AppointmentDetailModal = () => {
        if (!selectedAppointment) return null;
        const client = selectedAppointment ? getClient(selectedAppointment) : null;
        const service = (selectedAppointment as any).services;
        const isPast = new Date(selectedAppointment.start_at) < new Date();

        return (
            <Modal visible={!!selectedAppointment} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.bottomSheet}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeader}>
                            <StatusBadge status={selectedAppointment.status} size="md" />
                            <TouchableOpacity onPress={() => setSelectedAppointment(null)}>
                                <Ionicons name="close" size={28} color="#A0A0B0" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.sheetSection}>
                                <Text style={styles.sheetSectionTitle}>Información del turno</Text>
                                <View style={styles.detailRow}>
                                    <Ionicons name="calendar-outline" size={20} color="#E94560" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.detailValue}>{getLongDate(new Date(selectedAppointment.start_at))}</Text>
                                        <Text style={styles.detailSubValue}>
                                            {formatTime12h(selectedAppointment.start_at)} - {formatTime12h(selectedAppointment.end_at)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="cut-outline" size={20} color="#E94560" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.detailValue}>{service?.name}</Text>
                                        <Text style={styles.detailSubValue}>{service?.duration_minutes} min • {formatCurrency(selectedAppointment.price_cents)}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.sheetSection}>
                                <Text style={styles.sheetSectionTitle}>Cliente</Text>
                                <View style={styles.clientInfoCard}>
                            <View style={styles.clientAvatarMini}>
                                <Text style={styles.clientAvatarText}>
                                    {client?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                </Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.detailValue}>
                                    {client?.full_name ?? 'Cargando...'}
                                </Text>
                                <Text style={styles.detailSubValue}>
                                    {client?.email ?? ''}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.copyBtn}>
                                <Ionicons name="copy-outline" size={18} color="#4A9FFF" />
                            </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.sheetSection}>
                                <Text style={styles.sheetSectionTitle}>Notas cliente</Text>
                                <View style={styles.notesContainer}>
                                    <Text style={styles.notesTextContent}>
                                        {selectedAppointment.notes || "Sin notas adicionales del cliente."}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.sheetSection}>
                                <Text style={styles.sheetSectionTitle}>Personal asignado</Text>
                                <View style={styles.staffAssignCard}>
                                    {selectedAppointment.staff ? (
                                        <>
                                            <View style={[styles.staffAvatarMini, { backgroundColor: '#4A9FFF' }]}>
                                                <Text style={styles.clientAvatarText}>
                                                    {selectedAppointment.staff.name.charAt(0)}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={styles.detailValue}>{selectedAppointment.staff.name}</Text>
                                                <Text style={styles.detailSubValue}>
                                                    {selectedAppointment.staff.specialty || 'Especialista'}
                                                </Text>
                                            </View>
                                        </>
                                    ) : (
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.detailValue, { color: '#606070' }]}>Sin personal asignado</Text>
                                            <Text style={styles.detailSubValue}>Asigna a alguien para esta cita</Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.changeBtn}
                                        onPress={() => setStaffAssignModalVisible(true)}
                                    >
                                        <Text style={styles.changeBtnText}>
                                            {selectedAppointment.staff ? 'Cambiar' : 'Asignar'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.actionsContainer}>
                                {selectedAppointment.status === 'pending' && !isPast && (
                                    <GradientButton
                                        label="Confirmar turno"
                                        onPress={() => handleUpdateStatus(selectedAppointment.id, 'confirmed')}
                                        icon="checkmark-done"
                                        variant="accent"
                                    />
                                )}

                                {selectedAppointment.status === 'confirmed' && (
                                    <GradientButton
                                        label="Marcar completado"
                                        onPress={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                                        icon="checkmark-circle"
                                        variant="primary"
                                        style={{ marginTop: 12 }}
                                    />
                                )}

                                {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'confirmed') && (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#E94560', marginTop: 12 }]}
                                        onPress={() => handleCancelClick(selectedAppointment)}
                                    >
                                        <Ionicons name="close-circle" size={20} color="white" />
                                        <Text style={styles.actionBtnText}>Cancelar turno</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <View style={styles.titleContainer}>
                    <Text style={styles.headerTitle}>Turnos</Text>
                    <NativeAnimated.View style={[styles.liveDot, { opacity: liveDotOpacity }]}>
                        <View style={styles.dotInternal} />
                        <Text style={styles.liveText}>En vivo</Text>
                    </NativeAnimated.View>
                </View>

                <View style={styles.viewSwitcher}>
                    <TouchableOpacity onPress={() => setViewMode('list')} style={[styles.switchBtn, viewMode === 'list' && styles.switchBtnActive]}>
                        <Ionicons name="list" size={18} color={viewMode === 'list' ? 'white' : '#A0A0B0'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setViewMode('week')} style={[styles.switchBtn, viewMode === 'week' && styles.switchBtnActive]}>
                        <Ionicons name="calendar" size={18} color={viewMode === 'week' ? 'white' : '#A0A0B0'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setViewMode('day')} style={[styles.switchBtn, viewMode === 'day' && styles.switchBtnActive]}>
                        <Ionicons name="time" size={18} color={viewMode === 'day' ? 'white' : '#A0A0B0'} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.dateNavigator}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.dateBtn}>
                    <Text style={styles.dateBtnText}>
                        {getISODate(selectedDate) === getISODate(new Date()) ? 'Hoy, ' : ''}
                        {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {STATUS_FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.value}
                        style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
                        onPress={() => setStatusFilter(f.value)}
                    >
                        <Text style={[styles.filterChipText, statusFilter === f.value && styles.filterChipTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.headerSummary}>
                <Text style={styles.summaryText}>
                    {appointments.length} turnos • {appointments.filter(a => a.status === 'pending').length} pendientes • {appointments.filter(a => a.status === 'completed').length} completados
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity style={[styles.funnelBtn, { marginRight: 15 }]} onPress={() => (navigation as any).navigate('NotificacionesConfig')}>
                        <Ionicons name="notifications-outline" size={20} color="#A0A0B0" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.funnelBtn}>
                        <Ionicons name="funnel-outline" size={18} color="#E94560" />
                        <View style={styles.filterBadge} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            {renderHeader()}

            <View style={styles.content}>
                {loading && !refreshing ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#E94560" />
                    </View>
                ) : (
                    <>
                        {viewMode === 'list' && (
                            <FlatList
                                data={appointments}
                                renderItem={renderAppointmentItem}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContent}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E94560" />}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Ionicons name="calendar-outline" size={60} color="#2A2A4A" />
                                        <Text style={styles.emptyTitle}>Sin turnos para este día</Text>
                                    </View>
                                }
                            />
                        )}
                        {viewMode === 'week' && renderWeekView()}
                        {viewMode === 'day' && renderTimelineView()}
                    </>
                )}
            </View>

            <AppointmentDetailModal />
            <StaffAssignmentModal />
            <Toast ref={toastRef} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1A1A2E' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        backgroundColor: '#1A1A2E',
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A4A',
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    titleContainer: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold' },
    liveDot: { flexDirection: 'row', alignItems: 'center', marginLeft: 12, backgroundColor: 'rgba(46, 204, 113, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    dotInternal: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ECC71', marginRight: 6 },
    liveText: { color: '#2ECC71', fontSize: 10, fontWeight: 'bold' },
    viewSwitcher: { flexDirection: 'row', backgroundColor: '#16213E', borderRadius: 10, padding: 4 },
    switchBtn: { padding: 8, borderRadius: 8 },
    switchBtnActive: { backgroundColor: '#E94560' },
    dateNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15, paddingHorizontal: 15 },
    navBtn: { padding: 5 },
    dateBtn: { flex: 1, alignItems: 'center' },
    dateBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
    filterScroll: { paddingLeft: 20, marginBottom: 15, maxHeight: 40 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2A2A4A', marginRight: 10, height: 36, justifyContent: 'center' },
    filterChipActive: { backgroundColor: '#E94560', borderColor: '#E94560' },
    filterChipText: { color: '#A0A0B0', fontSize: 13, fontWeight: '500' },
    filterChipTextActive: { color: 'white' },
    headerSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    summaryText: { color: '#707080', fontSize: 11 },
    funnelBtn: { padding: 4 },
    filterBadge: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A9FFF', borderWidth: 1, borderColor: '#1A1A2E' },
    content: { flex: 1 },
    listContent: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 100, gap: 6 },
    appointmentCard: { flexDirection: 'row', backgroundColor: '#1E1E3A', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#2A2A4A' },
    statusBand: { width: 5 },
    cardContent: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
    timeBlock: { width: 62, marginRight: 8 },
    timeText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
    durationText: { color: '#707080', fontSize: 11 },
    clientBlock: { flex: 1, paddingRight: 6 },
    clientName: { color: 'white', fontSize: 14, fontWeight: '700' },
    clientContact: { color: '#A0A0B0', fontSize: 11 },
    serviceNameText: { color: '#A0A0B0', fontSize: 11, marginLeft: 4, flex: 1 },
    cancelBtnSmall: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#E94560', marginLeft: 6 },
    cancelBtnTextSmall: { color: '#E94560', fontSize: 10, fontWeight: 'bold' },
    strikethrough: { textDecorationLine: 'line-through', opacity: 0.5 },
    notesBox: { marginTop: 5, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#2A2A4A', borderRadius: 6, borderLeftWidth: 2, borderLeftColor: '#4A9FFF' },
    notesText: { color: '#A0A0B0', fontSize: 11, fontStyle: 'italic' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyTitle: { color: '#404060', fontSize: 18, marginTop: 15, fontWeight: 'bold' },
    weekContainer: { flex: 1, paddingBottom: 80 },
    weekDaysGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
    weekDayBtn: { width: (width - 60) / 7, height: 65, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#1E1E3A' },
    weekDayBtnActive: { backgroundColor: '#E94560' },
    weekDayLabel: { color: '#A0A0B0', fontSize: 12, marginBottom: 4 },
    weekDayLabelActive: { color: 'white', fontWeight: 'bold' },
    weekDayNum: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    weekDayNumActive: { color: 'white' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#E94560', marginTop: 4 },
    timelineScroll: { flex: 1, paddingHorizontal: 20, paddingBottom: 80 },
    timelineRow: { flexDirection: 'row', height: 80 },
    timelineTime: { width: 60, paddingVertical: 10, borderRightWidth: 1, borderRightColor: '#2A2A4A' },
    timelineTimeText: { color: '#606070', fontSize: 12, fontWeight: 'bold' },
    timelineContent: { flex: 1, paddingLeft: 15, paddingVertical: 10, justifyContent: 'center' },
    timelineApp: { flex: 1, borderRadius: 8, borderWidth: 1, padding: 10, justifyContent: 'center' },
    timelineAppName: { color: 'white', fontSize: 13, fontWeight: 'bold' },
    timelineAppService: { color: 'white', fontSize: 11, opacity: 0.8 },
    timelineEmpty: { flex: 1, justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#2A2A4A', borderRadius: 8, paddingLeft: 10 },
    timelineEmptyText: { color: '#303050', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: '#1E1E3A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: height * 0.9 },
    sheetHandle: { width: 40, height: 5, backgroundColor: '#2A2A4A', borderRadius: 5, alignSelf: 'center', marginBottom: 20 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    sheetSection: { marginBottom: 25 },
    sheetSectionTitle: { color: '#A0A0B0', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 15, textTransform: 'uppercase' },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    detailValue: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    detailSubValue: { color: '#A0A0B0', fontSize: 13, marginTop: 2 },
    clientInfoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213E', padding: 16, borderRadius: 16 },
    clientAvatarMini: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E94560', justifyContent: 'center', alignItems: 'center' },
    clientAvatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    copyBtn: { padding: 10 },
    notesContainer: { backgroundColor: '#16213E', padding: 16, borderRadius: 16 },
    notesTextContent: { color: '#A0A0B0', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
    actionsContainer: { paddingTop: 20, borderTopWidth: 1, borderTopColor: '#2A2A4A' },
    actionBtn: { height: 54, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    actionBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    staffInfoSmall: { flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
    staffNameSmall: { color: '#707080', fontSize: 11, marginLeft: 3, maxWidth: 80 },
    cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    cardRow2: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
    staffAssignCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213E', padding: 16, borderRadius: 16 },
    staffAvatarMini: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    changeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(74, 159, 255, 0.1)' },
    changeBtnText: { color: '#4A9FFF', fontSize: 13, fontWeight: 'bold' },
    dialogBox: { backgroundColor: '#1E1E3A', borderRadius: 24, padding: 24, width: '85%', alignSelf: 'center' },
    dialogTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
    dialogSubtitle: { color: '#A0A0B0', fontSize: 14, marginBottom: 20, textAlign: 'center' },
    staffOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A4A' },
    staffOptionCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    staffOptionInitial: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    staffOptionName: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    staffOptionSpecialty: { color: '#707080', fontSize: 12 },
    dialogCloseBtn: { marginTop: 20, paddingVertical: 12, alignItems: 'center' },
    dialogCloseText: { color: '#E94560', fontSize: 16, fontWeight: 'bold' },
});

export default TurnosScreen;
