// Complete Registration Screen with Material 3 styling
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LucideCarFront, LucideUser, LucideMail, LucideLock, LucidePhone, LucideMapPin, LucideAlertCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import {
  validateEmail,
  validatePhone,
  validateName,
  checkPasswordStrength,
  validateAddress,
} from '../../utils/validation';
import { uploadProfilePicture } from '../../utils/imageHelpers';
import {
  PhoneInput,
  PasswordStrengthIndicator,
  ProfilePictureUpload,
  Toast,
  M3TextField,
  M3Button,
  ButtonVariant,
  M3LoadingDialog,
  CustomInput,
  LoadingSpinner,
  M3ErrorDialog,
  M3SuccessDialog,
  M3ConfirmDialog,
} from '../../components/common';

// Driver email constant
const DRIVER_EMAIL = 'imstorm23203@gmail.com';

export default function RegisterScreen({ navigation }) {
  const { colors, typography, borderRadius, elevation, spacing, isDark } = useTheme();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  // Required fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Optional fields
  const [profileImage, setProfileImage] = useState(null);
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyCountryCode, setEmergencyCountryCode] = useState('+91');
  const [homeAddress, setHomeAddress] = useState('');

  // Validation states
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Loading states
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  
  // Dialog states
  const [errorDialog, setErrorDialog] = useState({ visible: false, title: '', message: '' });
  const [successDialog, setSuccessDialog] = useState({ visible: false, role: '' });
  const [accountExistsDialog, setAccountExistsDialog] = useState(false);
  const [validationErrorDialog, setValidationErrorDialog] = useState(false);

  // Validate fields in real-time
  useEffect(() => {
    const newErrors = {};

    // Full Name validation
    if (touched.fullName) {
      if (!fullName.trim()) {
        newErrors.fullName = 'Please enter your full name';
      } else if (!validateName(fullName)) {
        newErrors.fullName = 'Name must be at least 2 characters with only letters';
      }
    }

    // Email validation
    if (touched.email) {
      if (!email.trim()) {
        newErrors.email = 'Please enter your email address';
      } else if (!validateEmail(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Phone validation
    if (touched.phone) {
      if (!phone.trim()) {
        newErrors.phone = 'Please enter your phone number';
      } else if (!validatePhone(phone)) {
        newErrors.phone = 'Phone must be 10 digits starting with 6-9';
      }
    }

    // Password validation
    if (touched.password) {
      const strength = checkPasswordStrength(password);
      if (!password) {
        newErrors.password = 'Please enter a password';
      } else if (!strength.isValid) {
        newErrors.password = 'Password does not meet requirements';
      }
    }

    // Confirm password validation
    if (touched.confirmPassword) {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Emergency contact phone validation (only if provided)
    if (emergencyContactPhone && touched.emergencyContactPhone) {
      if (!validatePhone(emergencyContactPhone)) {
        newErrors.emergencyContactPhone = 'Please enter a valid phone number';
      }
    }

    // Address validation
    if (homeAddress && touched.homeAddress) {
      if (!validateAddress(homeAddress)) {
        newErrors.homeAddress = 'Address must be less than 200 characters';
      }
    }

    setErrors(newErrors);
  }, [fullName, email, phone, password, confirmPassword, emergencyContactPhone, homeAddress, touched]);

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

  // Check if email already exists
  const checkEmailExists = async (emailToCheck) => {
    if (!validateEmail(emailToCheck)) return;
    
    setCheckingEmail(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('email', emailToCheck.toLowerCase())
        .single();

      if (data) {
        setErrors(prev => ({
          ...prev,
          email: 'This email is already registered. Please login instead.',
        }));
      }
    } catch (e) {
      // No user found, email is available
    } finally {
      setCheckingEmail(false);
    }
  };

  // Check if phone already exists
  const checkPhoneExists = async (phoneToCheck) => {
    if (!validatePhone(phoneToCheck)) return;
    
    try {
      const { data } = await supabase
        .from('users')
        .select('phone')
        .eq('phone', phoneToCheck)
        .single();

      if (data) {
        setErrors(prev => ({
          ...prev,
          phone: 'This phone number is already registered',
        }));
      }
    } catch (e) {
      // No user found, phone is available
    }
  };

  // Handle field blur
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (field === 'email' && email) {
      checkEmailExists(email);
    }
    if (field === 'phone' && phone) {
      checkPhoneExists(phone);
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    const passwordStrength = checkPasswordStrength(password);
    return (
      validateName(fullName) &&
      validateEmail(email) &&
      validatePhone(phone) &&
      passwordStrength.isValid &&
      password === confirmPassword &&
      Object.keys(errors).length === 0
    );
  };

  // Handle registration
  const handleRegister = async () => {
    // Mark all required fields as touched
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid()) {
      setValidationErrorDialog(true);
      return;
    }

    setLoading(true);

    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: email.toLowerCase().trim() === DRIVER_EMAIL ? 'driver' : 'passenger',
          },
          // Skip email confirmation
          emailRedirectTo: undefined,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Check if session exists (email confirmation disabled)
      const hasSession = !!authData.session;

      const userId = authData.user.id;
      let profilePictureUrl = null;

      // 2. Upload profile picture if provided
      if (profileImage) {
        setImageLoading(true);
        const uploadResult = await uploadProfilePicture(userId, profileImage);
        setImageLoading(false);
        
        if (uploadResult.success) {
          profilePictureUrl = uploadResult.url;
        } else {
          // Show warning but continue with registration
          showToastMessage('Profile picture upload failed. You can add it later.', 'warning');
        }
      }

      // 3. Determine role based on email
      const role = email.toLowerCase().trim() === DRIVER_EMAIL ? 'driver' : 'passenger';

      // 4. Insert user data into public.users table (only columns that exist)
      const userData = {
        id: userId,
        email: email.toLowerCase().trim(),
        full_name: fullName.trim(),
        phone: phone,
        role: role,
        profile_picture_url: profilePictureUrl,
        emergency_contact_name: emergencyContactName.trim() || null,
        emergency_contact_phone: emergencyContactPhone ? `${emergencyCountryCode}${emergencyContactPhone}` : null,
        home_address: homeAddress.trim() || null,
      };

      const { error: profileError } = await supabase
        .from('users')
        .upsert(userData);

      if (profileError) {
        console.error('Profile insert error:', profileError);
        // Don't throw here, the trigger might have already created the user
      }

      // 5. Show success message
      setSuccessDialog({ visible: true, role });

      // If session exists, user is already logged in (email confirmation disabled)
      // The auth state listener in AuthContext will handle navigation automatically
      // No need to navigate manually

    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message?.includes('already registered') || error.message?.includes('already been registered') || error.message?.includes('already exists') || error.message?.includes('User already registered')) {
        setAccountExistsDialog(true);
        return;
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message?.includes('Password')) {
        errorMessage = error.message;
      } else if (error.code === '42501') {
        // RLS policy error - profile creation failed but user was created
        setSuccessDialog({ visible: true, role: 'passenger', needsLogin: true });
        return;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrorDialog({
        visible: true,
        title: 'Registration Failed',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Show toast message
  const showToastMessage = (message, type) => {
    setToast({ visible: true, message, type });
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
            <LucideCarFront size={48} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>CarPooling</Text>
        </Animated.View>

        {/* Header */}
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          <Text style={[styles.title, { color: colors.onSurface }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>Join our carpooling community</Text>
        </Animated.View>

        {/* Profile Picture */}
        <ProfilePictureUpload
          imageUri={profileImage}
          onImageSelected={setProfileImage}
          onRemoveImage={() => setProfileImage(null)}
          size={100}
          loading={imageLoading}
        />

        {/* Required Fields Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Required Information</Text>

          {/* Full Name */}
          <CustomInput
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            error={touched.fullName && errors.fullName}
            isValid={touched.fullName && validateName(fullName) && !errors.fullName}
            required
            showValidationIcon
            autoCapitalize="words"
            onBlur={() => handleBlur('fullName')}
          />

          {/* Email */}
          <CustomInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            error={touched.email && errors.email}
            isValid={touched.email && validateEmail(email) && !errors.email}
            required
            showValidationIcon
            keyboardType="email-address"
            autoCapitalize="none"
            onBlur={() => handleBlur('email')}
          />

          {/* Phone Number */}
          <PhoneInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            countryCode={countryCode}
            onChangeCountryCode={setCountryCode}
            error={touched.phone && errors.phone}
            isValid={touched.phone && validatePhone(phone) && !errors.phone}
            required
            onBlur={() => handleBlur('phone')}
          />

          {/* Password */}
          <CustomInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            error={touched.password && errors.password}
            required
            secureTextEntry
            onBlur={() => handleBlur('password')}
          />
          {password && <PasswordStrengthIndicator password={password} />}

          {/* Confirm Password */}
          <CustomInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            error={touched.confirmPassword && errors.confirmPassword}
            isValid={touched.confirmPassword && password === confirmPassword && confirmPassword.length > 0}
            required
            secureTextEntry
            showValidationIcon
            onBlur={() => handleBlur('confirmPassword')}
          />
        </View>

        {/* Optional Fields Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Optional Information</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.onSurfaceVariant }]}>
            This information helps us keep you safe
          </Text>

          {/* Emergency Contact Name */}
          <CustomInput
            label="Emergency Contact Name"
            value={emergencyContactName}
            onChangeText={setEmergencyContactName}
            placeholder="Emergency contact's name"
            autoCapitalize="words"
          />

          {/* Emergency Contact Phone */}
          <PhoneInput
            label="Emergency Contact Phone"
            value={emergencyContactPhone}
            onChangeText={setEmergencyContactPhone}
            countryCode={emergencyCountryCode}
            onChangeCountryCode={setEmergencyCountryCode}
            error={touched.emergencyContactPhone && errors.emergencyContactPhone}
            isValid={emergencyContactPhone && validatePhone(emergencyContactPhone)}
            onBlur={() => handleBlur('emergencyContactPhone')}
          />

          {/* Home Address */}
          <CustomInput
            label="Home Address"
            value={homeAddress}
            onChangeText={setHomeAddress}
            placeholder="Enter your home address"
            error={touched.homeAddress && errors.homeAddress}
            multiline
            numberOfLines={3}
            maxLength={200}
            onBlur={() => handleBlur('homeAddress')}
          />
        </View>

        {/* Sign Up Button */}
        <M3Button
          variant={ButtonVariant.FILLED}
          onPress={handleRegister}
          disabled={loading || !isFormValid()}
          loading={loading}
          style={{ marginTop: 8 }}
          title="Sign Up"
        />

        {/* Login Link */}
        <Pressable
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.loginLinkText, { color: colors.onSurfaceVariant }]}>
            Already have an account?{' '}
            <Text style={[styles.loginLinkBold, { color: colors.primary }]}>Login</Text>
          </Text>
        </Pressable>
      </ScrollView>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      {/* Loading Dialog */}
      <M3LoadingDialog
        visible={loading}
        message="Creating your account..."
      />
      
      {/* Validation Error Dialog */}
      <M3ErrorDialog
        visible={validationErrorDialog}
        onDismiss={() => setValidationErrorDialog(false)}
        title="Validation Error"
        message="Please fix all the errors in the form before submitting."
      />
      
      {/* Generic Error Dialog */}
      <M3ErrorDialog
        visible={errorDialog.visible}
        onDismiss={() => setErrorDialog({ visible: false, title: '', message: '' })}
        title={errorDialog.title}
        message={errorDialog.message}
      />
      
      {/* Success Dialog */}
      <M3SuccessDialog
        visible={successDialog.visible}
        onDismiss={() => {
          setSuccessDialog({ visible: false, role: '' });
          if (successDialog.needsLogin) {
            navigation.navigate('Login');
          }
        }}
        title="Registration Successful! 🎉"
        message={`Welcome to CarPooling! You are registered as a ${successDialog.role}.`}
        autoDismiss={false}
      />
      
      {/* Account Exists Dialog */}
      <M3ConfirmDialog
        visible={accountExistsDialog}
        onDismiss={() => setAccountExistsDialog(false)}
        onConfirm={() => {
          setAccountExistsDialog(false);
          navigation.navigate('Login');
        }}
        title="Account Already Exists"
        message="An account with this email is already registered. Please sign in instead."
        confirmLabel="Go to Login"
        cancelLabel="Cancel"
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
    paddingBottom: 48,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  signUpButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signUpButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 16,
  },
  loginLinkBold: {
    fontWeight: '700',
  },
});
