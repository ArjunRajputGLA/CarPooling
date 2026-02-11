/**
 * SaaS-Grade Dialog Components
 * Professional dialog variants inspired by Stripe, Linear, and Vercel
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { 
  LucideCheckCircle, 
  LucideAlertCircle, 
  LucideInfo, 
  LucideAlertTriangle, 
  LucideX,
  LucideShieldCheck,
  LucideTrash2,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { M3Button, ButtonVariant } from './M3Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Dialog types
 */
export const DialogType = {
  CONFIRMATION: 'confirmation',
  ERROR: 'error',
  SUCCESS: 'success',
  INFO: 'info',
  LOADING: 'loading',
  WARNING: 'warning',
};

/**
 * Base SaaS Dialog Component
 */
export const M3Dialog = ({
  visible,
  onDismiss,
  title,
  message,
  icon,
  iconColor,
  iconBackgroundColor,
  actions,
  dismissible = true,
  showCloseButton = false,
  children,
  style,
  size = 'medium',
}) => {
  const { colors, typography, borderRadius, elevation, animation } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 10,
          tension: 100,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: animation.duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: animation.duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: animation.duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: animation.duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: animation.duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, animation.duration]);
  
  const getModalWidth = () => {
    switch (size) {
      case 'small': return Math.min(SCREEN_WIDTH - 48, 360);
      case 'large': return Math.min(SCREEN_WIDTH - 32, 560);
      default: return Math.min(SCREEN_WIDTH - 48, 440);
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismissible ? onDismiss : undefined}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={dismissible ? onDismiss : undefined}
      >
        {/* Backdrop with blur effect */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: colors.backdrop,
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ]}
        />
        
        {/* Dialog Container */}
        <Animated.View
          style={[
            styles.dialogContainer,
            {
              backgroundColor: colors.cardBackground,
              borderRadius: borderRadius.modal,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              width: getModalWidth(),
            },
            elevation.modal,
            style,
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Close Button */}
            {showCloseButton && dismissible && (
              <Pressable
                style={[styles.closeButton, { backgroundColor: colors.hoverOverlay }]}
                onPress={onDismiss}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <LucideX size={20} color={colors.textSecondary} />
              </Pressable>
            )}
            
            {/* Icon */}
            {icon && (
              <View style={styles.iconContainer}>
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: iconBackgroundColor || 
                        (iconColor ? `${iconColor}15` : colors.primaryLightest),
                      borderRadius: borderRadius.lg,
                    },
                  ]}
                >
                  {React.cloneElement(icon, {
                    color: iconColor || colors.primary,
                    size: 28,
                    strokeWidth: 2,
                  })}
                </View>
              </View>
            )}
            
            {/* Title */}
            {title && (
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.textPrimary,
                    ...typography.headlineMedium,
                    textAlign: icon ? 'center' : 'left',
                  },
                ]}
              >
                {title}
              </Text>
            )}
            
            {/* Message */}
            {message && (
              <Text
                style={[
                  styles.message,
                  {
                    color: colors.textSecondary,
                    ...typography.bodyMedium,
                    textAlign: icon ? 'center' : 'left',
                  },
                ]}
              >
                {message}
              </Text>
            )}
            
            {/* Custom content */}
            {children}
            
            {/* Actions */}
            {actions && actions.length > 0 && (
              <View style={[styles.actionsContainer, { borderTopColor: colors.border }]}>
                {actions.map((action, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.actionButton,
                      actions.length === 1 && { flex: 1 },
                    ]}
                  >
                    <M3Button
                      title={action.label}
                      onPress={action.onPress}
                      variant={action.variant || (index === actions.length - 1 ? 'primary' : 'ghost')}
                      color={action.color}
                      disabled={action.disabled}
                      loading={action.loading}
                      fullWidth={actions.length === 1}
                    />
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

/**
 * Confirmation Dialog - SaaS Style
 */
export const M3ConfirmDialog = ({
  visible,
  onDismiss,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor,
  destructive = false,
  icon,
  loading = false,
}) => {
  const { colors } = useTheme();
  
  const defaultIcon = destructive ? <LucideTrash2 /> : <LucideAlertCircle />;
  const iconColor = destructive ? colors.error : colors.primary;
  const iconBgColor = destructive ? colors.errorLight : colors.primaryLightest;
  
  return (
    <M3Dialog
      visible={visible}
      onDismiss={onDismiss}
      title={title}
      message={message}
      icon={icon || defaultIcon}
      iconColor={iconColor}
      iconBackgroundColor={iconBgColor}
      showCloseButton
      actions={[
        {
          label: cancelLabel,
          onPress: onDismiss,
          variant: 'secondary',
        },
        {
          label: confirmLabel,
          onPress: () => {
            onConfirm?.();
          },
          variant: destructive ? 'danger' : 'primary',
          color: destructive ? colors.error : confirmColor,
          loading,
        },
      ]}
    />
  );
};

/**
 * Error Dialog - SaaS Style
 */
export const M3ErrorDialog = ({
  visible,
  onDismiss,
  title = 'Something went wrong',
  message,
  actionLabel = 'OK',
  onAction,
  showRetry = false,
  onRetry,
}) => {
  const { colors } = useTheme();
  
  const actions = [];
  
  if (showRetry) {
    actions.push({
      label: 'Try Again',
      onPress: () => {
        onRetry?.();
        onDismiss?.();
      },
      variant: 'secondary',
    });
  }
  
  actions.push({
    label: actionLabel,
    onPress: () => {
      onAction?.();
      onDismiss?.();
    },
    variant: 'primary',
  });
  
  return (
    <M3Dialog
      visible={visible}
      onDismiss={onDismiss}
      title={title}
      message={message}
      icon={<LucideAlertTriangle />}
      iconColor={colors.error}
      iconBackgroundColor={colors.errorLight}
      showCloseButton
      actions={actions}
    />
  );
};

/**
 * Success Dialog - SaaS Style
 */
export const M3SuccessDialog = ({
  visible,
  onDismiss,
  title = 'Success!',
  message,
  actionLabel = 'Done',
  autoDismiss = false,
  autoDismissDelay = 2500,
}) => {
  const { colors } = useTheme();
  
  useEffect(() => {
    if (visible && autoDismiss) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, autoDismissDelay);
      return () => clearTimeout(timer);
    }
  }, [visible, autoDismiss, autoDismissDelay, onDismiss]);
  
  return (
    <M3Dialog
      visible={visible}
      onDismiss={onDismiss}
      title={title}
      message={message}
      icon={<LucideCheckCircle />}
      iconColor={colors.success}
      iconBackgroundColor={colors.successLight}
      actions={autoDismiss ? [] : [{
        label: actionLabel,
        onPress: onDismiss,
        variant: 'primary',
      }]}
    />
  );
};

/**
 * Info Dialog - SaaS Style
 */
export const M3InfoDialog = ({
  visible,
  onDismiss,
  title = 'Information',
  message,
  actionLabel = 'Got it',
}) => {
  const { colors } = useTheme();
  
  return (
    <M3Dialog
      visible={visible}
      onDismiss={onDismiss}
      title={title}
      message={message}
      icon={<LucideInfo />}
      iconColor={colors.info}
      iconBackgroundColor={colors.infoLight}
      showCloseButton
      actions={[{
        label: actionLabel,
        onPress: onDismiss,
        variant: 'primary',
      }]}
    />
  );
};

/**
 * Warning Dialog - SaaS Style
 */
export const M3WarningDialog = ({
  visible,
  onDismiss,
  onConfirm,
  title = 'Warning',
  message,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
}) => {
  const { colors } = useTheme();
  
  return (
    <M3Dialog
      visible={visible}
      onDismiss={onDismiss}
      title={title}
      message={message}
      icon={<LucideAlertTriangle />}
      iconColor={colors.warning}
      iconBackgroundColor={colors.warningLight}
      showCloseButton
      actions={[
        {
          label: cancelLabel,
          onPress: onDismiss,
          variant: 'secondary',
        },
        {
          label: confirmLabel,
          onPress: () => {
            onConfirm?.();
            onDismiss?.();
          },
          variant: 'primary',
        },
      ]}
    />
  );
};

/**
 * Loading Dialog - SaaS Style
 */
export const M3LoadingDialog = ({
  visible,
  message = 'Please wait...',
  progress,
}) => {
  const { colors, typography, borderRadius } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0.4);
    }
  }, [visible, pulseAnim]);
  
  return (
    <M3Dialog
      visible={visible}
      dismissible={false}
      size="small"
    >
      <View style={styles.loadingContent}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Animated.View 
            style={[
              styles.loaderRing,
              {
                borderColor: colors.primaryLightest,
                opacity: pulseAnim,
              }
            ]} 
          />
        </View>
        <Text
          style={[
            styles.loadingText,
            {
              color: colors.textPrimary,
              ...typography.titleMedium,
            },
          ]}
        >
          {message}
        </Text>
        {progress !== undefined && (
          <View style={[styles.progressContainer, { backgroundColor: colors.surfaceSecondary }]}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  backgroundColor: colors.primary,
                  width: `${Math.min(progress, 100)}%`,
                  borderRadius: borderRadius.full,
                }
              ]} 
            />
          </View>
        )}
      </View>
    </M3Dialog>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogContainer: {
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 60,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 24,
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    minWidth: 100,
  },
  loadingContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loaderContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
  },
  loadingText: {
    marginTop: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
});

export default M3Dialog;
