/**
 * SaaS-Grade Skeleton Loading Components
 * Professional loading states inspired by Stripe, Linear, and Vercel
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Shimmer effect animation - SaaS Style
 */
const ShimmerPlaceholder = ({ width, height, borderRadius, style, variant = 'default' }) => {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);
  
  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'dark':
        return colors.surfaceTertiary || colors.surfaceSecondary;
      case 'light':
        return colors.surfaceSecondary;
      default:
        return colors.surfaceSecondary;
    }
  };
  
  return (
    <View
      style={[
        styles.shimmerContainer,
        {
          width,
          height,
          borderRadius: borderRadius || 6,
          backgroundColor: getBackgroundColor(),
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
            backgroundColor: colors.cardBackground,
          },
        ]}
      />
    </View>
  );
};

/**
 * Card Skeleton - SaaS Style
 */
export const M3CardSkeleton = ({ style }) => {
  const { colors, borderRadius, spacing, elevation } = useTheme();
  
  return (
    <View 
      style={[
        styles.cardSkeleton, 
        { 
          borderRadius: borderRadius.lg,
          backgroundColor: colors.cardBackground,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }, 
        elevation.card,
        style
      ]}
    >
      <View style={styles.cardHeader}>
        <ShimmerPlaceholder width={44} height={44} borderRadius={22} />
        <View style={styles.cardHeaderText}>
          <ShimmerPlaceholder width={140} height={14} borderRadius={4} />
          <ShimmerPlaceholder width={100} height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      </View>
      <ShimmerPlaceholder width="100%" height={12} borderRadius={4} style={{ marginTop: 16 }} />
      <ShimmerPlaceholder width="75%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
      <ShimmerPlaceholder width="50%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
    </View>
  );
};

/**
 * List Item Skeleton - SaaS Style
 */
export const M3ListItemSkeleton = ({ style, showChevron = true }) => {
  const { colors, borderRadius } = useTheme();
  
  return (
    <View
      style={[
        styles.listItemSkeleton,
        {
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        style,
      ]}
    >
      <ShimmerPlaceholder width={44} height={44} borderRadius={22} />
      <View style={styles.listItemContent}>
        <ShimmerPlaceholder width={130} height={14} borderRadius={4} />
        <ShimmerPlaceholder width={90} height={12} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <View style={styles.listItemTrailing}>
        <ShimmerPlaceholder width={60} height={14} borderRadius={4} />
        <ShimmerPlaceholder width={50} height={22} borderRadius={12} style={{ marginTop: 6 }} />
      </View>
      {showChevron && (
        <ShimmerPlaceholder width={20} height={20} borderRadius={4} style={{ marginLeft: 8 }} />
      )}
    </View>
  );
};

/**
 * Metric Card Skeleton - SaaS Style
 */
export const M3MetricSkeleton = ({ style, compact = false }) => {
  const { colors, borderRadius, elevation } = useTheme();
  
  return (
    <View
      style={[
        styles.metricSkeleton,
        {
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        elevation.card,
        compact && styles.metricSkeletonCompact,
        style,
      ]}
    >
      <View style={styles.metricHeader}>
        <ShimmerPlaceholder width={40} height={40} borderRadius={10} />
        <ShimmerPlaceholder width={50} height={20} borderRadius={12} />
      </View>
      <ShimmerPlaceholder width={80} height={compact ? 24 : 32} borderRadius={4} style={{ marginTop: 16 }} />
      <ShimmerPlaceholder width={100} height={12} borderRadius={4} style={{ marginTop: 8 }} />
    </View>
  );
};

/**
 * Revenue Card Skeleton - SaaS Style
 */
export const M3RevenueSkeleton = ({ style }) => {
  const { colors, borderRadius, elevation } = useTheme();
  
  return (
    <View
      style={[
        styles.revenueSkeleton,
        {
          backgroundColor: colors.primary,
          borderRadius: borderRadius.xl,
        },
        elevation.card,
        style,
      ]}
    >
      <View style={styles.revenueHeader}>
        <View style={styles.revenueText}>
          <View style={[styles.shimmerLight, { width: 80, height: 14, borderRadius: 4 }]} />
          <View style={[styles.shimmerLight, { width: 140, height: 36, borderRadius: 4, marginTop: 8 }]} />
          <View style={[styles.shimmerLight, { width: 100, height: 12, borderRadius: 4, marginTop: 8 }]} />
        </View>
        <View style={[styles.shimmerLight, { width: 56, height: 56, borderRadius: 14 }]} />
      </View>
    </View>
  );
};

/**
 * Profile Skeleton - SaaS Style
 */
export const M3ProfileSkeleton = ({ style }) => {
  const { colors, borderRadius, elevation } = useTheme();
  
  return (
    <View style={[styles.profileSkeleton, style]}>
      {/* Header */}
      <View style={styles.profileHeader}>
        <ShimmerPlaceholder width={96} height={96} borderRadius={48} />
        <ShimmerPlaceholder width={150} height={20} borderRadius={4} style={{ marginTop: 16 }} />
        <ShimmerPlaceholder width={180} height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <ShimmerPlaceholder width={70} height={26} borderRadius={14} style={{ marginTop: 12 }} />
      </View>
      
      {/* Info Cards */}
      <View
        style={[
          styles.profileCard,
          {
            backgroundColor: colors.cardBackground,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
          },
          elevation.card,
        ]}
      >
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.profileRow, i < 3 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <ShimmerPlaceholder width={40} height={40} borderRadius={10} />
            <View style={styles.profileRowText}>
              <ShimmerPlaceholder width={80} height={12} borderRadius={4} />
              <ShimmerPlaceholder width={150} height={14} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * QR Code Skeleton - SaaS Style
 */
export const M3QRCodeSkeleton = ({ size = 240, style }) => {
  const { colors, borderRadius, elevation } = useTheme();
  
  return (
    <View
      style={[
        styles.qrSkeleton,
        {
          width: size + 48,
          height: size + 48,
          backgroundColor: colors.cardBackground,
          borderRadius: borderRadius.xl,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        elevation.card,
        style,
      ]}
    >
      <ShimmerPlaceholder width={size} height={size} borderRadius={borderRadius.lg} />
    </View>
  );
};

/**
 * Text Line Skeleton - for loading text content
 */
export const M3TextSkeleton = ({ width = '100%', height = 14, style }) => {
  return (
    <ShimmerPlaceholder
      width={width}
      height={height}
      borderRadius={4}
      style={style}
    />
  );
};

/**
 * Avatar Skeleton
 */
export const M3AvatarSkeleton = ({ size = 40, style }) => {
  return (
    <ShimmerPlaceholder
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
};

/**
 * Button Skeleton
 */
export const M3ButtonSkeleton = ({ width = 100, size = 'medium', style }) => {
  const heights = { small: 36, medium: 44, large: 52 };
  return (
    <ShimmerPlaceholder
      width={width}
      height={heights[size] || heights.medium}
      borderRadius={8}
      style={style}
    />
  );
};

/**
 * Dashboard Skeleton - Full dashboard loading state
 */
export const M3DashboardSkeleton = ({ style }) => {
  const { colors, borderRadius, spacing } = useTheme();
  
  return (
    <View style={[styles.dashboardSkeleton, style]}>
      {/* Revenue Card */}
      <M3RevenueSkeleton style={{ marginBottom: 16 }} />
      
      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <M3MetricSkeleton style={{ flex: 1, marginRight: 8 }} />
        <M3MetricSkeleton style={{ flex: 1, marginLeft: 8 }} />
      </View>
      
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <ShimmerPlaceholder width={120} height={18} borderRadius={4} />
        <ShimmerPlaceholder width={60} height={14} borderRadius={4} />
      </View>
      
      {/* List Items */}
      {[1, 2, 3].map((i) => (
        <M3ListItemSkeleton key={i} style={{ marginBottom: 8 }} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  shimmerContainer: {
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '25%',
    opacity: 0.4,
  },
  shimmerLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  // Card Skeleton
  cardSkeleton: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    marginLeft: 14,
    flex: 1,
  },
  
  // List Item Skeleton
  listItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 14,
  },
  listItemTrailing: {
    alignItems: 'flex-end',
  },
  
  // Metric Skeleton
  metricSkeleton: {
    padding: 16,
  },
  metricSkeletonCompact: {
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  // Revenue Skeleton
  revenueSkeleton: {
    padding: 24,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  revenueText: {},
  
  // Profile Skeleton
  profileSkeleton: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profileCard: {
    marginHorizontal: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileRowText: {
    marginLeft: 14,
    flex: 1,
  },
  
  // QR Skeleton
  qrSkeleton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Dashboard Skeleton
  dashboardSkeleton: {
    padding: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});

export default ShimmerPlaceholder;
