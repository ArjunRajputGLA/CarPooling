import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { LucideLock, LucideCheckCircle, LucideShieldCheck } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { checkPasswordStrength } from '../../utils/validation';
import { 
  CustomInput, 
  PasswordStrengthIndicator, 
  M3Button,
  ButtonVariant,
  M3LoadingDialog,
  M3ErrorDialog,
} from '../../components/common';

export default function ResetPasswordScreen({ navigation }) {
  const { updatePassword, signOut } = useAuth();
  const { colors, spacing, borderRadius, isDark } = useTheme();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ visible: false, title: '', message: '' });

  const passwordStrength = checkPasswordStrength(newPassword);

  // Animation effect
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

      setErrorDialog({ visible: true, title: 'Reset Failed', message: errorMessage });
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View style={[
          styles.successContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          <View style={styles.successIcon}>
            <LucideCheckCircle size={72} color={colors.secondary} />
          </View>

          <Text style={[styles.successTitle, { color: colors.onSurface }]}>Password Reset!</Text>
          <Text style={[styles.successText, { color: colors.onSurfaceVariant }]}>
            Your password has been successfully updated.{'\n'}You can now sign in
            with your new password.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={handleBackToLogin}
          >
            <Text style={[styles.loginButtonText, { color: colors.onPrimary }]}>Back to Login</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View style={[
          styles.headerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
            <LucideShieldCheck size={44} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Set New Password</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Create a strong password that you don't use for other accounts.
          </Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View style={[
          styles.formCard,
          {
            backgroundColor: colors.surface,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
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
            leftIcon={<LucideLock size={20} color={colors.onSurfaceVariant} />}
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
            leftIcon={<LucideLock size={20} color={colors.onSurfaceVariant} />}
          />

          {/* Password Requirements */}
          <View style={[styles.requirementsContainer, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.requirementsTitle, { color: colors.onSurface }]}>Password must have:</Text>
            <RequirementItem met={passwordStrength.hasMinLength} text="At least 8 characters" colors={colors} />
            <RequirementItem met={passwordStrength.hasUpperCase} text="One uppercase letter" colors={colors} />
            <RequirementItem met={passwordStrength.hasLowerCase} text="One lowercase letter" colors={colors} />
            <RequirementItem met={passwordStrength.hasNumber} text="One number" colors={colors} />
            <RequirementItem met={passwordStrength.hasSpecial} text="One special character (recommended)" optional colors={colors} />
          </View>

          {/* Submit Button */}
          <M3Button
            variant={ButtonVariant.FILLED}
            onPress={handleResetPassword}
            disabled={loading || !passwordStrength.isValid || !confirmPassword}
            loading={loading}
            style={{ marginTop: 8 }}
          >
            Reset Password
          </M3Button>
        </Animated.View>
      </ScrollView>

      {/* Loading Dialog */}
      <M3LoadingDialog visible={loading} message="Updating password..." />
      
      {/* Error Dialog */}
      <M3ErrorDialog
        visible={errorDialog.visible}
        title={errorDialog.title}
        message={errorDialog.message}
        onDismiss={() => setErrorDialog({ visible: false, title: '', message: '' })}
      />
    </KeyboardAvoidingView>
  );
}

// Requirement checklist item
const RequirementItem = ({ met, text, optional, colors }) => (
  <View style={styles.requirementRow}>
    <View
      style={[
        styles.requirementDot,
        { backgroundColor: met ? colors.secondary : colors.outline },
      ]}
    />
    <Text
      style={[
        styles.requirementText,
        { color: met ? colors.secondary : colors.onSurfaceVariant },
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
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 72,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requirementsContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
    marginRight: 8,
  },
  requirementText: {
    fontSize: 14,
  },
  requirementOptional: {
    fontStyle: 'italic',
  },
  resetButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resetButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Success screen
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  loginButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
