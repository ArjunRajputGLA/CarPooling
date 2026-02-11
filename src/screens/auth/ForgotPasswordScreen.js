// Forgot Password Screen
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
import { LucideArrowLeft, LucideMail, LucideCheckCircle } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { validateEmail } from '../../utils/validation';
import { 
  CustomInput, 
  LoadingSpinner, 
  Toast, 
  M3Button, 
  ButtonVariant, 
  M3LoadingDialog,
  M3ErrorDialog,
} from '../../components/common';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, spacing, borderRadius, isDark } = useTheme();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [errorDialog, setErrorDialog] = useState({ visible: false, title: '', message: '' });

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
      
      setErrorDialog({ visible: true, title: errorTitle, message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const showToastMessage = (message, type) => {
    setToast({ visible: true, message, type });
  };

  if (sent) {
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
            <LucideCheckCircle size={64} color={colors.secondary} />
          </View>
          
          <Text style={[styles.successTitle, { color: colors.onSurface }]}>Check Your Email</Text>
          
          <Text style={[styles.successText, { color: colors.onSurfaceVariant }]}>
            We've sent a password reset link to:
          </Text>
          <Text style={[styles.emailText, { color: colors.primary }]}>{email}</Text>
          
          <Text style={[styles.instructionText, { color: colors.onSurfaceVariant }]}>
            Click the link in the email to reset your password. 
            If you don't see it, check your spam folder.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.backButtonText, { color: colors.onPrimary }]}>Back to Login</Text>
          </Pressable>

          <Pressable
            style={styles.resendLink}
            onPress={() => {
              setSent(false);
              handleResetPassword();
            }}
          >
            <Text style={[styles.resendLinkText, { color: colors.primary }]}>
              Didn't receive the email? Resend
            </Text>
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
        {/* Back Button */}
        <Pressable
          style={styles.backArrow}
          onPress={() => navigation.goBack()}
        >
          <LucideArrowLeft size={24} color={colors.onSurface} />
        </Pressable>

        {/* Header */}
        <Animated.View style={[
          styles.headerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
            <LucideMail size={40} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            No worries! Enter your email address and we'll send you a link to reset your password.
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
            leftIcon={<LucideMail size={20} color={colors.onSurfaceVariant} />}
          />

          <M3Button
            variant={ButtonVariant.FILLED}
            onPress={handleResetPassword}
            disabled={loading || !email}
            loading={loading}
            style={{ marginTop: 12 }}
          >
            Send Reset Link
          </M3Button>
        </Animated.View>

        {/* Back to Login */}
        <Pressable
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <LucideArrowLeft size={16} color={colors.primary} />
          <Text style={[styles.loginLinkText, { color: colors.primary }]}>Back to Login</Text>
        </Pressable>
      </ScrollView>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      {/* Loading Overlay */}
      <M3LoadingDialog
        visible={loading}
        message="Sending reset link..."
      />
      
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 48,
  },
  backArrow: {
    marginBottom: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  loginLinkText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '500',
  },
  // Success screen styles
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    marginBottom: 6,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  resendLink: {
    marginTop: 24,
  },
  resendLinkText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
