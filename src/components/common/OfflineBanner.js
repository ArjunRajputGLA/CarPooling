import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideWifiOff } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';

/**
 * Banner shown when the app is offline or data is stale
 */
export default function OfflineBanner({ isOffline, isStale, message }) {
    if (!isOffline && !isStale) return null;

    const displayMessage = message || (
        isOffline
            ? 'You are offline. Showing cached data.'
            : 'Data may be outdated. Pull to refresh.'
    );

    return (
        <View style={[styles.banner, isOffline ? styles.offlineBanner : styles.staleBanner]}>
            <LucideWifiOff size={14} color={isOffline ? COLORS.white : COLORS.warning} />
            <Text style={[styles.text, isOffline ? styles.offlineText : styles.staleText]}>
                {displayMessage}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
    },
    offlineBanner: {
        backgroundColor: COLORS.error,
    },
    staleBanner: {
        backgroundColor: COLORS.warning + '20',
    },
    text: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        marginLeft: SPACING.xs,
        fontWeight: '500',
    },
    offlineText: {
        color: COLORS.white,
    },
    staleText: {
        color: COLORS.warning,
    },
});
