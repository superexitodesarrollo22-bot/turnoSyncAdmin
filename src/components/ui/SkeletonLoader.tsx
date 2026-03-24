import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const BASE_COLOR = '#E0E0DC';
const SHIMMER_COLOR = '#F0F0EC';
const CARD_BG = '#FFFFFF';

interface SkeletonBoxProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: any;
    flex?: number;
}

const SkeletonBox = ({ width, height, borderRadius = 4, style, flex }: SkeletonBoxProps) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: false,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: false,
                }),
            ])
        ).start();
    }, [shimmerAnim]);

    const backgroundColor = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [BASE_COLOR, SHIMMER_COLOR],
    });

    return (
        <Animated.View
            style={[
                { width, height, borderRadius, backgroundColor, flex },
                style,
            ]}
        />
    );
};

export const AppointmentCardSkeleton = () => (
    <View style={styles.card}>
        <View style={styles.row}>
            <SkeletonBox width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
            <View style={styles.col}>
                <SkeletonBox width="60%" height={16} style={{ marginBottom: 6 }} />
                <SkeletonBox width="40%" height={12} />
            </View>
        </View>
        <SkeletonBox width={80} height={20} borderRadius={10} style={{ marginTop: 12 }} />
    </View>
);

export const StaffCardSkeleton = () => (
    <View style={styles.card}>
        <View style={styles.row}>
            <SkeletonBox width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
            <View style={styles.col}>
                <SkeletonBox width="50%" height={16} style={{ marginBottom: 6 }} />
                <SkeletonBox width="70%" height={12} />
            </View>
        </View>
    </View>
);

export const DashboardStatSkeleton = () => (
    <View style={styles.statBox}>
        <SkeletonBox width={36} height={36} borderRadius={10} style={{ position: 'absolute', top: 12, right: 12 }} />
        <SkeletonBox width="50%" height={32} style={{ marginTop: 8 }} />
        <SkeletonBox width="70%" height={12} style={{ marginTop: 12 }} />
    </View>
);

export const ListScreenSkeleton = ({ count = 5 }: { count?: number }) => (
    <View style={styles.listContainer}>
        {Array.from({ length: count }).map((_, i) => (
            <AppointmentCardSkeleton key={i} />
        ))}
    </View>
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        height: 100,
        borderWidth: 1,
        borderColor: BASE_COLOR,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    col: {
        flex: 1,
        justifyContent: 'center',
    },
    statBox: {
        width: '100%',
        backgroundColor: CARD_BG,
        borderRadius: 16,
        padding: 16,
        marginBottom: 15,
        height: 100,
        borderWidth: 1,
        borderColor: BASE_COLOR,
        position: 'relative',
    },
    listContainer: {
        paddingVertical: 10,
    },
});
