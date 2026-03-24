import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface StatusBadgeProps {
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    size?: 'sm' | 'md';
}

const STATUS_CONFIG = {
    pending: { label: 'Pendiente', color: '#F5A623', bg: 'rgba(245, 166, 35, 0.1)', icon: 'time-outline' as const },
    confirmed: { label: 'Confirmado', color: '#2ECC71', bg: 'rgba(46, 204, 113, 0.1)', icon: 'checkmark-circle-outline' as const },
    cancelled: { label: 'Cancelado', color: '#E94560', bg: 'rgba(233, 69, 96, 0.1)', icon: 'close-circle-outline' as const },
    completed: { label: 'Completado', color: '#4A9FFF', bg: 'rgba(74, 159, 255, 0.1)', icon: 'ribbon-outline' as const },
    no_show: { label: 'No asistió', color: '#5A5A5A', bg: 'rgba(90, 90, 90, 0.1)', icon: 'person-remove-outline' as const },
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
