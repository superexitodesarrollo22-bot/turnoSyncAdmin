import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface StatusBadgeProps {
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    size?: 'sm' | 'md';
}

const STATUS_CONFIG = {
    pending: { label: 'Pendiente', color: '#FFB547', bg: 'rgba(255,181,71,0.12)', icon: 'time-outline' as const },
    confirmed: { label: 'Confirmado', color: '#00D9A6', bg: 'rgba(0,217,166,0.12)', icon: 'checkmark-circle-outline' as const },
    cancelled: { label: 'Cancelado', color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', icon: 'close-circle-outline' as const },
    completed: { label: 'Completado', color: '#63B3ED', bg: 'rgba(99,179,237,0.12)', icon: 'ribbon-outline' as const },
    no_show: { label: 'No asistió', color: '#A0A0C0', bg: 'rgba(160,160,192,0.12)', icon: 'person-remove-outline' as const },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

    const sizeStyles = size === 'sm'
        ? { paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, borderRadius: 6, iconSize: 12 }
        : { paddingHorizontal: 12, paddingVertical: 5, fontSize: 12, borderRadius: 8, iconSize: 14 };

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: config.bg,
                paddingHorizontal: sizeStyles.paddingHorizontal,
                paddingVertical: sizeStyles.paddingVertical,
                borderRadius: sizeStyles.borderRadius,
            }
        ]}>
            <Ionicons name={config.icon} size={sizeStyles.iconSize} color={config.color} />
            <Text style={[
                styles.text,
                {
                    color: config.color,
                    fontSize: sizeStyles.fontSize,
                }
            ]}>
                {config.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    text: {
        fontWeight: 'bold',
        marginLeft: 4,
    },
});
