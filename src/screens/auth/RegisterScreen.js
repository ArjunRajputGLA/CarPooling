// Complete Registration Screen with all required and optional fields
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { LucideCarFront } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import {
  validateEmail,
  validatePhone,
  validateName,
  checkPasswordStrength,
  validateAddress,
} from '../../utils/validation';
import { uploadProfilePicture } from '../../utils/imageHelpers';
import {
  CustomInput,
  PhoneInput,
  PasswordStrengthIndicator,
  ProfilePictureUpload,
  LoadingSpinner,
  Toast,
} from '../../components/common';

// Driver email constant
const DRIVER_EMAIL = 'imstorm23203@gmail.com';

export default function RegisterScreen({ navigation }) {
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
      Alert.alert(
        'Validation Error',
        'Please fix all the errors before submitting.',
        [{ text: 'OK' }],
        { cancelable: true }
      );
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
      };

      const { error: profileError } = await supabase
        .from('users')
        .upsert(userData);

      if (profileError) {
        console.error('Profile insert error:', profileError);
        // Don't throw here, the trigger might have already created the user
      }

      // 5. Show success message
      Alert.alert(
        'Registration Successful! 🎉',
        `Welcome to CarPooling! You are registered as a ${role}.`,
        [{ text: 'OK' }],
        { cancelable: true }
      );

      // If session exists, user is already logged in (email confirmation disabled)
      // The auth state listener in AuthContext will handle navigation automatically
      // No need to navigate manually

    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message?.includes('already registered') || error.message?.includes('already been registered') || error.message?.includes('already exists') || error.message?.includes('User already registered')) {
        Alert.alert(
          'Account Already Exists',
          'An account with this email is already registered. Please sign in instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go to Login', 
              onPress: () => navigation.navigate('Login'),
              style: 'default',
            },
          ],
          { cancelable: true }
        );
        return;
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message?.includes('Password')) {
        errorMessage = error.message;
      } else if (error.code === '42501') {
        // RLS policy error - profile creation failed but user was created
        Alert.alert(
          'Account Created',
          'Your account was created. Please login.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
          { cancelable: false }
        );
        return;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Registration Failed',
        errorMessage,
        [{ text: 'OK' }],
        { cancelable: true }
      );
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
            <LucideCarFront size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>CarPooling</Text>
        </View>

        {/* Header */}
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join our carpooling community</Text>

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
          <Text style={styles.sectionTitle}>Required Information</Text>

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
          <Text style={styles.sectionTitle}>Optional Information</Text>
          <Text style={styles.sectionSubtitle}>
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
        <TouchableOpacity
          style={[
            styles.signUpButton,
            !isFormValid() && styles.signUpButtonDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading || !isFormValid()}
        >
          {loading ? (
            <LoadingSpinner visible size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>
            Already have an account?{' '}
            <Text style={styles.loginLinkBold}>Login</Text>
          </Text>
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
        message="Creating your account..."
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
    paddingBottom: SPACING.xxxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  appName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.lg,
  },
  signUpButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...SHADOWS.md,
  },
  signUpButtonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  signUpButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  loginLink: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
  },
  loginLinkBold: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
