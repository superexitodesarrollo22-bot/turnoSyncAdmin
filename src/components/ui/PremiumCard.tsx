import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPressable from './AnimatedPressable';

export interface PremiumCardProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    gradient?: boolean;
    gradientColors?: readonly [string, string, ...string[]];
    onPress?: () => void;
    elevated?: boolean;
}

export function PremiumCard({
    children,
    style,
    gradient = false,
    gradientColors = ['#1A1A2E', '#232340'] as unknown as readonly [string, string, ...string[]],
    onPress,
    elevated = false,
}: PremiumCardProps) {
    const cardStyle = [
        styles.card,
        elevated && styles.elevated,
        style,
    ];

    const content = gradient ? (
        <LinearGradient colors={gradientColors as readonly [string, string, ...string[]]} style={cardStyle}>
            {children}
        </LinearGradient>
    ) : (
        <View style={[cardStyle, { backgroundColor: '#1A1A2E' }]}>
            {children}
        </View>
    );

    if (onPress) {
        return (
            <AnimatedPressable onPress={onPress}>
                {content}
            </AnimatedPressable>
        );
    }

    return content;
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(108,99,255,0.15)',
    },
    elevated: {
        elevation: 0,
    },
});
