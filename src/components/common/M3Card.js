/**
 * SaaS-Grade Card Components
 * Professional card variants inspired by Stripe, Linear, and Vercel
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import {
  LucideTrendingUp,
  LucideTrendingDown,
  LucideArrowRight,
  LucideCheck,
  LucideClock,
  LucideAlertCircle,
  LucideChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Card variants - SaaS Style
 */
export const CardVariant = {
  DEFAULT: 'default',
  ELEVATED: 'elevated',
  FILLED: 'filled',
  OUTLINED: 'outlined',
  GHOST: 'ghost',
  // Legacy mappings
  SURFACE: 'default',
};

/**
 * Base SaaS Card Component
 */
export const M3Card = ({
  children,
  variant = CardVariant.DEFAULT,
  onPress,
  disabled = false,
  interactive = !!onPress,
  style,
  contentStyle,
  padding = 'medium',
  ...props
}) => {
  const { colors, borderRadius, elevation, animation, spacing } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;
  
  const handlePressIn = useCallback(() => {
    if ((onPress || interactive) && !disabled) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.985,
          useNativeDriver: true,
          friction: 10,
          tension: 100,
        }),
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: animation.duration.fast,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [onPress, interactive, disabled, scaleAnim, shadowAnim, animation.duration]);
  
  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: animation.duration.fast,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, shadowAnim, animation.duration]);
  
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'small': return spacing.md;
      case 'large': return spacing.xl;
      default: return spacing.lg;
    }
  };
  
  const getVariantStyles = () => {
    switch (variant) {
      case CardVariant.ELEVATED:
        return {
          backgroundColor: colors.cardBackground,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          ...elevation.card,
        };
      case CardVariant.FILLED:
        return {
          backgroundColor: colors.surfaceSecondary,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case CardVariant.OUTLINED:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case CardVariant.GHOST:
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: colors.cardBackground,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          ...elevation.card,
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  
  const CardContent = (
    <Animated.View
      style={[
        styles.card,
        {
          borderRadius: borderRadius.lg,
          ...variantStyles,
          transform: [{ scale: scaleAnim }],
          opacity: disabled ? 0.5 : 1,
        },
        interactive && styles.interactive,
        style,
      ]}
      {...props}
    >
      <View style={[styles.content, { padding: getPadding() }, contentStyle]}>
        {children}
      </View>
    </Animated.View>
  );
  
  if (onPress || interactive) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {CardContent}
      </Pressable>
    );
  }
  
  return CardContent;
};

/**
 * Stat/Metric Card - SaaS Dashboard Style
 */
export const M3MetricCard = ({
  icon,
  label,
  value,
  previousValue,
  trend,
  trendValue,
  trendLabel,
  color,
  onPress,
  compact = false,
  style,
  ...props
}) => {
  const { colors, typography, borderRadius, spacing } = useTheme();
  
  // Calculate trend if not provided
  const calculatedTrend = trend || (previousValue ? (
    parseFloat(value) > parseFloat(previousValue) ? 'up' : 
    parseFloat(value) < parseFloat(previousValue) ? 'down' : 'neutral'
  ) : null);
  
  const accentColor = color || colors.primary;
  
  const getTrendColor = () => {
    switch (calculatedTrend) {
      case 'up': return colors.success;
      case 'down': return colors.error;
      default: return colors.textSecondary;
    }
  };
  
  const TrendIcon = calculatedTrend === 'up' ? LucideTrendingUp : 
                    calculatedTrend === 'down' ? LucideTrendingDown : null;
  
  return (
    <M3Card
      variant={CardVariant.DEFAULT}
      onPress={onPress}
      style={[compact ? styles.metricCardCompact : styles.metricCard, style]}
      padding={compact ? 'small' : 'medium'}
      {...props}
    >
      <View style={styles.metricHeader}>
        {icon && (
          <View
            style={[
              styles.metricIconContainer,
              {
                backgroundColor: `${accentColor}10`,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            {React.cloneElement(icon, {
              color: accentColor,
              size: compact ? 18 : 22,
              strokeWidth: 2,
            })}
          </View>
        )}
        
        {calculatedTrend && trendValue && (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor: `${getTrendColor()}15`,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            {TrendIcon && <TrendIcon size={12} color={getTrendColor()} strokeWidth={2.5} />}
            <Text
              style={[
                styles.trendText,
                {
                  color: getTrendColor(),
                  ...typography.labelSmall,
                  fontWeight: '600',
                },
              ]}
            >
              {trendValue}
            </Text>
          </View>
        )}
      </View>
      
      <Text
        style={[
          styles.metricValue,
          {
            color: colors.textPrimary,
            ...compact ? typography.headingSmall : typography.headingLarge,
            fontWeight: '600',
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      
      <Text
        style={[
          styles.metricLabel,
          {
            color: colors.textSecondary,
            ...typography.bodySmall,
          },
        ]}
      >
        {label}
      </Text>
      
      {trendLabel && (
        <Text
          style={[
            styles.trendLabel,
            {
              color: colors.textTertiary,
              ...typography.caption,
            },
          ]}
        >
          {trendLabel}
        </Text>
      )}
    </M3Card>
  );
};

/**
 * Revenue/Hero Card - SaaS Feature Card
 */
export const M3RevenueCard = ({
  title,
  amount,
  subtitle,
  icon,
  gradient = false,
  color,
  actionLabel,
  onAction,
  style,
  ...props
}) => {
  const { colors, typography, borderRadius, elevation, spacing } = useTheme();
  
  const bgColor = color || colors.primary;
  
  return (
    <View
      style={[
        styles.revenueCard,
        {
          backgroundColor: bgColor,
          borderRadius: borderRadius.xl,
          ...elevation.card,
        },
        style,
      ]}
      {...props}
    >
      <View style={styles.revenueContent}>
        <View style={styles.revenueHeader}>
          <View style={styles.revenueTextContent}>
            <Text
              style={[
                styles.revenueTitle,
                {
                  color: 'rgba(255, 255, 255, 0.85)',
                  ...typography.labelLarge,
                  fontWeight: '500',
                },
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.revenueAmount,
                {
                  color: '#FFFFFF',
                  ...typography.displaySmall,
                  fontWeight: '700',
                },
              ]}
            >
              {amount}
            </Text>
            {subtitle && (
              <Text
                style={[
                  styles.revenueSubtitle,
                  {
                    color: 'rgba(255, 255, 255, 0.7)',
                    ...typography.bodySmall,
                  },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
          
          {icon && (
            <View
              style={[
                styles.revenueIcon,
                {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              {React.cloneElement(icon, {
                color: '#FFFFFF',
                size: 28,
                strokeWidth: 2,
              })}
            </View>
          )}
        </View>
        
        {actionLabel && (
          <Pressable
            style={({ pressed }) => [
              styles.revenueAction,
              {
                backgroundColor: pressed ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                borderRadius: borderRadius.md,
              },
            ]}
            onPress={onAction}
          >
            <Text
              style={[
                styles.revenueActionText,
                {
                  color: '#FFFFFF',
                  ...typography.labelMedium,
                  fontWeight: '600',
                },
              ]}
            >
              {actionLabel}
            </Text>
            <LucideArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

/**
 * List Item Card - SaaS Style
 */
export const M3TripCard = ({
  passengerName,
  passengerImage,
  phoneNumber,
  timestamp,
  status,
  amount,
  onPress,
  showChevron = true,
  style,
  ...props
}) => {
  const { colors, typography, borderRadius, spacing } = useTheme();
  
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'success':
        return {
          backgroundColor: colors.successLight,
          textColor: colors.success,
          icon: LucideCheck,
          label: 'Paid',
        };
      case 'pending':
      case 'processing':
        return {
          backgroundColor: colors.warningLight,
          textColor: colors.warning,
          icon: LucideClock,
          label: 'Pending',
        };
      case 'failed':
      case 'error':
        return {
          backgroundColor: colors.errorLight,
          textColor: colors.error,
          icon: LucideAlertCircle,
          label: 'Failed',
        };
      default:
        return {
          backgroundColor: colors.surfaceSecondary,
          textColor: colors.textSecondary,
          icon: null,
          label: status || 'Unknown',
        };
    }
  };
  
  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  
  return (
    <M3Card
      variant={CardVariant.OUTLINED}
      onPress={onPress}
      style={[styles.tripCard, style]}
      padding="medium"
      {...props}
    >
      <View style={styles.tripContent}>
        {/* Avatar */}
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.primaryLightest,
              borderRadius: borderRadius.full,
            },
          ]}
        >
          {passengerImage ? (
            <Image source={{ uri: passengerImage }} style={styles.avatarImage} />
          ) : (
            <Text
              style={[
                styles.avatarText,
                {
                  color: colors.primary,
                  ...typography.titleMedium,
                  fontWeight: '600',
                },
              ]}
            >
              {passengerName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          )}
        </View>
        
        {/* Info */}
        <View style={styles.tripInfo}>
          <Text
            style={[
              styles.passengerName,
              {
                color: colors.textPrimary,
                ...typography.titleSmall,
                fontWeight: '600',
              },
            ]}
            numberOfLines={1}
          >
            {passengerName}
          </Text>
          
          {timestamp && (
            <Text
              style={[
                styles.timestamp,
                {
                  color: colors.textTertiary,
                  ...typography.caption,
                },
              ]}
            >
              {timestamp}
            </Text>
          )}
          
          {phoneNumber && (
            <Text
              style={[
                styles.phoneNumber,
                {
                  color: colors.textSecondary,
                  ...typography.bodySmall,
                },
              ]}
            >
              {phoneNumber}
            </Text>
          )}
        </View>
        
        {/* Status & Amount */}
        <View style={styles.tripStatus}>
          {amount && (
            <Text
              style={[
                styles.amount,
                {
                  color: colors.textPrimary,
                  ...typography.titleSmall,
                  fontWeight: '700',
                },
              ]}
            >
              {amount}
            </Text>
          )}
          
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: statusConfig.backgroundColor,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            {StatusIcon && (
              <StatusIcon 
                size={12} 
                color={statusConfig.textColor} 
                strokeWidth={2.5} 
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              style={[
                styles.statusText,
                {
                  color: statusConfig.textColor,
                  ...typography.labelSmall,
                  fontWeight: '600',
                },
              ]}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>
        
        {/* Chevron */}
        {showChevron && onPress && (
          <LucideChevronRight 
            size={20} 
            color={colors.textTertiary} 
            style={{ marginLeft: spacing.sm }}
          />
        )}
      </View>
    </M3Card>
  );
};

/**
 * Section Card - For grouped content
 */
export const M3SectionCard = ({
  title,
  description,
  action,
  actionLabel,
  children,
  style,
  ...props
}) => {
  const { colors, typography, borderRadius, spacing } = useTheme();
  
  return (
    <M3Card
      variant={CardVariant.DEFAULT}
      style={style}
      padding="none"
      {...props}
    >
      {(title || action) && (
        <View style={[styles.sectionHeader, { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
          <View style={styles.sectionTitleContainer}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.textPrimary,
                  ...typography.titleMedium,
                  fontWeight: '600',
                },
              ]}
            >
              {title}
            </Text>
            {description && (
              <Text
                style={[
                  styles.sectionDescription,
                  {
                    color: colors.textSecondary,
                    ...typography.bodySmall,
                    marginTop: 4,
                  },
                ]}
              >
                {description}
              </Text>
            )}
          </View>
          {action && (
            <Pressable
              style={({ pressed }) => [
                styles.sectionAction,
                {
                  backgroundColor: pressed ? colors.hoverOverlay : 'transparent',
                  borderRadius: borderRadius.md,
                },
              ]}
              onPress={action}
            >
              <Text
                style={[
                  styles.sectionActionText,
                  {
                    color: colors.primary,
                    ...typography.labelMedium,
                    fontWeight: '600',
                  },
                ]}
              >
                {actionLabel || 'View All'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      <View style={{ padding: spacing.lg }}>
        {children}
      </View>
    </M3Card>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  interactive: {
    cursor: 'pointer',
  },
  content: {},
  
  // Metric Card
  metricCard: {
    minWidth: 160,
  },
  metricCardCompact: {
    minWidth: 140,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    marginBottom: 4,
  },
  metricLabel: {
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  trendText: {
    fontWeight: '600',
  },
  trendLabel: {
    marginTop: 8,
  },
  
  // Revenue Card
  revenueCard: {
    overflow: 'hidden',
  },
  revenueContent: {
    padding: 24,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  revenueTextContent: {
    flex: 1,
    marginRight: 16,
  },
  revenueTitle: {
    marginBottom: 8,
  },
  revenueAmount: {
    marginBottom: 4,
  },
  revenueSubtitle: {
    marginTop: 4,
  },
  revenueIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  revenueActionText: {},
  
  // Trip Card
  tripCard: {
    marginVertical: 4,
  },
  tripContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {},
  tripInfo: {
    flex: 1,
    marginRight: 12,
  },
  passengerName: {},
  phoneNumber: {
    marginTop: 2,
  },
  timestamp: {
    marginTop: 2,
  },
  tripStatus: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  amount: {
    marginBottom: 6,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {},
  
  // Section Card
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {},
  sectionDescription: {},
  sectionAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionActionText: {},
});

export default M3Card;
