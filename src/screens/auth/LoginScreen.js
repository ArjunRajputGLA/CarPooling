// Complete Login Screen with Material 3 styling
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Animated,
} from 'react-native';
import { LucideCarFront, LucideMail, LucideLock } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { validateEmail } from '../../utils/validation';
import {
  saveRememberedEmail,
  getRememberedEmail,
  clearRememberedEmail,
  isRememberMeEnabled,
} from '../../utils/storage';
import { 
  M3TextField, 
  M3Button, 
  ButtonVariant, 
  M3LoadingDialog,
  M3AccountNotFoundDialog,
  M3IncorrectPasswordDialog,
  M3ErrorDialog,
} from '../../components/common';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const { colors, typography, borderRadius, elevation, spacing, isDark } = useTheme();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // State
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Dialog states
  const [accountNotFoundDialog, setAccountNotFoundDialog] = useState(false);
  const [incorrectPasswordDialog, setIncorrectPasswordDialog] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ visible: false, title: '', message: '' });

  // Load remembered email on mount
  useEffect(() => {
    loadRememberedEmail();
    
    // Start animations
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
    
    Animated.timing(formAnim, {
      toValue: 1,
      duration: 500,
      delay: 200,
      useNativeDriver: true,
    }).start();
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
            // No account found - show enhanced dialog
            setAccountNotFoundDialog(true);
          } else {
            // Account exists but wrong password - show enhanced dialog
            setIncorrectPasswordDialog(true);
          }
        } catch (checkError) {
          // DB check failed, show generic error
          setErrorDialog({
            visible: true,
            title: 'Login Failed',
            message: errorMsg,
          });
        }
      } else {
        // Other errors (network, rate limit, etc.)
        setErrorDialog({
          visible: true,
          title: 'Login Failed',
          message: errorMsg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

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
        {/* Logo */}
        <Animated.View style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primaryContainer }]}>
            <LucideCarFront size={56} color={colors.onPrimaryContainer} />
          </View>
          <Text style={[styles.appName, { color: colors.primary, ...typography.headlineMedium }]}>CarPooling</Text>
        </Animated.View>

        {/* Header */}
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          <Text style={[styles.title, { color: colors.onSurface, ...typography.displaySmall }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant, ...typography.bodyLarge }]}>Sign in to continue your journey</Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View style={[
          styles.formCard,
          {
            backgroundColor: colors.surfaceContainerLow,
            borderRadius: borderRadius.extraLarge,
            opacity: formAnim,
            transform: [{ translateY: formAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }) }],
          },
          elevation.level1,
        ]}>
          {/* Email Input */}
          <M3TextField
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: null });
            }}
            placeholder="Enter your email"
            error={!!errors.email}
            errorMessage={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            leadingIcon={<LucideMail />}
            showValidationIcon
            isValid={email && validateEmail(email)}
          />

          {/* Password Input */}
          <M3TextField
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: null });
            }}
            placeholder="Enter your password"
            error={!!errors.password}
            errorMessage={errors.password}
            secureTextEntry
            leadingIcon={<LucideLock />}
          />

          {/* Remember Me & Forgot Password Row */}
          <View style={styles.optionsRow}>
            <View style={styles.rememberMeContainer}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: colors.surfaceVariant, true: colors.primaryContainer }}
                thumbColor={rememberMe ? colors.primary : colors.outline}
              />
              <Text style={[styles.rememberMeText, { color: colors.onSurfaceVariant, ...typography.bodyMedium }]}>Remember me</Text>
            </View>

            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary, ...typography.labelLarge }]}>Forgot Password?</Text>
            </Pressable>
          </View>

          {/* Login Button */}
          <M3Button
            title="Sign In"
            onPress={handleLogin}
            variant={ButtonVariant.FILLED}
            fullWidth
            disabled={!email || !password}
            loading={loading}
            size="large"
          />
        </Animated.View>

        {/* Register Link */}
        <Pressable
          style={styles.registerLink}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={[styles.registerLinkText, { color: colors.onSurfaceVariant, ...typography.bodyLarge }]}>
            Don't have an account?{' '}
            <Text style={[styles.registerLinkBold, { color: colors.primary }]}>Sign Up</Text>
          </Text>
        </Pressable>
      </ScrollView>

      {/* Loading Dialog */}
      <M3LoadingDialog visible={loading} message="Signing in..." />
      
      {/* Account Not Found Dialog */}
      <M3AccountNotFoundDialog
        visible={accountNotFoundDialog}
        onDismiss={() => setAccountNotFoundDialog(false)}
        onSignUp={() => navigation.navigate('Register')}
        email={email}
      />
      
      {/* Incorrect Password Dialog */}
      <M3IncorrectPasswordDialog
        visible={incorrectPasswordDialog}
        onDismiss={() => setIncorrectPasswordDialog(false)}
        onForgotPassword={() => navigation.navigate('ForgotPassword')}
      />
      
      {/* Generic Error Dialog */}
      <M3ErrorDialog
        visible={errorDialog.visible}
        onDismiss={() => setErrorDialog({ visible: false, title: '', message: '' })}
        title={errorDialog.title}
        message={errorDialog.message}
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
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    marginTop: 12,
    fontWeight: '600',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
  formCard: {
    padding: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 8,
  },
  forgotPasswordText: {
    fontWeight: '500',
  },
  registerLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  registerLinkText: {},
  registerLinkBold: {
    fontWeight: '600',
  },
});
