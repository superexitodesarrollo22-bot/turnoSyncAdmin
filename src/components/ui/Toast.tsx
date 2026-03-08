import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ToastConfig } from '../../contexts/ToastContext';

const { width } = Dimensions.get('window');

const TOAST_COLORS = {
    success: { bg: 'rgba(26, 58, 46, 0.95)', border: '#00D9A6', icon: '#00D9A6' },
    error: { bg: 'rgba(58, 26, 26, 0.95)', border: '#FF6B6B', icon: '#FF6B6B' },
    warning: { bg: 'rgba(58, 45, 26, 0.95)', border: '#FFB547', icon: '#FFB547' },
    info: { bg: 'rgba(26, 42, 58, 0.95)', border: '#63B3ED', icon: '#63B3ED' },
};

const ICONS = {
    success: 'checkmark-circle',
    error: 'alert-circle',
    warning: 'warning',
    info: 'information-circle',
} as const;

interface ToastUIProps {
    config: ToastConfig;
    visible: boolean;
    onHide: () => void;
}

export default function ToastUI({ config, visible, onHide }: ToastUIProps) {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -100,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, translateY, opacity]);

    const colors = TOAST_COLORS[config.type] || TOAST_COLORS.info;
    const iconName = ICONS[config.type] || ICONS.info;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: insets.top + 10,
                    backgroundColor: colors.bg,
                    borderLeftColor: colors.border,
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            <Ionicons name={iconName} size={24} color={colors.icon} style={styles.icon} />
            <Text style={styles.message}>{config.message}</Text>
            <TouchableOpacity onPress={onHide} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        alignSelf: 'center',
        width: width - 32,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    icon: {
        marginRight: 10,
    },
    message: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    closeBtn: {
        padding: 4,
    },
});
