/**
 * SaaS-Grade Snackbar/Toast Component
 * Professional notification system inspired by Stripe, Linear, and Vercel
 */

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import {
  LucideCheck,
  LucideAlertCircle,
  LucideInfo,
  LucideAlertTriangle,
  LucideX,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Snackbar/Toast types
 */
export const SnackbarType = {
  DEFAULT: 'default',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

const SNACKBAR_DURATION = {
  short: 3000,
  default: 4000,
  long: 6000,
  persistent: null,
};

/**
 * Individual Snackbar Item - SaaS Style
 */
const SnackbarItem = ({ 
  id,
  message, 
  title,
  type = SnackbarType.DEFAULT,
  action, 
  icon,
  duration = 'default',
  dismissible = true,
  onDismiss,
  position = 'bottom',
}) => {
  const { colors, typography, borderRadius, animation, elevation } = useTheme();
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 80 || Math.abs(gestureState.vx) > 0.5) {
          Animated.timing(translateX, {
            toValue: gestureState.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH,
            duration: 150,
            useNativeDriver: true,
          }).start(() => onDismiss?.(id));
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;
  
  const getTypeConfig = () => {
    switch (type) {
      case SnackbarType.SUCCESS:
        return {
          icon: <LucideCheck />,
          iconColor: colors.success,
          accentColor: colors.success,
          backgroundColor: colors.cardBackground,
        };
      case SnackbarType.ERROR:
        return {
          icon: <LucideAlertCircle />,
          iconColor: colors.error,
          accentColor: colors.error,
          backgroundColor: colors.cardBackground,
        };
      case SnackbarType.WARNING:
        return {
          icon: <LucideAlertTriangle />,
          iconColor: colors.warning,
          accentColor: colors.warning,
          backgroundColor: colors.cardBackground,
        };
      case SnackbarType.INFO:
        return {
          icon: <LucideInfo />,
          iconColor: colors.info,
          accentColor: colors.info,
          backgroundColor: colors.cardBackground,
        };
      default:
        return {
          icon: null,
          iconColor: colors.textSecondary,
          accentColor: colors.primary,
          backgroundColor: colors.cardBackground,
        };
    }
  };
  
  const typeConfig = getTypeConfig();
  const displayIcon = icon || typeConfig.icon;
  
  useEffect(() => {
    // Enter animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 10,
        tension: 80,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: animation.duration.normal,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Auto dismiss with progress bar
    const durationMs = typeof duration === 'number' ? duration : SNACKBAR_DURATION[duration];
    
    if (durationMs) {
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: durationMs,
        useNativeDriver: false,
      }).start();
      
      const timer = setTimeout(() => {
        dismiss();
      }, durationMs);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: animation.duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: animation.duration.fast,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss?.(id));
  };
  
  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.snackbar,
        {
          backgroundColor: typeConfig.backgroundColor,
          borderRadius: borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          transform: [{ translateY }, { translateX }],
          opacity,
        },
        elevation.toast,
      ]}
    >
      {/* Accent line */}
      <View
        style={[
          styles.accentLine,
          {
            backgroundColor: typeConfig.accentColor,
            borderTopLeftRadius: borderRadius.lg,
            borderBottomLeftRadius: borderRadius.lg,
          },
        ]}
      />
      
      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        {displayIcon && (
          <View style={[styles.iconContainer, { backgroundColor: `${typeConfig.iconColor}15` }]}>
            {React.cloneElement(displayIcon, {
              color: typeConfig.iconColor,
              size: 20,
              strokeWidth: 2,
            })}
          </View>
        )}
        
        {/* Text */}
        <View style={styles.textContainer}>
          {title && (
            <Text
              style={[
                styles.title,
                {
                  color: colors.textPrimary,
                  ...typography.titleSmall,
                  fontWeight: '600',
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          <Text
            style={[
              styles.message,
              {
                color: title ? colors.textSecondary : colors.textPrimary,
                ...typography.bodySmall,
              },
            ]}
            numberOfLines={2}
          >
            {message}
          </Text>
        </View>
        
        {/* Action */}
        {action && (
          <Pressable
            onPress={() => {
              action.onPress?.();
              if (action.dismissOnPress !== false) {
                dismiss();
              }
            }}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: pressed ? colors.hoverOverlay : 'transparent',
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.actionText,
                {
                  color: colors.primary,
                  ...typography.labelMedium,
                  fontWeight: '600',
                },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        )}
        
        {/* Close button */}
        {dismissible && !action && (
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor: pressed ? colors.hoverOverlay : 'transparent',
                borderRadius: borderRadius.full,
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LucideX color={colors.textTertiary} size={18} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      
      {/* Progress bar */}
      {duration && duration !== 'persistent' && (
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: typeConfig.accentColor,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      )}
    </Animated.View>
  );
};

/**
 * Snackbar Manager Component - SaaS Style
 */
export const M3SnackbarManager = forwardRef(({ position = 'bottom', maxVisible = 3 }, ref) => {
  const [snackbars, setSnackbars] = useState([]);
  
  useImperativeHandle(ref, () => ({
    show: (config) => {
      const id = Date.now() + Math.random();
      setSnackbars((prev) => {
        const newSnackbars = [...prev, { id, ...config }];
        // Keep only maxVisible snackbars
        return newSnackbars.slice(-maxVisible);
      });
      return id;
    },
    success: (message, options = {}) => {
      return ref.current.show({ message, type: SnackbarType.SUCCESS, ...options });
    },
    error: (message, options = {}) => {
      return ref.current.show({ message, type: SnackbarType.ERROR, ...options });
    },
    warning: (message, options = {}) => {
      return ref.current.show({ message, type: SnackbarType.WARNING, ...options });
    },
    info: (message, options = {}) => {
      return ref.current.show({ message, type: SnackbarType.INFO, ...options });
    },
    dismiss: (id) => {
      setSnackbars((prev) => prev.filter((s) => s.id !== id));
    },
    dismissAll: () => {
      setSnackbars([]);
    },
  }));
  
  const handleDismiss = (id) => {
    setSnackbars((prev) => prev.filter((s) => s.id !== id));
  };
  
  if (snackbars.length === 0) return null;
  
  return (
    <View 
      style={[
        styles.container, 
        position === 'top' ? styles.containerTop : styles.containerBottom
      ]} 
      pointerEvents="box-none"
    >
      {snackbars.map((snackbar, index) => (
        <SnackbarItem
          key={snackbar.id}
          {...snackbar}
          position={position}
          onDismiss={handleDismiss}
        />
      ))}
    </View>
  );
});

// Global snackbar ref
let globalSnackbarRef = null;

export const setSnackbarRef = (ref) => {
  globalSnackbarRef = ref;
};

export const showSnackbar = (config) => {
  if (globalSnackbarRef) {
    return globalSnackbarRef.show(config);
  }
  console.warn('Snackbar ref not set. Wrap your app with M3SnackbarManager.');
  return null;
};

export const showSuccess = (message, options) => {
  if (globalSnackbarRef) {
    return globalSnackbarRef.success(message, options);
  }
  console.warn('Snackbar ref not set.');
  return null;
};

export const showError = (message, options) => {
  if (globalSnackbarRef) {
    return globalSnackbarRef.error(message, options);
  }
  console.warn('Snackbar ref not set.');
  return null;
};

export const showWarning = (message, options) => {
  if (globalSnackbarRef) {
    return globalSnackbarRef.warning(message, options);
  }
  console.warn('Snackbar ref not set.');
  return null;
};

export const showInfo = (message, options) => {
  if (globalSnackbarRef) {
    return globalSnackbarRef.info(message, options);
  }
  console.warn('Snackbar ref not set.');
  return null;
};

export const dismissSnackbar = (id) => {
  if (globalSnackbarRef) {
    globalSnackbarRef.dismiss(id);
  }
};

export const dismissAllSnackbars = () => {
  if (globalSnackbarRef) {
    globalSnackbarRef.dismissAll();
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    gap: 8,
  },
  containerTop: {
    top: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  containerBottom: {
    bottom: 0,
    paddingBottom: 16,
  },
  snackbar: {
    overflow: 'hidden',
    marginBottom: 8,
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingLeft: 20,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    marginBottom: 2,
  },
  message: {},
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  actionText: {},
  closeButton: {
    padding: 6,
    marginLeft: 4,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
  },
});

export default M3SnackbarManager;
