import React from 'react';
import { Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from './AnimatedPressable';

export interface GradientButtonProps {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'accent' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    style?: any;
}

export function GradientButton({
    label,
    onPress,
    loading = false,
    disabled = false,
    variant = 'primary',
    size = 'md',
    icon,
    style,
}: GradientButtonProps) {
    const getSizeStyles = () => {
        switch (size) {
            case 'sm': return { height: 36, borderRadius: 10, fontSize: 13 };
            case 'lg': return { height: 60, borderRadius: 16, fontSize: 17 };
            default: return { height: 52, borderRadius: 14, fontSize: 15 };
        }
    };

    const sizeStyles = getSizeStyles();

    const renderContent = (textColor: string) => (
        <>
            {loading ? (
                <ActivityIndicator color={textColor} />
            ) : (
                <View style={styles.content}>
                    {icon && <Ionicons name={icon as any} size={sizeStyles.fontSize + 2} color={textColor} style={styles.icon} />}
                    <Text style={[styles.text, { fontSize: sizeStyles.fontSize, color: textColor }]}>
                        {label}
                    </Text>
                </View>
            )}
        </>
    );

    const buttonStyle = [
        styles.container,
        { height: sizeStyles.height, borderRadius: sizeStyles.borderRadius },
        disabled && styles.disabled,
        style,
    ];

    if (variant === 'outline') {
        return (
            <AnimatedPressable onPress={onPress} disabled={disabled || loading} scaleValue={0.97} style={style}>
                <View style={[
                    buttonStyle,
                    { borderWidth: 1, borderColor: '#6C63FF', backgroundColor: 'transparent' }
                ]}>
                    {renderContent('#6C63FF')}
                </View>
            </AnimatedPressable>
        );
    }

    const gradientColors = variant === 'accent' ? ['#00D9A6', '#00B88A'] : ['#6C63FF', '#4A42DB'];

    return (
        <AnimatedPressable onPress={onPress} disabled={disabled || loading} scaleValue={0.97} style={style}>
            <LinearGradient colors={gradientColors} style={buttonStyle}>
                {renderContent('#FFFFFF')}
            </LinearGradient>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: 'bold',
    },
    icon: {
        marginRight: 8,
    },
    disabled: {
        opacity: 0.6,
    },
});
