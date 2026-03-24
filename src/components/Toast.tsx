import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info';

export interface ToastRef {
    show: (message: string, type: ToastType, duration?: number) => void;
}

const Toast = forwardRef<ToastRef>((_, ref) => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState<ToastType>('info');
    const [animation] = useState(new Animated.Value(0));

    const show = useCallback((msg: string, t: ToastType, duration: number = 3000) => {
        setMessage(msg);
        setType(t);
        setVisible(true);

        Animated.sequence([
            Animated.timing(animation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.delay(duration),
            Animated.timing(animation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => setVisible(false));
    }, [animation]);

    useImperativeHandle(ref, () => ({
        show,
    }));

    if (!visible) return null;

    const getBackgroundColor = () => {
        switch (type) {
            case 'success': return '#F0FDF4';
            case 'error': return '#FFF1F2';
            case 'info': return '#EFF6FF';
            default: return '#F5F5F0';
        }
    };

    const getAccentColor = () => {
        switch (type) {
            case 'success': return '#2ECC71';
            case 'error': return '#E94560';
            case 'info': return '#4A9FFF';
            default: return '#5A5A5A';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'close-circle';
            case 'info': return 'information-circle';
            default: return 'alert-circle';
        }
    };

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [100, 0],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: getBackgroundColor(),
                    borderLeftColor: getAccentColor(),
                    transform: [{ translateY }]
                },
            ]}
        >
            <Ionicons name={getIcon() as any} size={24} color={getAccentColor()} style={styles.icon} />
            <Text style={styles.text}>{message}</Text>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 80,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
        borderLeftWidth: 4,
    },
    icon: {
        marginRight: 12,
    },
    text: {
        color: '#1A1A1A',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
});

export default Toast;
