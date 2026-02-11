// Custom Input Component with validation
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LucideEye, LucideEyeOff, LucideCheck, LucideX } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const CustomInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  isValid,
  required = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  maxLength,
  editable = true,
  leftIcon,
  rightIcon,
  showValidationIcon = false,
  onBlur,
  onFocus,
  style,
  inputStyle,
  ...props
}) => {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus && onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur && onBlur();
  };

  const getBorderColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.primary;
    if (isValid && showValidationIcon) return colors.success;
    return colors.outline;
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    labelContainer: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    label: {
      fontSize: typography.labelMedium.fontSize,
      fontWeight: typography.labelMedium.fontWeight,
      color: colors.onSurface,
      ...typography.labelMedium,
    },
    required: {
      color: colors.error,
      marginLeft: 2,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceContainerHighest,
      minHeight: 48,
    },
    inputFocused: {
      borderWidth: 2,
    },
    inputError: {
      borderColor: colors.error,
    },
    inputDisabled: {
      backgroundColor: colors.surfaceContainerHigh,
      opacity: 0.5,
    },
    input: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: typography.bodyLarge.fontSize,
      color: colors.onSurface,
      minHeight: 48,
      ...typography.bodyLarge,
    },
    inputWithLeftIcon: {
      paddingLeft: spacing.xs,
    },
    inputWithRightIcon: {
      paddingRight: spacing.xs,
    },
    multilineInput: {
      textAlignVertical: 'top',
      paddingTop: spacing.md,
    },
    leftIcon: {
      paddingLeft: spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rightIcon: {
      paddingRight: spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      color: colors.error,
      fontSize: typography.labelSmall.fontSize,
      marginTop: spacing.xs,
      ...typography.labelSmall,
    },
    charCount: {
      color: colors.onSurfaceVariant,
      fontSize: typography.labelSmall.fontSize,
      textAlign: 'right',
      marginTop: spacing.xs,
      ...typography.labelSmall,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.required}>*</Text>}
        </View>
      )}
      
      <View style={[
        styles.inputContainer,
        // borderColor handled by styles.inputContainer now dynamically or via override
        { borderColor: getBorderColor() },
        isFocused && styles.inputFocused,
        error && styles.inputError,
        multiline && { minHeight: numberOfLines * 24 + 24, alignItems: 'flex-start' }, /* Improved multiline height */
        !editable && styles.inputDisabled,
      ]}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || secureTextEntry || showValidationIcon) && styles.inputWithRightIcon,
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {/* Password toggle */}
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <LucideEyeOff size={20} color={colors.onSurfaceVariant} />
            ) : (
              <LucideEye size={20} color={colors.onSurfaceVariant} />
            )}
          </TouchableOpacity>
        )}
        
        {/* Validation icon */}
        {showValidationIcon && !secureTextEntry && value && (
          <View style={styles.rightIcon}>
            {isValid ? (
              <LucideCheck size={20} color={colors.success} />
            ) : error ? (
              <LucideX size={20} color={colors.error} />
            ) : null}
          </View>
        )}
        
        {/* Custom right icon */}
        {rightIcon && !secureTextEntry && !showValidationIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {/* Error message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      {/* Character count for multiline */}
      {multiline && maxLength && (
        <Text style={styles.charCount}>
          {value?.length || 0}/{maxLength}
        </Text>
      )}
    </View>
  );
};

export default CustomInput;
