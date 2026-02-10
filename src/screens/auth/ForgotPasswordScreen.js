// Forgot Password Screen
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
import { LucideArrowLeft, LucideMail, LucideCheckCircle } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { validateEmail } from '../../utils/validation';
import { CustomInput, LoadingSpinner, Toast } from '../../components/common';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  const handleResetPassword = async () => {
    // Validate email
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const redirectUrl = Linking.createURL('reset-password');
      console.log('Reset password redirect URL:', redirectUrl);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (resetError) throw resetError;

      setSent(true);
      showToastMessage('Password reset email sent!', 'success');

    } catch (err) {
      console.error('Reset password error:', err);
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      let errorTitle = 'Reset Failed';
      
      if (err.message?.includes('4 seconds') || err.message?.includes('after 4')) {
        errorTitle = 'Please Wait';
        errorMessage = 'For security purposes, you can only request a password reset after 4 seconds. Please wait and try again.';
      } else if (err.message?.includes('60 seconds') || err.message?.includes('rate limit')) {
        errorTitle = 'Too Many Requests';
        errorMessage = 'Please wait 60 seconds before requesting another reset email.';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorTitle = 'Connection Error';
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert(
        errorTitle,
        errorMessage,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    } finally {
      setLoading(false);
    }
  };

  const showToastMessage = (message, type) => {
    setToast({ visible: true, message, type });
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <LucideCheckCircle size={64} color={COLORS.success} />
          </View>
          
          <Text style={styles.successTitle}>Check Your Email</Text>
          
          <Text style={styles.successText}>
            We've sent a password reset link to:
          </Text>
          <Text style={styles.emailText}>{email}</Text>
          
          <Text style={styles.instructionText}>
            Click the link in the email to reset your password. 
            If you don't see it, check your spam folder.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendLink}
            onPress={() => {
              setSent(false);
              handleResetPassword();
            }}
          >
            <Text style={styles.resendLinkText}>
              Didn't receive the email? Resend
            </Text>
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
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backArrow}
          onPress={() => navigation.goBack()}
        >
          <LucideArrowLeft size={24} color={COLORS.text.primary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <LucideMail size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your email address and we'll send you a link to reset your password.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <CustomInput
            label="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            placeholder="Enter your email"
            error={error}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<LucideMail size={20} color={COLORS.gray[500]} />}
          />

          <TouchableOpacity
            style={[
              styles.resetButton,
              !email && styles.resetButtonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={loading || !email}
          >
            {loading ? (
              <LoadingSpinner visible size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.resetButtonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Back to Login */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <LucideArrowLeft size={16} color={COLORS.primary} />
          <Text style={styles.loginLinkText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      {/* Loading Overlay */}
      <LoadingSpinner
        visible={loading}
        message="Sending reset link..."
        overlay
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.light,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
    paddingTop: SPACING.xxxl,
  },
  backArrow: {
    marginBottom: SPACING.xl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  resetButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: SPACING.md,
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
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xxl,
  },
  loginLinkText: {
    marginLeft: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  // Success screen styles
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
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  successText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  emailText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.lg,
  },
  instructionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xxl,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxxl,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  resendLink: {
    marginTop: SPACING.xl,
  },
  resendLinkText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
