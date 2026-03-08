import React, { useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';

interface AnimatedPressableProps {
    onPress?: () => void;
    onLongPress?: () => void;
    style?: any;
    children: React.ReactNode;
    scaleValue?: number;
    disabled?: boolean;
    activeOpacity?: number;
}

export default function AnimatedPressable({
    onPress,
    onLongPress,
    style,
    children,
    scaleValue = 0.96,
    disabled = false,
    activeOpacity = 0.9,
}: AnimatedPressableProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: scaleValue,
            useNativeDriver: true,
            tension: 300,
            friction: 20,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 300,
            friction: 20,
        }).start();
    };

    return (
        <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                activeOpacity={activeOpacity}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
                onLongPress={onLongPress}
                disabled={disabled}
                style={{ width: '100%', height: '100%' }}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
}
