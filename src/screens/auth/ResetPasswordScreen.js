import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LucideLock, LucideCheckCircle, LucideShieldCheck } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { checkPasswordStrength } from '../../utils/validation';
import { CustomInput, PasswordStrengthIndicator, LoadingSpinner } from '../../components/common';

export default function ResetPasswordScreen({ navigation }) {
  const { updatePassword, signOut } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const passwordStrength = checkPasswordStrength(newPassword);

  const validateForm = () => {
    const newErrors = {};

    if (!newPassword) {
      newErrors.newPassword = 'Please enter a new password';
    } else if (!passwordStrength.isValid) {
      newErrors.newPassword = 'Password does not meet requirements';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      await updatePassword(newPassword);
      setSuccess(true);
    } catch (error) {
      console.error('Reset password error:', error);

      let errorMessage = 'Failed to reset password. Please try again.';
      if (error.message?.includes('same password')) {
        errorMessage = 'New password must be different from your current password.';
      } else if (error.message?.includes('session')) {
        errorMessage = 'Your reset link has expired. Please request a new one.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Reset Failed', errorMessage, [{ text: 'OK' }], {
        cancelable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      await signOut();
    } catch (e) {
      // ignore
    }
    // Navigation will auto-switch to Login since session is cleared
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <LucideCheckCircle size={72} color={COLORS.success} />
          </View>

          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successText}>
            Your password has been successfully updated.{'\n'}You can now sign in
            with your new password.
          </Text>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleBackToLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <LucideShieldCheck size={44} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Create a strong password that you don't use for other accounts.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* New Password */}
          <CustomInput
            label="New Password"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (errors.newPassword) setErrors({ ...errors, newPassword: null });
            }}
            placeholder="Enter new password"
            secureTextEntry
            error={errors.newPassword}
            leftIcon={<LucideLock size={20} color={COLORS.gray[500]} />}
          />

          {/* Password Strength */}
          {newPassword.length > 0 && (
            <PasswordStrengthIndicator password={newPassword} />
          )}

          {/* Confirm Password */}
          <CustomInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword)
                setErrors({ ...errors, confirmPassword: null });
            }}
            placeholder="Confirm new password"
            secureTextEntry
            error={errors.confirmPassword}
            leftIcon={<LucideLock size={20} color={COLORS.gray[500]} />}
          />

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password must have:</Text>
            <RequirementItem met={passwordStrength.hasMinLength} text="At least 8 characters" />
            <RequirementItem met={passwordStrength.hasUpperCase} text="One uppercase letter" />
            <RequirementItem met={passwordStrength.hasLowerCase} text="One lowercase letter" />
            <RequirementItem met={passwordStrength.hasNumber} text="One number" />
            <RequirementItem met={passwordStrength.hasSpecial} text="One special character (recommended)" optional />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.resetButton,
              (!passwordStrength.isValid || !confirmPassword) &&
                styles.resetButtonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={loading || !passwordStrength.isValid || !confirmPassword}
            activeOpacity={0.8}
          >
            {loading ? (
              <LoadingSpinner visible size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.resetButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      <LoadingSpinner visible={loading} message="Updating password..." overlay />
    </KeyboardAvoidingView>
  );
}

// Requirement checklist item
const RequirementItem = ({ met, text, optional }) => (
  <View style={styles.requirementRow}>
    <View
      style={[
        styles.requirementDot,
        met ? styles.requirementMet : styles.requirementUnmet,
      ]}
    />
    <Text
      style={[
        styles.requirementText,
        met && styles.requirementTextMet,
        optional && !met && styles.requirementOptional,
      ]}
    >
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.light,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
    paddingTop: SPACING.xxxl + SPACING.xl,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  requirementsContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
  },
  requirementsTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  requirementMet: {
    backgroundColor: COLORS.success,
  },
  requirementUnmet: {
    backgroundColor: COLORS.gray[300],
  },
  requirementText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  requirementTextMet: {
    color: COLORS.success,
  },
  requirementOptional: {
    fontStyle: 'italic',
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: SPACING.sm,
    ...SHADOWS.md,
  },
  resetButtonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  // Success screen
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  successIcon: {
    marginBottom: SPACING.xl,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  successText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxxl * 1.5,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.md,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
