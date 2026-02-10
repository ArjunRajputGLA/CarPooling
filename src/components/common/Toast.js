// Toast/Snackbar Component
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideCheck, LucideX, LucideAlertCircle, LucideInfo } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const Toast = ({
  visible,
  message,
  type = 'info', // 'success' | 'error' | 'warning' | 'info'
  duration = 3000,
  onDismiss,
  position = 'top',
}) => {
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss && onDismiss();
    });
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: COLORS.success,
          icon: <LucideCheck size={20} color={COLORS.white} />,
        };
      case 'error':
        return {
          backgroundColor: COLORS.error,
          icon: <LucideX size={20} color={COLORS.white} />,
        };
      case 'warning':
        return {
          backgroundColor: COLORS.warning,
          icon: <LucideAlertCircle size={20} color={COLORS.white} />,
        };
      default:
        return {
          backgroundColor: COLORS.info,
          icon: <LucideInfo size={20} color={COLORS.white} />,
        };
    }
  };

  if (!visible) return null;

  const typeStyles = getTypeStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: typeStyles.backgroundColor,
          transform: [{ translateY }],
          opacity,
        },
        position === 'top' ? styles.positionTop : styles.positionBottom,
      ]}
    >
      <View style={styles.content}>
        {typeStyles.icon}
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
      <TouchableOpacity onPress={dismiss} style={styles.closeButton}>
        <LucideX size={16} color={COLORS.white} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toast Manager for global toast access
let toastRef = null;

export const setToastRef = (ref) => {
  toastRef = ref;
};

export const showToast = (message, type = 'info', duration = 3000) => {
  if (toastRef && toastRef.show) {
    toastRef.show(message, type, duration);
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.lg,
  },
  positionTop: {
    top: 50,
  },
  positionBottom: {
    bottom: 50,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    marginLeft: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  closeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
});

export default Toast;
