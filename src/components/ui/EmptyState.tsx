import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.container,
                { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] },
            ]}
        >
            <View style={styles.iconCircle}>
                <Ionicons name={icon} size={36} color="#6C63FF" />
            </View>

            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

            {actionLabel && onAction && (
                <TouchableOpacity style={styles.button} onPress={onAction} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(108,99,255,0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#A0A0C0',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    button: {
        marginTop: 24,
        backgroundColor: '#6C63FF',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
});
