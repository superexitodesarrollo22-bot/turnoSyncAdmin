import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    Modal,
    TextInput,
    Clipboard,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useToast } from '../../hooks/useToast';
import { SubscriptionRequest } from '../../types';

type Status = 'pending' | 'approved' | 'rejected';

const STATUS_COLORS: Record<Status, { bg: string; text: string }> = {
    pending: { bg: '#F5A623', text: '#1A1A2E' },
    approved: { bg: '#2ECC71', text: '#1A1A2E' },
    rejected: { bg: '#E94560', text: '#FFFFFF' },
};
const STATUS_LABELS: Record<Status, string> = {
    pending: 'PENDIENTE',
    approved: 'APROBADA',
    rejected: 'RECHAZADA',
};

function formatFullDate(iso: string) {
    const date = new Date(iso);
    return date.toLocaleDateString('es-EC', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const SEPARADOR = '-'.repeat(30);

export default function DetalleSolicitudScreen({ navigation, route }: any) {
    const { solicitud } = route.params as { solicitud: SubscriptionRequest };
    const [currentStatus, setCurrentStatus] = useState<Status>(solicitud.status as Status);
    const [loadingApprove, setLoadingApprove] = useState(false);
    const [loadingReject, setLoadingReject] = useState(false);
    const { showToast } = useToast();

    // Modal rechazo
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState('');

    // Modal pasos manuales
    const [showManualStepsModal, setShowManualStepsModal] = useState(false);

    const copyToClipboard = (text: string, label: string) => {
        Clipboard.setString(text);
        showToast({ type: 'success', message: `${label} copiado al portapapeles.` });
    };

    const aprobarSolicitud = async () => {
        Alert.alert(
            'Aprobar solicitud',
            `¿Aprobar la solicitud de ${solicitud.company_name}?\n\nDeberás crear su cuenta manualmente en Supabase Auth y notificarles por correo.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, aprobar',
                    style: 'default',
                    onPress: async () => {
                        setLoadingApprove(true);
                        try {
                            const { error } = await supabase
                                .from('subscription_requests')
                                .update({
                                    status: 'approved',
                                    reviewed_at: new Date().toISOString(),
                                })
                                .eq('id', solicitud.id);

                            if (error) throw error;

                            setCurrentStatus('approved');
                            setShowManualStepsModal(true);
                        } catch (error: any) {
                            showToast({ type: 'error', message: error.message ?? 'No se pudo aprobar la solicitud.' });
                        } finally {
                            setLoadingApprove(false);
                        }
                    },
                },
            ]
        );
    };

    const rechazarSolicitud = async () => {
        if (!motivoRechazo.trim()) {
            showToast({ type: 'warning', message: 'Por favor ingresa el motivo del rechazo.' });
            return;
        }
        setLoadingReject(true);
        try {
            const { error } = await supabase
                .from('subscription_requests')
                .update({
                    status: 'rejected',
                    notes: motivoRechazo.trim(),
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', solicitud.id);

            if (error) throw error;

            setCurrentStatus('rejected');
            setShowRejectModal(false);
            showToast({ type: 'success', message: 'La solicitud fue rechazada correctamente.' });
            navigation.goBack();
        } catch (error: any) {
            showToast({ type: 'error', message: error.message ?? 'No se pudo rechazar la solicitud.' });
        } finally {
            setLoadingReject(false);
        }
    };

    const statusColor = STATUS_COLORS[currentStatus];

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detalle de solicitud</Text>
                <View style={[styles.statusPill, { backgroundColor: statusColor.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusColor.text }]}>
                        {STATUS_LABELS[currentStatus]}
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* EMPRESA */}
                <SectionCard title="🏢  Datos de la empresa">
                    <InfoRow label="Nombre" value={solicitud.company_name} />
                    <InfoRow label="Tipo de negocio" value={solicitud.estimated_services} />
                    <InfoRow label="Dirección" value={solicitud.company_address} />
                    <InfoRow label="Teléfono" value={solicitud.company_phone} />
                    <InfoRow label="Descripción" value={solicitud.company_description} />
                </SectionCard>

                {/* ADMINISTRADOR */}
                <SectionCard title="👤  Datos del administrador">
                    <InfoRow label="Nombre" value={solicitud.full_name} />
                    <InfoRowCopy
                        label="Email"
                        value={solicitud.email}
                        onCopy={() => copyToClipboard(solicitud.email, 'Email')}
                    />
                    <InfoRowCopy
                        label="Teléfono"
                        value={solicitud.phone}
                        onCopy={() => copyToClipboard(solicitud.phone, 'Teléfono')}
                    />
                </SectionCard>

                {/* FECHA */}
                <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={16} color="#8888A0" />
                    <Text style={styles.dateText}>
                        Solicitado el {formatFullDate(solicitud.created_at)}
                    </Text>
                </View>

                {/* NOTAS (si existen) */}
                {solicitud.notes ? (
                    <SectionCard title="📝  Notas de revisión">
                        <Text style={styles.notesText}>{solicitud.notes}</Text>
                    </SectionCard>
                ) : null}

                {/* ACCIONES */}
                {currentStatus === 'pending' && (
                    <View style={styles.actionsSection}>
                        <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={aprobarSolicitud}
                            disabled={loadingApprove}
                            activeOpacity={0.8}
                        >
                            {loadingApprove ? (
                                <ActivityIndicator color="#1A1A2E" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#1A1A2E" />
                                    <Text style={styles.approveBtnText}>Aprobar solicitud</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => setShowRejectModal(true)}
                            disabled={loadingReject}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close-circle-outline" size={20} color="#E94560" />
                            <Text style={styles.rejectBtnText}>Rechazar solicitud</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* MODAL RECHAZO */}
            <Modal
                visible={showRejectModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRejectModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Rechazar solicitud</Text>
                        <Text style={styles.modalSubtitle}>
                            Ingresa el motivo del rechazo para {solicitud.company_name}:
                        </Text>
                        <TextInput
                            style={styles.motivoInput}
                            placeholder="Ej: Información incompleta, negocio duplicado..."
                            placeholderTextColor="#6060780"
                            multiline
                            numberOfLines={4}
                            value={motivoRechazo}
                            onChangeText={setMotivoRechazo}
                            textAlignVertical="top"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowRejectModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalRejectBtn}
                                onPress={rechazarSolicitud}
                                disabled={loadingReject}
                            >
                                {loadingReject ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.modalRejectText}>Rechazar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL PASOS MANUALES */}
            <Modal
                visible={showManualStepsModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowManualStepsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Solicitud aprobada ✅</Text>
                        <Text style={styles.modalSubtitle}>
                            Para activar la cuenta de <Text style={{ color: '#F5A623', fontWeight: '700' }}>{solicitud.company_name}</Text>, sigue estos pasos:
                        </Text>

                        <View style={styles.step}>
                            <Text style={styles.stepNumber}>1</Text>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Ve a Supabase → Authentication → Users → Add user</Text>
                                <TouchableOpacity
                                    style={styles.copyEmailBtn}
                                    onPress={() => copyToClipboard(solicitud.email, 'Email')}
                                >
                                    <Ionicons name="copy-outline" size={14} color="#4A9FFF" />
                                    <Text style={styles.copyEmailText}>{solicitud.email}</Text>
                                </TouchableOpacity>
                                <Text style={styles.stepNote}>Activa "Auto Confirm User"</Text>
                            </View>
                        </View>

                        <View style={styles.step}>
                            <Text style={styles.stepNumber}>2</Text>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Ejecuta el SQL de alta en Supabase SQL Editor</Text>
                                <Text style={styles.stepNote}>Accede desde el panel de administración de Supabase</Text>
                            </View>
                        </View>

                        <View style={styles.step}>
                            <Text style={styles.stepNumber}>3</Text>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>Envía las credenciales al administrador por correo</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.doneBtn}
                            onPress={() => {
                                setShowManualStepsModal(false);
                                navigation.goBack();
                            }}
                        >
                            <Text style={styles.doneBtnText}>Entendido, lo haré ahora</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// Sub-components
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>{title}</Text>
            <View style={styles.sectionCardContent}>{children}</View>
        </View>
    );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

function InfoRowCopy({ label, value, onCopy }: { label: string; value?: string | null; onCopy: () => void }) {
    if (!value) return null;
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <View style={styles.infoValueRow}>
                <Text style={styles.infoValue}>{value}</Text>
                <TouchableOpacity onPress={onCopy} style={styles.copyIconBtn}>
                    <Ionicons name="copy-outline" size={15} color="#4A9FFF" />
                </TouchableOpacity>
            </View>
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
    statusPill: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 16 },
    // Section card
    sectionCard: {
        backgroundColor: '#1E1E3A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2A2A48',
    },
    sectionCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#A0A0C0',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    sectionCardContent: { gap: 8 },
    // Info rows
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A48',
    },
    infoLabel: {
        fontSize: 12,
        color: '#8888A0',
        flex: 1,
    },
    infoValue: {
        fontSize: 13,
        color: '#FFFFFF',
        flex: 2,
        textAlign: 'right',
    },
    infoValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 2,
        justifyContent: 'flex-end',
        gap: 6,
    },
    copyIconBtn: { padding: 2 },
    // Date
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 4,
    },
    dateText: {
        fontSize: 13,
        color: '#8888A0',
        flex: 1,
    },
    // Notes
    notesText: {
        fontSize: 14,
        color: '#C0C0D0',
        lineHeight: 20,
    },
    // Actions
    actionsSection: {
        gap: 12,
        marginTop: 8,
    },
    approveBtn: {
        backgroundColor: '#2ECC71',
        borderRadius: 14,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    approveBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1A1A2E',
    },
    rejectBtn: {
        backgroundColor: 'transparent',
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: '#E94560',
    },
    rejectBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#E94560',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    modalBox: {
        backgroundColor: '#1E1E3A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        gap: 14,
        borderTopWidth: 1,
        borderColor: '#2A2A48',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#A0A0C0',
        lineHeight: 20,
    },
    motivoInput: {
        backgroundColor: '#12122A',
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#2A2A48',
        minHeight: 100,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2A48',
    },
    modalCancelText: {
        fontSize: 14,
        color: '#A0A0C0',
        fontWeight: '600',
    },
    modalRejectBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#E94560',
    },
    modalRejectText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    // Pasos manuales
    step: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    stepNumber: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#E94560',
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 26,
        overflow: 'hidden',
    },
    stepContent: { flex: 1 },
    stepTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    stepNote: {
        fontSize: 12,
        color: '#8888A0',
        marginTop: 2,
    },
    copyEmailBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
        backgroundColor: 'rgba(74,159,255,0.1)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    copyEmailText: {
        fontSize: 12,
        color: '#4A9FFF',
        fontWeight: '600',
    },
    doneBtn: {
        backgroundColor: '#E94560',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 4,
    },
    doneBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
