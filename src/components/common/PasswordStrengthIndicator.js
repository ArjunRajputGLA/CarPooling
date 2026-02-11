// Password Strength Indicator Component - Material Design 3
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LucideCheck, LucideX, LucideShieldCheck, LucideShield, LucideShieldAlert } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const PasswordStrengthIndicator = ({ password, showRequirements = true }) => {
  const { colors, spacing, borderRadius, typography, animation } = useTheme();
  const widthAnim = useRef(new Animated.Value(0)).current;

  const checks = {
    hasMinLength: password?.length >= 8,
    hasUpperCase: /[A-Z]/.test(password || ''),
    hasLowerCase: /[a-z]/.test(password || ''),
    hasNumber: /[0-9]/.test(password || ''),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password || ''),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  
  let strength = 'Weak';
  let strengthColor = colors.error;
  let widthPercent = 25;
  let StrengthIcon = LucideShieldAlert;
  
  if (passedChecks >= 5) {
    strength = 'Very Strong';
    strengthColor = colors.success;
    widthPercent = 100;
    StrengthIcon = LucideShieldCheck;
  } else if (passedChecks >= 4) {
    strength = 'Strong';
    strengthColor = colors.success;
    widthPercent = 80;
    StrengthIcon = LucideShieldCheck;
  } else if (passedChecks >= 3) {
    strength = 'Medium';
    strengthColor = colors.tertiary;
    widthPercent = 60;
    StrengthIcon = LucideShield;
  } else if (passedChecks >= 2) {
    strength = 'Weak';
    strengthColor = colors.error;
    widthPercent = 40;
    StrengthIcon = LucideShieldAlert;
  }

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: widthPercent,
      duration: animation.duration.medium1,
      useNativeDriver: false,
    }).start();
  }, [widthPercent]);

  const requirements = [
    { key: 'hasMinLength', label: 'At least 8 characters', met: checks.hasMinLength },
    { key: 'hasUpperCase', label: 'One uppercase letter', met: checks.hasUpperCase },
    { key: 'hasLowerCase', label: 'One lowercase letter', met: checks.hasLowerCase },
    { key: 'hasNumber', label: 'One number', met: checks.hasNumber },
    { key: 'hasSpecial', label: 'One special character (recommended)', met: checks.hasSpecial },
  ];

  if (!password) return null;

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { marginTop: spacing.sm }]}>
      {/* Strength Bar */}
      <View style={[styles.strengthBarContainer, { marginBottom: spacing.sm }]}>
        <View style={[
          styles.strengthBarBackground, 
          { 
            backgroundColor: colors.surfaceContainerHighest,
            borderRadius: borderRadius.full,
            marginRight: spacing.md,
          }
        ]}>
          <Animated.View style={[
            styles.strengthBar, 
            { 
              width: animatedWidth, 
              backgroundColor: strengthColor,
              borderRadius: borderRadius.full,
            }
          ]} />
        </View>
        <View style={styles.strengthLabelContainer}>
          <StrengthIcon size={14} color={strengthColor} />
          <Text style={[
            styles.strengthText, 
            { 
              color: strengthColor,
              marginLeft: spacing.xs,
              ...typography.labelSmall,
            }
          ]}>
            {strength}
          </Text>
        </View>
      </View>

      {/* Requirements List */}
      {showRequirements && (
        <View style={[styles.requirementsList, { marginTop: spacing.xs }]}>
          {requirements.map((req, index) => (
            <RequirementItem 
              key={req.key} 
              req={req} 
              index={index}
              colors={colors}
              spacing={spacing}
              typography={typography}
              animation={animation}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const RequirementItem = ({ req, index, colors, spacing, typography, animation }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: req.met ? 1 : 0.8,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
      delay: index * 50,
    }).start();
  }, [req.met]);

  return (
    <Animated.View 
      style={[
        styles.requirementItem, 
        { 
          marginBottom: spacing.xs,
          transform: [{ scale: scaleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.95, 1],
          }) }],
        }
      ]}
    >
      <View style={[
        styles.checkIconContainer,
        {
          backgroundColor: req.met ? colors.primaryContainer : colors.surfaceContainerHighest,
          borderRadius: 10,
        }
      ]}>
        {req.met ? (
          <LucideCheck size={12} color={colors.primary} strokeWidth={3} />
        ) : (
          <LucideX size={12} color={colors.outline} strokeWidth={2} />
        )}
      </View>
      <Text style={[
        styles.requirementText,
        {
          color: req.met ? colors.onSurface : colors.onSurfaceVariant,
          marginLeft: spacing.sm,
          ...typography.bodySmall,
        }
      ]}>
        {req.label}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {},
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strengthBarBackground: {
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
  },
  strengthLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
  },
  strengthText: {
    fontWeight: '600',
  },
  requirementsList: {},
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requirementText: {},
});

export default PasswordStrengthIndicator;
