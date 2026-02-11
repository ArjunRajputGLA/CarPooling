/**
 * SaaS-Grade Chip Components
 * Professional chip variants inspired by Stripe, Linear, and Vercel
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { LucideCheck, LucideX } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Chip variants - SaaS Style
 */
export const ChipVariant = {
  DEFAULT: 'default',
  FILTER: 'filter',
  INPUT: 'input',
  SUGGESTION: 'suggestion',
  STATUS: 'status',
  // Legacy mappings
  ASSIST: 'default',
};

/**
 * Chip sizes
 */
export const ChipSize = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

/**
 * SaaS Chip Component
 */
export const M3Chip = ({
  label,
  onPress,
  variant = ChipVariant.DEFAULT,
  size = ChipSize.MEDIUM,
  selected = false,
  disabled = false,
  icon,
  avatar,
  onClose,
  color,
  style,
  ...props
}) => {
  const { colors, typography, borderRadius, animation } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = useCallback(() => {
    if (!disabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 10,
        tension: 100,
      }).start();
    }
  }, [disabled, scaleAnim]);
  
  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [scaleAnim]);
  
  const getSizeConfig = () => {
    switch (size) {
      case ChipSize.SMALL:
        return {
          height: 24,
          paddingHorizontal: 8,
          iconSize: 14,
          typography: typography.labelSmall,
        };
      case ChipSize.LARGE:
        return {
          height: 36,
          paddingHorizontal: 16,
          iconSize: 20,
          typography: typography.labelLarge,
        };
      default:
        return {
          height: 28,
          paddingHorizontal: 12,
          iconSize: 16,
          typography: typography.labelMedium,
        };
    }
  };
  
  const sizeConfig = getSizeConfig();
  
  const getChipStyles = () => {
    if (selected) {
      return {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 0,
        textColor: '#FFFFFF',
      };
    }
    
    switch (variant) {
      case ChipVariant.FILTER:
        return {
          backgroundColor: 'transparent',
          borderColor: colors.border,
          borderWidth: 1,
          textColor: colors.textSecondary,
        };
      case ChipVariant.INPUT:
        return {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
          borderWidth: 1,
          textColor: colors.textPrimary,
        };
      case ChipVariant.SUGGESTION:
        return {
          backgroundColor: 'transparent',
          borderColor: colors.border,
          borderWidth: 1,
          borderStyle: 'dashed',
          textColor: colors.textSecondary,
        };
      default:
        return {
          backgroundColor: colors.surfaceSecondary,
          borderColor: 'transparent',
          borderWidth: 0,
          textColor: colors.textSecondary,
        };
    }
  };
  
  const chipStyles = getChipStyles();
  
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...props}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: chipStyles.backgroundColor,
            borderColor: chipStyles.borderColor,
            borderWidth: chipStyles.borderWidth,
            borderRadius: borderRadius.full,
            height: sizeConfig.height,
            paddingHorizontal: sizeConfig.paddingHorizontal,
            opacity: disabled ? 0.5 : 1,
            transform: [{ scale: scaleAnim }],
          },
          style,
        ]}
      >
        {/* Leading content */}
        {variant === ChipVariant.FILTER && selected && (
          <View style={styles.leadingIcon}>
            <LucideCheck color={chipStyles.textColor} size={sizeConfig.iconSize} strokeWidth={2.5} />
          </View>
        )}
        {avatar && (
          <View style={[styles.avatar, { width: sizeConfig.height - 8, height: sizeConfig.height - 8 }]}>
            {avatar}
          </View>
        )}
        {icon && !avatar && !(variant === ChipVariant.FILTER && selected) && (
          <View style={styles.leadingIcon}>
            {React.cloneElement(icon, {
              color: chipStyles.textColor,
              size: sizeConfig.iconSize,
              strokeWidth: 2,
            })}
          </View>
        )}
        
        {/* Label */}
        <Text
          style={[
            styles.label,
            {
              color: chipStyles.textColor,
              ...sizeConfig.typography,
              fontWeight: selected ? '600' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        
        {/* Close button for input chips */}
        {variant === ChipVariant.INPUT && onClose && (
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              { opacity: pressed ? 0.7 : 1 }
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LucideX color={chipStyles.textColor} size={sizeConfig.iconSize - 2} strokeWidth={2} />
          </Pressable>
        )}
      </Animated.View>
    </Pressable>
  );
};

/**
 * Status Chip - SaaS Style badges
 */
export const M3StatusChip = ({
  status,
  size = 'medium',
  variant = 'filled', // 'filled' | 'soft' | 'outline'
  style,
}) => {
  const { colors, typography, borderRadius } = useTheme();
  
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
      case 'success':
      case 'active':
        return {
          filled: { backgroundColor: colors.success, textColor: '#FFFFFF' },
          soft: { backgroundColor: colors.successLight, textColor: colors.success },
          outline: { backgroundColor: 'transparent', textColor: colors.success, borderColor: colors.success },
          label: status.charAt(0).toUpperCase() + status.slice(1),
        };
      case 'pending':
      case 'processing':
      case 'in_progress':
        return {
          filled: { backgroundColor: colors.warning, textColor: '#FFFFFF' },
          soft: { backgroundColor: colors.warningLight, textColor: colors.warning },
          outline: { backgroundColor: 'transparent', textColor: colors.warning, borderColor: colors.warning },
          label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        };
      case 'failed':
      case 'error':
      case 'cancelled':
      case 'inactive':
        return {
          filled: { backgroundColor: colors.error, textColor: '#FFFFFF' },
          soft: { backgroundColor: colors.errorLight, textColor: colors.error },
          outline: { backgroundColor: 'transparent', textColor: colors.error, borderColor: colors.error },
          label: status.charAt(0).toUpperCase() + status.slice(1),
        };
      case 'driver':
        return {
          filled: { backgroundColor: colors.info, textColor: '#FFFFFF' },
          soft: { backgroundColor: colors.infoLight, textColor: colors.info },
          outline: { backgroundColor: 'transparent', textColor: colors.info, borderColor: colors.info },
          label: 'Driver',
        };
      case 'passenger':
        return {
          filled: { backgroundColor: colors.primary, textColor: '#FFFFFF' },
          soft: { backgroundColor: colors.primaryLightest, textColor: colors.primary },
          outline: { backgroundColor: 'transparent', textColor: colors.primary, borderColor: colors.primary },
          label: 'Passenger',
        };
      case 'new':
      case 'draft':
        return {
          filled: { backgroundColor: colors.textSecondary, textColor: '#FFFFFF' },
          soft: { backgroundColor: colors.surfaceSecondary, textColor: colors.textSecondary },
          outline: { backgroundColor: 'transparent', textColor: colors.textSecondary, borderColor: colors.border },
          label: status.charAt(0).toUpperCase() + status.slice(1),
        };
      default:
        return {
          filled: { backgroundColor: colors.surfaceSecondary, textColor: colors.textSecondary },
          soft: { backgroundColor: colors.surfaceSecondary, textColor: colors.textSecondary },
          outline: { backgroundColor: 'transparent', textColor: colors.textSecondary, borderColor: colors.border },
          label: status || 'Unknown',
        };
    }
  };
  
  const config = getStatusConfig();
  const variantStyle = config[variant] || config.soft;
  
  const sizeStyles = size === 'small' ? {
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  } : size === 'large' ? {
    paddingVertical: 6,
    paddingHorizontal: 14,
    fontSize: typography.labelMedium.fontSize,
    lineHeight: typography.labelMedium.lineHeight,
  } : {
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: typography.labelSmall.fontSize,
    lineHeight: typography.labelSmall.lineHeight,
  };
  
  return (
    <View
      style={[
        styles.statusChip,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderRadius: borderRadius.full,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variantStyle.borderColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.statusLabel,
          {
            color: variantStyle.textColor,
            fontSize: sizeStyles.fontSize,
            lineHeight: sizeStyles.lineHeight,
            fontWeight: '600',
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

/**
 * Badge Component - Numeric badges
 */
export const M3Badge = ({
  count,
  max = 99,
  color,
  size = 'medium',
  style,
}) => {
  const { colors, typography, borderRadius } = useTheme();
  
  const displayCount = count > max ? `${max}+` : count;
  const badgeColor = color || colors.error;
  
  const sizeStyles = size === 'small' ? {
    minWidth: 16,
    height: 16,
    fontSize: 10,
    paddingHorizontal: 4,
  } : {
    minWidth: 20,
    height: 20,
    fontSize: 11,
    paddingHorizontal: 6,
  };
  
  if (!count || count <= 0) return null;
  
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColor,
          borderRadius: borderRadius.full,
          minWidth: sizeStyles.minWidth,
          height: sizeStyles.height,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: '#FFFFFF',
            fontSize: sizeStyles.fontSize,
            fontWeight: '700',
          },
        ]}
      >
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadingIcon: {
    marginRight: 6,
    marginLeft: -2,
  },
  avatar: {
    borderRadius: 999,
    marginRight: 6,
    marginLeft: -4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {},
  closeButton: {
    marginLeft: 4,
    marginRight: -4,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusLabel: {
    textTransform: 'capitalize',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    textAlign: 'center',
  },
});

export default M3Chip;
