/**
 * SaaS-Grade Button Components
 * Professional button variants inspired by Stripe, Linear, and Vercel
 */

import React, { useRef, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Button variants - SaaS style
 */
export const ButtonVariant = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  TERTIARY: 'tertiary',
  GHOST: 'ghost',
  DANGER: 'danger',
  SUCCESS: 'success',
  // Legacy Material 3 variants for backward compatibility
  FILLED: 'primary',
  FILLED_TONAL: 'secondary',
  OUTLINED: 'secondary',
  TEXT: 'ghost',
  ELEVATED: 'secondary',
};

/**
 * Button sizes
 */
export const ButtonSize = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

/**
 * SaaS Button Component
 */
export const M3Button = ({
  title,
  onPress,
  variant = ButtonVariant.PRIMARY,
  size = ButtonSize.MEDIUM,
  icon,
  iconPosition = 'left',
  loading = false,
  loadingText,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  color,
  ...props
}) => {
  const { colors, typography, borderRadius, elevation, componentSizes } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressedAnim = useRef(new Animated.Value(0)).current;
  
  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: false,
        friction: 10,
        tension: 100,
      }),
      Animated.timing(pressedAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, pressedAnim]);
  
  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: false,
        friction: 10,
        tension: 100,
      }),
      Animated.timing(pressedAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, pressedAnim]);
  
  // Map legacy variants to new ones
  const normalizedVariant = (() => {
    if (variant === 'filled' || variant === 'filledTonal') return 'primary';
    if (variant === 'outlined' || variant === 'elevated') return 'secondary';
    if (variant === 'text') return 'ghost';
    return variant;
  })();
  
  const getButtonColors = () => {
    const customColor = color;
    
    switch (normalizedVariant) {
      case 'primary':
        return {
          background: disabled ? colors.disabledBackground : (customColor || colors.primary),
          text: disabled ? colors.textDisabled : colors.textOnPrimary,
          border: 'transparent',
          pressedBackground: colors.primaryHover,
        };
      case 'secondary':
        return {
          background: disabled ? colors.disabledBackground : colors.surface,
          text: disabled ? colors.textDisabled : colors.textPrimary,
          border: disabled ? colors.border : colors.border,
          pressedBackground: colors.surfaceSecondary,
        };
      case 'tertiary':
      case 'ghost':
        return {
          background: 'transparent',
          text: disabled ? colors.textDisabled : (customColor || colors.primary),
          border: 'transparent',
          pressedBackground: colors.primaryLightest,
        };
      case 'danger':
        return {
          background: disabled ? colors.disabledBackground : colors.error,
          text: disabled ? colors.textDisabled : colors.onError,
          border: 'transparent',
          pressedBackground: colors.errorHover,
        };
      case 'success':
        return {
          background: disabled ? colors.disabledBackground : colors.success,
          text: disabled ? colors.textDisabled : colors.onSuccess,
          border: 'transparent',
          pressedBackground: colors.successHover,
        };
      default:
        return {
          background: customColor || colors.primary,
          text: colors.textOnPrimary,
          border: 'transparent',
          pressedBackground: colors.primaryHover,
        };
    }
  };
  
  const getSizeStyles = () => {
    switch (size) {
      case ButtonSize.SMALL:
        return {
          height: componentSizes?.buttonSmall || 36,
          paddingHorizontal: 12,
          fontSize: typography.buttonSmall.fontSize,
          fontWeight: typography.buttonSmall.fontWeight,
          iconSize: 16,
          gap: 6,
        };
      case ButtonSize.LARGE:
        return {
          height: componentSizes?.buttonLarge || 52,
          paddingHorizontal: 24,
          fontSize: typography.buttonLarge.fontSize,
          fontWeight: typography.buttonLarge.fontWeight,
          iconSize: 24,
          gap: 10,
        };
      default:
        return {
          height: componentSizes?.buttonMedium || 44,
          paddingHorizontal: 20,
          fontSize: typography.buttonMedium.fontSize,
          fontWeight: typography.buttonMedium.fontWeight,
          iconSize: 20,
          gap: 8,
        };
    }
  };
  
  const buttonColors = getButtonColors();
  const sizeStyles = getSizeStyles();
  
  // Animated background for press state
  const animatedBackground = pressedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [buttonColors.background, buttonColors.pressedBackground],
  });
  
  // Get shadow for primary button
  const getShadow = () => {
    if (normalizedVariant === 'primary' && !disabled) {
      return elevation.button;
    }
    if (normalizedVariant === 'secondary' && !disabled) {
      return elevation.level1;
    }
    return {};
  };
  
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      {...props}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor: disabled ? buttonColors.background : animatedBackground,
            borderColor: buttonColors.border,
            borderWidth: normalizedVariant === 'secondary' ? 1.5 : 0,
            borderRadius: borderRadius.button,
            height: sizeStyles.height,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            transform: [{ scale: scaleAnim }],
          },
          getShadow(),
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator 
              size="small" 
              color={buttonColors.text} 
            />
            {loadingText && (
              <Text
                style={[
                  styles.text,
                  {
                    color: buttonColors.text,
                    fontSize: sizeStyles.fontSize,
                    fontWeight: sizeStyles.fontWeight,
                    marginLeft: 8,
                  },
                  textStyle,
                ]}
              >
                {loadingText}
              </Text>
            )}
          </View>
        ) : (
          <View style={[styles.content, { gap: sizeStyles.gap }]}>
            {icon && iconPosition === 'left' && (
              <View>
                {React.cloneElement(icon, { 
                  color: buttonColors.text, 
                  size: sizeStyles.iconSize 
                })}
              </View>
            )}
            <Text
              style={[
                styles.text,
                {
                  color: buttonColors.text,
                  fontSize: sizeStyles.fontSize,
                  fontWeight: sizeStyles.fontWeight,
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <View>
                {React.cloneElement(icon, { 
                  color: buttonColors.text, 
                  size: sizeStyles.iconSize 
                })}
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

/**
 * Floating Action Button (FAB) - SaaS style
 */
export const M3FAB = ({
  icon,
  onPress,
  extended = false,
  label,
  size = 'regular',
  color,
  disabled = false,
  style,
  ...props
}) => {
  const { colors, borderRadius, elevation, typography } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [scaleAnim]);
  
  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [scaleAnim]);
  
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          width: 40,
          height: 40,
          borderRadius: borderRadius.md,
          iconSize: 20,
        };
      case 'large':
        return {
          width: 64,
          height: 64,
          borderRadius: borderRadius.lg,
          iconSize: 28,
        };
      default:
        return {
          width: 56,
          height: 56,
          borderRadius: borderRadius.lg,
          iconSize: 24,
        };
    }
  };
  
  const sizeStyles = getSizeStyles();
  const fabColor = color || colors.primary;
  const iconColor = colors.textOnPrimary;
  
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      {...props}
    >
      <Animated.View
        style={[
          {
            backgroundColor: fabColor,
            borderRadius: sizeStyles.borderRadius,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
          extended ? {
            flexDirection: 'row',
            paddingHorizontal: 20,
            height: sizeStyles.height,
            minWidth: sizeStyles.width,
          } : {
            width: sizeStyles.width,
            height: sizeStyles.height,
          },
          elevation.level3,
          style,
        ]}
      >
        {icon && React.cloneElement(icon, { 
          color: iconColor, 
          size: sizeStyles.iconSize 
        })}
        {extended && label && (
          <Text
            style={{
              color: iconColor,
              fontSize: typography.labelLarge.fontSize,
              fontWeight: '600',
              marginLeft: icon ? 8 : 0,
            }}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

/**
 * Icon Button - SaaS style
 */
export const M3IconButton = ({
  icon,
  onPress,
  variant = 'standard',
  size = 24,
  disabled = false,
  selected = false,
  style,
  color,
  ...props
}) => {
  const { colors, borderRadius } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);
  
  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);
  
  const getVariantStyles = () => {
    const customColor = color || colors.primary;
    
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: selected ? customColor : colors.surfaceTertiary,
          iconColor: selected ? colors.textOnPrimary : colors.textSecondary,
        };
      case 'filledTonal':
        return {
          backgroundColor: selected ? colors.primaryLightest : colors.surfaceTertiary,
          iconColor: selected ? colors.primary : colors.textSecondary,
        };
      case 'outlined':
        return {
          backgroundColor: selected ? colors.primaryLightest : 'transparent',
          borderWidth: 1.5,
          borderColor: selected ? colors.primary : colors.border,
          iconColor: selected ? colors.primary : colors.textSecondary,
        };
      default:
        return {
          backgroundColor: 'transparent',
          iconColor: color || colors.textSecondary,
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      {...props}
    >
      <Animated.View
        style={[
          {
            width: 40,
            height: 40,
            borderRadius: borderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: variantStyles.backgroundColor,
            borderWidth: variantStyles.borderWidth,
            borderColor: variantStyles.borderColor,
            transform: [{ scale: scaleAnim }],
          },
          style,
        ]}
      >
        {icon && React.cloneElement(icon, { 
          color: variantStyles.iconColor, 
          size 
        })}
      </Animated.View>
    </Pressable>
  );
};

/**
 * Link Button - Text-only button that looks like a link
 */
export const LinkButton = ({
  title,
  onPress,
  color,
  size = 'medium',
  disabled = false,
  style,
  textStyle,
  ...props
}) => {
  const { colors, typography } = useTheme();
  const opacityAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = useCallback(() => {
    Animated.timing(opacityAnim, {
      toValue: 0.6,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);
  
  const handlePressOut = useCallback(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);
  
  const getFontSize = () => {
    switch (size) {
      case 'small': return typography.labelSmall.fontSize;
      case 'large': return typography.bodyLarge.fontSize;
      default: return typography.labelMedium.fontSize;
    }
  };
  
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={style}
      {...props}
    >
      <Animated.Text
        style={[
          {
            color: disabled ? colors.textDisabled : (color || colors.primary),
            fontSize: getFontSize(),
            fontWeight: '500',
            opacity: opacityAnim,
          },
          textStyle,
        ]}
      >
        {title}
      </Animated.Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
    letterSpacing: 0,
  },
});

export default M3Button;
