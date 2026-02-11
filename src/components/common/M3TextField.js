/**
 * SaaS-Grade TextField Component
 * Professional text input inspired by Stripe, Linear, and Vercel
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { 
  LucideEye, 
  LucideEyeOff, 
  LucideCheck, 
  LucideAlertCircle,
  LucideInfo,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * TextField variants - SaaS Style
 */
export const TextFieldVariant = {
  DEFAULT: 'default',
  OUTLINED: 'outlined',
  FILLED: 'filled',
  GHOST: 'ghost',
};

/**
 * TextField sizes
 */
export const TextFieldSize = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

/**
 * SaaS TextField Component
 */
export const M3TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  errorMessage,
  helperText,
  isValid,
  warning,
  warningMessage,
  required = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true,
  leadingIcon,
  trailingIcon,
  showValidationIcon = true,
  variant = TextFieldVariant.DEFAULT,
  size = TextFieldSize.MEDIUM,
  onBlur,
  onFocus,
  autoFocus = false,
  clearable = false,
  onClear,
  style,
  inputStyle,
  containerStyle,
  ...props
}) => {
  const { colors, typography, borderRadius, animation, spacing } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const borderAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const inputRef = useRef(null);
  
  // Animate border on focus
  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: animation.duration.fast,
      useNativeDriver: false,
    }).start();
  }, [isFocused, borderAnim, animation.duration]);
  
  // Subtle scale on focus
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.002 : 1,
      friction: 10,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [isFocused, scaleAnim]);
  
  // Shake animation for errors
  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error, shakeAnim]);
  
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);
  
  const handleClear = useCallback(() => {
    onChangeText?.('');
    onClear?.();
    inputRef.current?.focus();
  }, [onChangeText, onClear]);
  
  // Get size-related values
  const getSizeConfig = () => {
    switch (size) {
      case TextFieldSize.SMALL:
        return {
          height: 40,
          padding: spacing.sm,
          typography: typography.bodySmall,
          iconSize: 18,
        };
      case TextFieldSize.LARGE:
        return {
          height: 52,
          padding: spacing.lg,
          typography: typography.bodyLarge,
          iconSize: 24,
        };
      default:
        return {
          height: 44,
          padding: spacing.md,
          typography: typography.bodyMedium,
          iconSize: 20,
        };
    }
  };
  
  const sizeConfig = getSizeConfig();
  
  // Get state-based colors
  const getStateColors = () => {
    if (!editable) {
      return {
        border: colors.borderLight,
        background: colors.surfaceSecondary,
        text: colors.textDisabled,
        label: colors.textDisabled,
      };
    }
    if (error) {
      return {
        border: colors.error,
        background: colors.errorLight,
        text: colors.textPrimary,
        label: colors.error,
        ring: colors.error,
      };
    }
    if (warning) {
      return {
        border: colors.warning,
        background: colors.warningLight,
        text: colors.textPrimary,
        label: colors.warning,
      };
    }
    if (isValid && value) {
      return {
        border: colors.success,
        background: colors.surface,
        text: colors.textPrimary,
        label: colors.success,
      };
    }
    if (isFocused) {
      return {
        border: colors.primary,
        background: colors.surface,
        text: colors.textPrimary,
        label: colors.primary,
        ring: colors.primaryLightest,
      };
    }
    return {
      border: colors.inputBorder,
      background: colors.inputBackground,
      text: colors.textPrimary,
      label: colors.textSecondary,
    };
  };
  
  const stateColors = getStateColors();
  
  // Get variant-based styles
  const getVariantStyles = () => {
    switch (variant) {
      case TextFieldVariant.FILLED:
        return {
          backgroundColor: colors.surfaceSecondary,
          borderWidth: 0,
          borderBottomWidth: 2,
          borderColor: stateColors.border,
          borderRadius: borderRadius.md,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        };
      case TextFieldVariant.GHOST:
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderBottomWidth: 1,
          borderColor: stateColors.border,
          borderRadius: 0,
        };
      case TextFieldVariant.OUTLINED:
      default:
        return {
          backgroundColor: stateColors.background,
          borderWidth: isFocused ? 2 : 1,
          borderColor: stateColors.border,
          borderRadius: borderRadius.md,
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  
  // Ring effect for focus
  const ringStyle = isFocused && stateColors.ring ? {
    ...Platform.select({
      ios: {
        shadowColor: stateColors.ring,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {},
    }),
  } : {};
  
  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              {
                color: stateColors.label,
                ...typography.labelMedium,
                fontWeight: '500',
              },
            ]}
          >
            {label}
            {required && <Text style={{ color: colors.error }}> *</Text>}
          </Text>
        </View>
      )}
      
      {/* Input Container */}
      <Animated.View
        style={[
          styles.inputContainer,
          variantStyles,
          ringStyle,
          {
            minHeight: multiline ? sizeConfig.height * numberOfLines : sizeConfig.height,
            transform: [
              { translateX: shakeAnim },
              { scale: scaleAnim },
            ],
            opacity: editable ? 1 : 0.6,
          },
          style,
        ]}
      >
        {/* Leading Icon */}
        {leadingIcon && (
          <View style={[styles.leadingIcon, { paddingLeft: sizeConfig.padding }]}>
            {React.cloneElement(leadingIcon, {
              color: isFocused ? colors.primary : colors.textTertiary,
              size: sizeConfig.iconSize,
              strokeWidth: 2,
            })}
          </View>
        )}
        
        {/* Input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: stateColors.text,
              ...sizeConfig.typography,
              paddingHorizontal: leadingIcon ? spacing.sm : sizeConfig.padding,
              paddingVertical: sizeConfig.padding,
            },
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          selectionColor={colors.primary}
          {...props}
        />
        
        {/* Trailing Icons */}
        <View style={[styles.trailingIcons, { paddingRight: sizeConfig.padding }]}>
          {/* Validation Icon */}
          {showValidationIcon && !secureTextEntry && (
            <>
              {isValid && !error && value && (
                <View style={[styles.validationIcon, { backgroundColor: colors.successLight }]}>
                  <LucideCheck color={colors.success} size={14} strokeWidth={3} />
                </View>
              )}
              {error && (
                <LucideAlertCircle color={colors.error} size={sizeConfig.iconSize} strokeWidth={2} />
              )}
              {warning && !error && (
                <LucideInfo color={colors.warning} size={sizeConfig.iconSize} strokeWidth={2} />
              )}
            </>
          )}
          
          {/* Clear button */}
          {clearable && value && !secureTextEntry && editable && (
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [
                styles.clearButton,
                {
                  backgroundColor: pressed ? colors.hoverOverlay : colors.surfaceSecondary,
                  borderRadius: borderRadius.full,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.clearText, { color: colors.textSecondary }]}>×</Text>
            </Pressable>
          )}
          
          {/* Password Toggle */}
          {secureTextEntry && (
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={({ pressed }) => [
                styles.passwordToggle,
                {
                  backgroundColor: pressed ? colors.hoverOverlay : 'transparent',
                  borderRadius: borderRadius.sm,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {showPassword ? (
                <LucideEyeOff color={colors.textSecondary} size={sizeConfig.iconSize} strokeWidth={2} />
              ) : (
                <LucideEye color={colors.textSecondary} size={sizeConfig.iconSize} strokeWidth={2} />
              )}
            </Pressable>
          )}
          
          {/* Custom Trailing Icon */}
          {trailingIcon && (
            <View style={styles.customTrailingIcon}>
              {React.cloneElement(trailingIcon, {
                color: colors.textTertiary,
                size: sizeConfig.iconSize,
                strokeWidth: 2,
              })}
            </View>
          )}
        </View>
      </Animated.View>
      
      {/* Helper/Error/Warning Text */}
      {(errorMessage || warningMessage || helperText || maxLength) && (
        <View style={styles.supportingText}>
          <View style={styles.messageContainer}>
            {error && errorMessage ? (
              <Text style={[styles.errorText, { color: colors.error, ...typography.caption }]}>
                {errorMessage}
              </Text>
            ) : warning && warningMessage ? (
              <Text style={[styles.warningText, { color: colors.warning, ...typography.caption }]}>
                {warningMessage}
              </Text>
            ) : helperText ? (
              <Text style={[styles.helperText, { color: colors.textTertiary, ...typography.caption }]}>
                {helperText}
              </Text>
            ) : null}
          </View>
          
          {/* Character Counter */}
          {maxLength && (
            <Text 
              style={[
                styles.counter, 
                { 
                  color: (value?.length || 0) >= maxLength ? colors.error : colors.textTertiary, 
                  ...typography.caption,
                }
              ]}
            >
              {value?.length || 0}/{maxLength}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Search Input - SaaS Style
 */
export const M3SearchInput = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onSubmit,
  style,
  ...props
}) => {
  const { colors, typography, borderRadius, spacing } = useTheme();
  
  return (
    <M3TextField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      leadingIcon={
        <View style={{ opacity: 0.5 }}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
        </View>
      }
      variant={TextFieldVariant.OUTLINED}
      size={TextFieldSize.MEDIUM}
      clearable
      containerStyle={style}
      onSubmitEditing={onSubmit}
      returnKeyType="search"
      {...props}
    />
  );
};

/**
 * Text Area - SaaS Style
 */
export const M3TextArea = ({
  numberOfLines = 4,
  ...props
}) => {
  return (
    <M3TextField
      multiline
      numberOfLines={numberOfLines}
      size={TextFieldSize.LARGE}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {},
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  leadingIcon: {
    marginRight: -4,
  },
  trailingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  validationIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: -2,
  },
  passwordToggle: {
    padding: 4,
  },
  customTrailingIcon: {},
  supportingText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
    paddingTop: 6,
  },
  messageContainer: {
    flex: 1,
  },
  errorText: {},
  warningText: {},
  helperText: {},
  counter: {
    marginLeft: 8,
  },
});

export default M3TextField;
