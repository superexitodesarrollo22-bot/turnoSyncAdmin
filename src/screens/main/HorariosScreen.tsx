import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Modal,
    ActivityIndicator,
    Platform,
    Dimensions,
    FlatList,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../hooks/useAuth';
import Toast, { ToastRef } from '../../components/Toast';
import MiniCalendar from '../../components/MiniCalendar';
import { GradientHeader } from '../../components/ui/GradientHeader';
import { PremiumCard } from '../../components/ui/PremiumCard';
import { GradientButton } from '../../components/ui/GradientButton';

const { width, height } = Dimensions.get('window');

const WEEKDAYS = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

const INTERVAL_OPTIONS = [15, 20, 30, 45, 60, 90];

const HorariosScreen = () => {
    const { business, refreshBusiness, userProfile } = useAuth();
    const toastRef = useRef<ToastRef>(null);

    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [blackoutDates, setBlackoutDates] = useState<any[]>([]);
    const [interval, setIntervalVal] = useState(business?.slot_interval_minutes || 30);

    // Modals
    const [editDayModal, setEditDayModal] = useState<any>(null); // { weekday, start, end }
    const [blackoutModal, setBlackoutModal] = useState(false);

    // Temporal State for Time Pickers
    const [tempStart, setTempStart] = useState('09:00');
    const [tempEnd, setTempEnd] = useState('18:00');

    // Blackout Modal State
    const [isRange, setIsRange] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    // Modal confirmar cierre de día
    const [closeDayModal, setCloseDayModal] = useState(false);
    const [closeDayWeekday, setCloseDayWeekday] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        if (!business) return;
        setLoading(true);
        try {
            const { data: schData } = await supabase
                .from('schedules')
                .select('*')
                .eq('business_id', business.id)
                .order('weekday');

            const { data: blData } = await supabase
                .from('blackout_dates')
                .select('*')
                .eq('business_id', business.id)
                .gte('date', new Date().toISOString().split('T')[0])
                .order('date');

            setSchedules(schData || []);
            setBlackoutDates(blData || []);
            setIntervalVal(business.slot_interval_minutes || 30);
        } catch (error) {
            console.error('Error fetching data:', error);
            toastRef.current?.show('Error al cargar datos', 'error');
        } finally {
            setLoading(false);
        }
    }, [business]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Sección 1: Horarios ---
    const handleToggleDay = async (weekday: number, active: boolean) => {
        if (!business || !userProfile) return;

        if (!active) {
            // Mostrar modal personalizado en lugar de Alert nativo
            setCloseDayWeekday(weekday);
            setCloseDayModal(true);
        } else {
            // Activar con horario default
            const { data, error } = await supabase
                .from('schedules')
                .insert({
                    business_id: business.id,
                    weekday,
                    start_time: '09:00',
                    end_time: '18:00'
                })
                .select()
                .single();

            if (!error) {
                setSchedules(prev => [...prev, data].sort((a, b) => a.weekday - b.weekday));
                toastRef.current?.show(`${WEEKDAYS[weekday]} activado`, 'success');
                logAction('day_opened', { weekday });
            }
        }
    };

    const confirmCloseDay = async () => {
        if (closeDayWeekday === null || !business || !userProfile) return;
        const weekday = closeDayWeekday;
        setCloseDayModal(false);
        setCloseDayWeekday(null);

        const { error } = await supabase
            .from('schedules')
            .delete()
            .eq('business_id', business.id)
            .eq('weekday', weekday);

        if (!error) {
            setSchedules(prev => prev.filter(s => s.weekday !== weekday));
            toastRef.current?.show(`${WEEKDAYS[weekday]} cerrado`, 'info');
            logAction('day_closed', { weekday });
        }
    };

    const handleEditSchedule = (day: any) => {
        setTempStart(day.start_time.slice(0, 5));
        setTempEnd(day.end_time.slice(0, 5));
        setEditDayModal(day);
    };

    const saveDaySchedule = async () => {
        if (!business || !editDayModal) return;

        if (tempEnd <= tempStart) {
            toastRef.current?.show('La hora de cierre debe ser posterior a la de inicio', 'error');
            return;
        }

        const { error } = await supabase
            .from('schedules')
            .update({
                start_time: tempStart,
                end_time: tempEnd
            })
            .eq('id', editDayModal.id);

        if (!error) {
            setSchedules(prev => prev.map(s => s.id === editDayModal.id ? { ...s, start_time: tempStart, end_time: tempEnd } : s));
            setEditDayModal(null);
            toastRef.current?.show('Horario actualizado', 'success');
            logAction('schedule_updated', { weekday: editDayModal.weekday, start: tempStart, end: tempEnd });
        }
    };

    // --- Sección 2: Intervalo ---
    const saveInterval = async (val: number) => {
        if (!business) return;
        setIntervalVal(val);
        const { error } = await supabase
            .from('businesses')
            .update({ slot_interval_minutes: val })
            .eq('id', business.id);

        if (!error) {
            toastRef.current?.show('Frecuencia de turnos actualizada', 'success');
            refreshBusiness();
            logAction('interval_updated', { interval: val });
        }
    };

    // --- Sección 3: Blackout ---
    const handleSelectBlackoutDate = (date: string) => {
        if (!isRange) {
            setStartDate(date);
            setEndDate('');
        } else {
            if (!startDate || (startDate && endDate)) {
                setStartDate(date);
                setEndDate('');
            } else {
                if (date < startDate) {
                    setEndDate(startDate);
                    setStartDate(date);
                } else {
                    setEndDate(date);
                }
            }
        }
    };

    const saveBlackout = async () => {
        if (!startDate || !business) return;

        const datesToBlock = [];
        if (!isRange || !endDate) {
            datesToBlock.push(startDate);
        } else {
            let current = new Date(startDate);
            const end = new Date(endDate);
            while (current <= end) {
                datesToBlock.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        }

        setLoading(true);
        try {
            const inserts = datesToBlock.map(d => ({
                business_id: business.id,
                date: d,
                reason: reason.trim() || 'No disponible'
            }));

            const { error } = await supabase.from('blackout_dates').insert(inserts);
            if (error) throw error;

            toastRef.current?.show('Días bloqueados correctamente', 'success');
            setBlackoutModal(false);
            setStartDate('');
            setEndDate('');
            setReason('');
            fetchData();
            logAction('dates_blocked', { count: datesToBlock.length });
        } catch (error) {
            toastRef.current?.show('Error al bloquear fechas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const deleteBlackout = (id: string) => {
        Alert.alert('¿Eliminar bloqueo?', 'Este día volverá a estar disponible según el horario semanal.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await supabase.from('blackout_dates').delete().eq('id', id);
                    if (!error) {
                        setBlackoutDates(prev => prev.filter(b => b.id !== id));
                        toastRef.current?.show('Bloqueo eliminado', 'info');
                    }
                }
            }
        ]);
    };

    const logAction = async (action: string, metadata: any) => {
        if (!business || !userProfile) return;
        await supabase.from('audit_logs').insert({
            business_id: business.id,
            user_id: userProfile.id,
            action,
            metadata
        });
    };

    const renderScheduleItem = (dayIndex: number) => {
        const daySchedule = schedules.find(s => s.weekday === dayIndex);
        const isActive = !!daySchedule;

        return (
            <View key={dayIndex} style={styles.scheduleRow}>
                <View style={styles.dayInfo}>
                    <Switch
                        value={isActive}
                        onValueChange={(val) => handleToggleDay(dayIndex, val)}
                        trackColor={{ false: '#3A3A5A', true: '#E94560' }}
                    />
                    <Text style={[styles.dayName, !isActive && styles.disabledText]}>{WEEKDAYS[dayIndex]}</Text>
                </View>
                <View style={styles.timeInfo}>
                    {isActive ? (
                        <>
                            <Text style={styles.timeRangeText}>
                                {formatTime(daySchedule.start_time)} - {formatTime(daySchedule.end_time)}
                            </Text>
                            <TouchableOpacity onPress={() => handleEditSchedule(daySchedule)} style={styles.editIconBtn}>
                                <Ionicons name="pencil" size={16} color="#4A9FFF" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <Text style={styles.closedText}>Cerrado</Text>
                    )}
                </View>
            </View>
        );
    };

    const formatTime = (time: string) => {
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    };

    const renderSlotPreview = () => {
        const firstActive = schedules[0];
        if (!firstActive) return null;

        // Simular primeros 4 slots
        const slots = [];
        const [h, m] = firstActive.start_time.split(':').map(Number);
        let current = new Date();
        current.setHours(h, m, 0, 0);

        for (let i = 0; i < 4; i++) {
            slots.push(current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            current.setMinutes(current.getMinutes() + interval);
        }

        return (
            <View style={styles.previewContainer}>
                <Text style={styles.previewText}>Próximos slots: {slots.join(' · ')} · ...</Text>
            </View>
        );
    };

    if (loading && schedules.length === 0) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#E94560" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <GradientHeader title="Horarios y disponibilidad" />

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* SECCIÓN 1: HORARIOS SEMANALES */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Días y horarios de atención</Text>
                    <Text style={styles.sectionSubtitle}>Configura qué días y en qué horario atiendes cada semana.</Text>

                    <PremiumCard style={styles.card}>
                        {WEEKDAYS.map((_, i) => renderScheduleItem(i))}
                    </PremiumCard>
                    {renderSlotPreview()}
                </View>

                {/* SECCIÓN 2: INTERVALO */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Frecuencia de turnos</Text>
                    <Text style={styles.sectionSubtitle}>¿Cada cuánto tiempo se genera un nuevo slot?</Text>

                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={20} color="#4A9FFF" />
                        <Text style={styles.infoCardText}>
                            Ej: Si atiendes de 9:00 a 12:00 con 30 min, tendrás turnos a las 9:00, 9:30, 10:00...
                        </Text>
                    </View>

                    <View style={styles.intervalGrid}>
                        {INTERVAL_OPTIONS.map(val => (
                            <TouchableOpacity
                                key={val}
                                style={[styles.intervalBtn, interval === val && styles.intervalBtnActive]}
                                onPress={() => saveInterval(val)}
                            >
                                <Text style={[styles.intervalBtnText, interval === val && styles.intervalBtnTextActive]}>
                                    {val} min
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.intervalHint}>
                        {interval === 15 ? 'Turnos muy frecuentes, ideal para servicios cortos' :
                            interval === 30 ? 'Opción más común y equilibrada' :
                                interval >= 60 ? 'Un turno por hora, ideal para consultas largas' : ''}
                    </Text>
                </View>

                {/* SECCIÓN 3: BLACKOUT */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Días no disponibles</Text>
                            <Text style={styles.sectionSubtitle}>Agrega feriados o vacaciones.</Text>
                        </View>
                        <TouchableOpacity style={styles.addBlackoutBtn} onPress={() => setBlackoutModal(true)}>
                            <Ionicons name="add" size={20} color="white" />
                            <Text style={styles.addBlackoutText}>Bloquear</Text>
                        </TouchableOpacity>
                    </View>

                    {blackoutDates.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={40} color="#2A2A4A" />
                            <Text style={styles.emptyText}>No tienes días bloqueados</Text>
                        </View>
                    ) : (
                        blackoutDates.map(b => (
                            <View key={b.id} style={styles.blackoutItem}>
                                <View style={styles.blackoutInfo}>
                                    <Text style={styles.blackoutDate}>
                                        {new Date(b.date + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </Text>
                                    <Text style={styles.blackoutReason}>{b.reason}</Text>
                                </View>
                                <TouchableOpacity onPress={() => deleteBlackout(b.id)}>
                                    <Ionicons name="trash-outline" size={20} color="#E94560" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Modal Confirmar Cierre de Día */}
            <Modal visible={closeDayModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmModalContent}>
                        <View style={styles.confirmModalIcon}>
                            <Ionicons name="warning-outline" size={36} color="#F5A623" />
                        </View>
                        <Text style={styles.confirmModalTitle}>
                            ¿Cerrar {closeDayWeekday !== null ? WEEKDAYS[closeDayWeekday] : ''}?
                        </Text>
                        <Text style={styles.confirmModalBody}>
                            Los clientes no podrán agendar para este día. Los turnos ya existentes no se cancelarán.
                        </Text>
                        <View style={styles.confirmModalBtns}>
                            <TouchableOpacity
                                style={styles.confirmCancelBtn}
                                onPress={() => {
                                    setCloseDayModal(false);
                                    setCloseDayWeekday(null);
                                }}
                            >
                                <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmDestructiveBtn}
                                onPress={confirmCloseDay}
                            >
                                <Text style={styles.confirmDestructiveText}>Cerrar día</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Editar Horario */}
            <Modal visible={!!editDayModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Editar {WEEKDAYS[editDayModal?.weekday]}</Text>

                        <View style={styles.timePickersRow}>
                            <View style={styles.timeCol}>
                                <Text style={styles.timeLabel}>Apertura</Text>
                                <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 18 }, (_, i) => i + 6).map(h => (
                                        ['00', '15', '30', '45'].map(m => {
                                            const t = `${String(h).padStart(2, '0')}:${m}`;
                                            return (
                                                <TouchableOpacity
                                                    key={t}
                                                    onPress={() => setTempStart(t)}
                                                    style={[styles.timeOption, tempStart === t && styles.timeOptionActive]}
                                                >
                                                    <Text style={[styles.timeOptionText, tempStart === t && styles.timeActiveText]}>{t}</Text>
                                                </TouchableOpacity>
                                            );
                                        })
                                    ))}
                                </ScrollView>
                            </View>
                            <View style={styles.timeCol}>
                                <Text style={styles.timeLabel}>Cierre</Text>
                                <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
                                    {Array.from({ length: 18 }, (_, i) => i + 6).map(h => (
                                        ['00', '15', '30', '45'].map(m => {
                                            const t = `${String(h).padStart(2, '0')}:${m}`;
                                            return (
                                                <TouchableOpacity
                                                    key={t}
                                                    onPress={() => setTempEnd(t)}
                                                    style={[styles.timeOption, tempEnd === t && styles.timeOptionActive]}
                                                >
                                                    <Text style={[styles.timeOptionText, tempEnd === t && styles.timeActiveText]}>{t}</Text>
                                                </TouchableOpacity>
                                            );
                                        })
                                    ))}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.modalBtns}>
                            <TouchableOpacity onPress={() => setEditDayModal(null)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <View style={{ flex: 2 }}>
                                <GradientButton
                                    label="Guardar"
                                    onPress={saveDaySchedule}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Blackout */}
            <Modal visible={blackoutModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: height * 0.85 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Bloquear fechas</Text>
                            <TouchableOpacity onPress={() => setBlackoutModal(false)}>
                                <Ionicons name="close" size={28} color="#A0A0B0" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.toggleRow}>
                                <Text style={styles.label}>Rango de fechas</Text>
                                <Switch value={isRange} onValueChange={setIsRange} trackColor={{ false: '#3A3A5A', true: '#E94560' }} />
                            </View>

                            <MiniCalendar
                                selectedDates={startDate ? (endDate ? [startDate, endDate] : [startDate]) : []}
                                blockedDates={blackoutDates.map(b => b.date)}
                                onSelectDate={handleSelectBlackoutDate}
                                isRange={isRange}
                                startDate={startDate}
                                endDate={endDate}
                            />

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Motivo (opcional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ej: Feriado, Vacaciones..."
                                    placeholderTextColor="#606070"
                                    value={reason}
                                    onChangeText={setReason}
                                    maxLength={100}
                                />
                            </View>

                            <GradientButton
                                label="Bloquear días seleccionados"
                                onPress={saveBlackout}
                                disabled={!startDate}
                                style={{ marginTop: 20 }}
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Toast ref={toastRef} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1A1A2E' },
    center: { justifyContent: 'center', alignItems: 'center' },
    headerHeader: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20 },
    headerHeaderTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    scroll: { padding: 20, paddingBottom: 100 },
    section: { marginBottom: 32 },
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    sectionSubtitle: { color: '#A0A0B0', fontSize: 13, marginBottom: 16 },
    card: { backgroundColor: '#1E1E3A', borderRadius: 16, padding: 16 },
    scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A4A' },
    dayInfo: { flexDirection: 'row', alignItems: 'center' },
    dayName: { color: 'white', fontSize: 15, fontWeight: '600', marginLeft: 12 },
    disabledText: { color: '#606070' },
    timeInfo: { flexDirection: 'row', alignItems: 'center' },
    timeRangeText: { color: '#A0A0B0', fontSize: 14 },
    closedText: { color: '#606070', fontSize: 14, fontStyle: 'italic' },
    editIconBtn: { padding: 8, marginLeft: 8 },
    previewContainer: { marginTop: 12, paddingHorizontal: 4 },
    previewText: { color: '#E94560', fontSize: 13, fontWeight: '500' },
    infoCard: { flexDirection: 'row', backgroundColor: 'rgba(74, 159, 255, 0.1)', padding: 12, borderRadius: 12, marginBottom: 16 },
    infoCardText: { color: '#A0A0B0', fontSize: 12, flex: 1, marginLeft: 8, lineHeight: 18 },
    intervalGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
    intervalBtn: { width: (width - 50) / 3, height: 44, backgroundColor: '#1E1E3A', borderRadius: 12, justifyContent: 'center', alignItems: 'center', margin: 5, borderWidth: 1, borderColor: '#2A2A4A' },
    intervalBtnActive: { backgroundColor: '#E94560', borderColor: '#E94560' },
    intervalBtnText: { color: '#A0A0B0', fontSize: 13, fontWeight: 'bold' },
    intervalBtnTextActive: { color: 'white' },
    intervalHint: { color: '#606070', fontSize: 12, marginTop: 12, textAlign: 'center', fontStyle: 'italic' },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    addBlackoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E94560', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    addBlackoutText: { color: 'white', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
    emptyContainer: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#1E1E3A', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#2A2A4A' },
    emptyText: { color: '#606070', marginTop: 10 },
    blackoutItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E1E3A', padding: 16, borderRadius: 16, marginBottom: 10 },
    blackoutInfo: { flex: 1 },
    blackoutDate: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    blackoutReason: { color: '#A0A0B0', fontSize: 13, marginTop: 2 },
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1E1E3A', borderRadius: 24, padding: 24 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    timePickersRow: { flexDirection: 'row', height: 250, marginBottom: 24 },
    timeCol: { flex: 1, paddingHorizontal: 10 },
    timeLabel: { color: '#A0A0B0', fontSize: 12, textAlign: 'center', marginBottom: 10, fontWeight: 'bold' },
    timeList: { flex: 1, backgroundColor: '#16213E', borderRadius: 12 },
    timeOption: { paddingVertical: 12, alignItems: 'center' },
    timeOptionActive: { backgroundColor: '#E94560' },
    timeOptionText: { color: '#A0A0B0', fontSize: 16 },
    timeActiveText: { color: 'white', fontWeight: 'bold' },
    modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
    cancelBtn: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center' },
    cancelText: { color: '#A0A0B0', fontSize: 16 },
    saveModalBtn: { flex: 2, height: 50, backgroundColor: '#E94560', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    saveModalText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    label: { color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
    inputGroup: { marginTop: 20 },
    input: { backgroundColor: '#16213E', borderRadius: 12, paddingHorizontal: 16, height: 50, color: 'white', borderWidth: 1, borderColor: '#2A2A4A' },
    // Confirm modal
    confirmModalContent: {
        backgroundColor: '#1E1E3A',
        borderRadius: 20,
        padding: 28,
        marginHorizontal: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2A4A',
    },
    confirmModalIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(245, 166, 35, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    confirmModalTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    confirmModalBody: {
        color: '#A0A0B0',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
    },
    confirmModalBtns: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    confirmCancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3A3A5A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmCancelText: {
        color: '#A0A0B0',
        fontSize: 15,
        fontWeight: '600',
    },
    confirmDestructiveBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#E94560',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmDestructiveText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});

export default HorariosScreen;
