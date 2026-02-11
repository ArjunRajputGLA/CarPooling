/**
 * SaaS-Grade Empty State Component
 * Professional empty state displays inspired by Stripe, Linear, and Vercel
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { 
  LucideInbox, 
  LucideWifiOff, 
  LucideAlertCircle, 
  LucideSearch,
  LucideFileQuestion,
  LucideCarFront,
  LucideScan,
  LucideCloudOff,
  LucideLock,
  LucideShieldOff,
  LucideRefreshCcw,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { M3Button, ButtonVariant } from './M3Button';

/**
 * Empty state types
 */
export const EmptyStateType = {
  NO_DATA: 'noData',
  NO_TRIPS: 'noTrips',
  NO_SEARCH_RESULTS: 'noSearchResults',
  NO_INTERNET: 'noInternet',
  ERROR: 'error',
  PERMISSION_DENIED: 'permissionDenied',
  MAINTENANCE: 'maintenance',
  CUSTOM: 'custom',
};

/**
 * SaaS Empty State Component
 */
export const M3EmptyState = ({
  type = EmptyStateType.NO_DATA,
  title,
  message,
  icon,
  iconColor,
  primaryAction,
  secondaryAction,
  animated = true,
  compact = false,
  style,
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    if (animated) {
      // Fade in and scale
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Subtle floating animation for icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -6,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [animated, floatAnim, fadeAnim, scaleAnim]);
  
  const getTypeConfig = () => {
    switch (type) {
      case EmptyStateType.NO_TRIPS:
        return {
          icon: <LucideCarFront />,
          iconColor: colors.primary,
          title: title || 'No trips yet',
          message: message || "Start by scanning your driver's QR code to record your first trip.",
        };
      case EmptyStateType.NO_SEARCH_RESULTS:
        return {
          icon: <LucideSearch />,
          iconColor: colors.textSecondary,
          title: title || 'No results found',
          message: message || 'Try adjusting your search terms or filters to find what you\'re looking for.',
        };
      case EmptyStateType.NO_INTERNET:
        return {
          icon: <LucideWifiOff />,
          iconColor: colors.error,
          title: title || 'No connection',
          message: message || 'Please check your internet connection and try again.',
        };
      case EmptyStateType.ERROR:
        return {
          icon: <LucideAlertCircle />,
          iconColor: colors.error,
          title: title || 'Something went wrong',
          message: message || 'An unexpected error occurred. Please try again.',
        };
      case EmptyStateType.PERMISSION_DENIED:
        return {
          icon: <LucideLock />,
          iconColor: colors.warning,
          title: title || 'Permission required',
          message: message || 'This feature requires additional permissions to function.',
        };
      case EmptyStateType.MAINTENANCE:
        return {
          icon: <LucideCloudOff />,
          iconColor: colors.warning,
          title: title || 'Under maintenance',
          message: message || 'We\'re making improvements. Please check back shortly.',
        };
      case EmptyStateType.CUSTOM:
        return {
          icon: icon || <LucideFileQuestion />,
          iconColor: iconColor || colors.textSecondary,
          title: title || 'No data',
          message: message || '',
        };
      case EmptyStateType.NO_DATA:
      default:
        return {
          icon: <LucideInbox />,
          iconColor: colors.primary,
          title: title || 'Nothing here yet',
          message: message || 'Content will appear here when available.',
        };
    }
  };
  
  const config = getTypeConfig();
  const iconSize = compact ? 48 : 64;
  const containerSize = compact ? 100 : 120;
  
  return (
    <Animated.View
      style={[
        styles.container,
        compact && styles.containerCompact,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      {/* Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: `${config.iconColor}10`,
            borderWidth: 1,
            borderColor: `${config.iconColor}20`,
            transform: [{ translateY: floatAnim }],
          },
        ]}
      >
        {React.isValidElement(icon) ? (
          React.cloneElement(icon, {
            color: iconColor || config.iconColor,
            size: iconSize,
            strokeWidth: 1.5,
          })
        ) : React.isValidElement(config.icon) ? (
          React.cloneElement(config.icon, {
            color: config.iconColor,
            size: iconSize,
            strokeWidth: 1.5,
          })
        ) : null}
      </Animated.View>
      
      {/* Title */}
      <Text
        style={[
          styles.title,
          compact ? typography.titleMedium : typography.headingSmall,
          {
            color: colors.textPrimary,
            fontWeight: '600',
          },
        ]}
      >
        {config.title}
      </Text>
      
      {/* Message */}
      {config.message && (
        <Text
          style={[
            styles.message,
            compact ? typography.bodySmall : typography.bodyMedium,
            {
              color: colors.textSecondary,
              maxWidth: compact ? 240 : 300,
            },
          ]}
        >
          {config.message}
        </Text>
      )}
      
      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <View style={styles.actions}>
          {primaryAction && (
            <M3Button
              title={primaryAction.label}
              onPress={primaryAction.onPress}
              variant={primaryAction.variant || 'primary'}
              icon={primaryAction.icon}
              size={compact ? 'small' : 'medium'}
              style={styles.primaryButton}
            />
          )}
          {secondaryAction && (
            <M3Button
              title={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant={secondaryAction.variant || 'ghost'}
              icon={secondaryAction.icon}
              size={compact ? 'small' : 'medium'}
              style={styles.secondaryButton}
            />
          )}
        </View>
      )}
    </Animated.View>
  );
};

/**
 * Error State Component - Specialized error display
 */
export const M3ErrorState = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  style,
}) => {
  const { colors } = useTheme();
  
  return (
    <M3EmptyState
      type={EmptyStateType.ERROR}
      title={title}
      message={message}
      primaryAction={onRetry ? {
        label: retryLabel,
        onPress: onRetry,
        icon: <LucideRefreshCcw size={18} color="#FFFFFF" />,
      } : undefined}
      style={style}
    />
  );
};

/**
 * Offline State Component - Network error display
 */
export const M3OfflineState = ({
  onRetry,
  style,
}) => {
  return (
    <M3EmptyState
      type={EmptyStateType.NO_INTERNET}
      primaryAction={onRetry ? {
        label: 'Retry',
        onPress: onRetry,
        icon: <LucideRefreshCcw size={18} color="#FFFFFF" />,
      } : undefined}
      style={style}
    />
  );
};

/**
 * Search Empty State - For search results
 */
export const M3SearchEmptyState = ({
  searchTerm,
  onClear,
  style,
}) => {
  return (
    <M3EmptyState
      type={EmptyStateType.NO_SEARCH_RESULTS}
      message={searchTerm ? `No results for "${searchTerm}"` : undefined}
      secondaryAction={onClear ? {
        label: 'Clear search',
        onPress: onClear,
      } : undefined}
      compact
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  containerCompact: {
    padding: 24,
    flex: 0,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  actions: {
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: {},
  secondaryButton: {
    marginTop: 4,
  },
});

export default M3EmptyState;
