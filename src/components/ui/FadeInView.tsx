import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface FadeInViewProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    style?: any;
}

export default function FadeInView({ children, delay = 0, duration = 300, style }: FadeInViewProps) {
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
                toValue: 0,
                duration,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [delay, duration]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: opacityAnim,
                    transform: [{ translateY: translateYAnim }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
}
