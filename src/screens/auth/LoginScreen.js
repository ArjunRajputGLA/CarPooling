// Complete Login Screen with remember me and role-based navigation
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { LucideCarFront, LucideMail, LucideLock } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { validateEmail } from '../../utils/validation';
import {
  saveRememberedEmail,
  getRememberedEmail,
  clearRememberedEmail,
  isRememberMeEnabled,
} from '../../utils/storage';
import { CustomInput, LoadingSpinner } from '../../components/common';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // State
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load remembered email on mount
  useEffect(() => {
    loadRememberedEmail();
  }, []);

  const loadRememberedEmail = async () => {
    const remembered = await getRememberedEmail();
    const isEnabled = await isRememberMeEnabled();
    
    if (remembered) {
      setEmail(remembered);
      setRememberMe(isEnabled);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Please enter your password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      await signIn(email.toLowerCase().trim(), password);

      // Save or clear remembered email based on toggle
      if (rememberMe) {
        await saveRememberedEmail(email.toLowerCase().trim());
      } else {
        await clearRememberedEmail();
      }

      // Navigation is handled by AuthContext after successful login

    } catch (error) {
      console.error('Login error:', error);
      
      // Clear password on failure
      setPassword('');

      const errorMsg = error.message || '';
      
      // Check if user doesn't exist (Supabase returns same error for wrong password & no account)
      if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('credentials')) {
        try {
          const { data: existingUser } = await supabase
            .from('users')
            .select('email')
            .eq('email', email.toLowerCase().trim())
            .single();

          if (!existingUser) {
            // No account found - prompt to sign up
            Alert.alert(
              'Account Not Found',
              'No account exists with this email address. Would you like to create one?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Sign Up', 
                  onPress: () => navigation.navigate('Register'),
                  style: 'default',
                },
              ],
              { cancelable: true }
            );
          } else {
            // Account exists but wrong password
            Alert.alert(
              'Incorrect Password',
              'The password you entered is incorrect. Please try again or reset your password.',
              [
                { text: 'Try Again', style: 'cancel' },
                { 
                  text: 'Forgot Password?', 
                  onPress: () => navigation.navigate('ForgotPassword'),
                },
              ],
              { cancelable: true }
            );
          }
        } catch (checkError) {
          // DB check failed, show generic error
          Alert.alert(
            'Login Failed',
            errorMsg,
            [{ text: 'OK' }],
            { cancelable: true }
          );
        }
      } else {
        // Other errors (network, rate limit, etc.)
        Alert.alert(
          'Login Failed',
          errorMsg,
          [{ text: 'OK' }],
          { cancelable: true }
        );
      }
    } finally {
      setLoading(false);
    }
  };

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
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <LucideCarFront size={56} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>CarPooling</Text>
        </View>

        {/* Header */}
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue your journey</Text>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Email Input */}
          <CustomInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: null });
            }}
            placeholder="Enter your email"
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<LucideMail size={20} color={COLORS.gray[500]} />}
          />

          {/* Password Input */}
          <CustomInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: null });
            }}
            placeholder="Enter your password"
            error={errors.password}
            secureTextEntry
            leftIcon={<LucideLock size={20} color={COLORS.gray[500]} />}
          />

          {/* Remember Me & Forgot Password Row */}
          <View style={styles.optionsRow}>
            <View style={styles.rememberMeContainer}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primaryLight }}
                thumbColor={rememberMe ? COLORS.primary : COLORS.gray[100]}
              />
              <Text style={styles.rememberMeText}>Remember me</Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              (!email || !password) && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? (
              <LoadingSpinner visible size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Register Link */}
        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.registerLinkText}>
            Don't have an account?{' '}
            <Text style={styles.registerLinkBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Loading Overlay */}
      <LoadingSpinner
        visible={loading}
        message="Signing in..."
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
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  appName: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
    marginTop: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  forgotPasswordText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...SHADOWS.md,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  registerLink: {
    marginTop: SPACING.xxl,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
  },
  registerLinkBold: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
