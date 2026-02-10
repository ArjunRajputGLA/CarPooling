// Password Strength Indicator Component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideCheck, LucideX } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../constants/theme';

const PasswordStrengthIndicator = ({ password, showRequirements = true }) => {
  const checks = {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  
  let strength = 'Weak';
  let color = COLORS.passwordStrength.weak;
  let width = '25%';
  
  if (passedChecks >= 5) {
    strength = 'Very Strong';
    color = COLORS.passwordStrength.strong;
    width = '100%';
  } else if (passedChecks >= 4) {
    strength = 'Strong';
    color = COLORS.passwordStrength.strong;
    width = '80%';
  } else if (passedChecks >= 3) {
    strength = 'Medium';
    color = COLORS.passwordStrength.medium;
    width = '60%';
  } else if (passedChecks >= 2) {
    strength = 'Weak';
    color = COLORS.passwordStrength.weak;
    width = '40%';
  }

  const requirements = [
    { key: 'hasMinLength', label: 'At least 8 characters', met: checks.hasMinLength },
    { key: 'hasUpperCase', label: 'One uppercase letter', met: checks.hasUpperCase },
    { key: 'hasLowerCase', label: 'One lowercase letter', met: checks.hasLowerCase },
    { key: 'hasNumber', label: 'One number', met: checks.hasNumber },
    { key: 'hasSpecial', label: 'One special character (recommended)', met: checks.hasSpecial },
  ];

  if (!password) return null;

  return (
    <View style={styles.container}>
      {/* Strength Bar */}
      <View style={styles.strengthBarContainer}>
        <View style={styles.strengthBarBackground}>
          <View style={[styles.strengthBar, { width, backgroundColor: color }]} />
        </View>
        <Text style={[styles.strengthText, { color }]}>{strength}</Text>
      </View>

      {/* Requirements List */}
      {showRequirements && (
        <View style={styles.requirementsList}>
          {requirements.map((req) => (
            <View key={req.key} style={styles.requirementItem}>
              {req.met ? (
                <LucideCheck size={14} color={COLORS.success} />
              ) : (
                <LucideX size={14} color={COLORS.gray[400]} />
              )}
              <Text style={[
                styles.requirementText,
                req.met && styles.requirementMet,
              ]}>
                {req.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.xs,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  strengthBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.md,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  strengthText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    minWidth: 80,
    textAlign: 'right',
  },
  requirementsList: {
    marginTop: SPACING.xs,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  requirementText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.gray[500],
    marginLeft: SPACING.xs,
  },
  requirementMet: {
    color: COLORS.success,
  },
});

export default PasswordStrengthIndicator;
