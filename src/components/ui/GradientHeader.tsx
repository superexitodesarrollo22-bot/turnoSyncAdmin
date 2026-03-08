import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface GradientHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    rightAction?: React.ReactNode;
}

export function GradientHeader({
    title,
    subtitle,
    onBack,
    rightAction,
}: GradientHeaderProps) {
    const insets = useSafeAreaInsets();

    return (
        <LinearGradient
            colors={['#1A1A2E', '#0F0F1A']}
            style={[styles.container, { paddingTop: insets.top + 12 }]}
        >
            <View style={styles.headerRow}>
                {onBack ? (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backBtnPlaceholder} />
                )}

                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
                </View>

                {rightAction ? (
                    <View style={styles.rightAction}>
                        {rightAction}
                    </View>
                ) : (
                    <View style={styles.backBtnPlaceholder} />
                )}
            </View>
            <View style={styles.separator} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtnPlaceholder: {
        width: 36,
        height: 36,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 13,
        color: '#A0A0C0',
        marginTop: 2,
    },
    rightAction: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
});
