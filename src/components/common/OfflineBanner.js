// Offline Banner Component - Material Design 3
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LucideWifiOff, LucideRefreshCw } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Banner shown when the app is offline or data is stale
 */
export default function OfflineBanner({ isOffline, isStale, message }) {
    const { colors, spacing, typography } = useTheme();
    const slideAnim = useRef(new Animated.Value(-50)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const shouldShow = isOffline || isStale;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: shouldShow ? 0 : -50,
                friction: 8,
                tension: 100,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: shouldShow ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, [shouldShow]);

    if (!shouldShow) return null;

    const displayMessage = message || (
        isOffline
            ? 'You are offline. Showing cached data.'
            : 'Data may be outdated. Pull to refresh.'
    );

    const backgroundColor = isOffline 
        ? colors.errorContainer 
        : colors.tertiaryContainer;
    const textColor = isOffline 
        ? colors.onErrorContainer 
        : colors.onTertiaryContainer;
    const iconColor = isOffline 
        ? colors.error 
        : colors.tertiary;

    return (
        <Animated.View 
            style={[
                styles.banner, 
                { 
                    backgroundColor,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                }
            ]}
        >
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                {isOffline ? (
                    <LucideWifiOff size={14} color={iconColor} />
                ) : (
                    <LucideRefreshCw size={14} color={iconColor} />
                )}
            </View>
            <Text style={[
                styles.text, 
                { 
                    color: textColor,
                    marginLeft: spacing.sm,
                    ...typography.labelMedium,
                }
            ]}>
                {displayMessage}
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontWeight: '500',
    },
});
