// Complete Profile Screen with all user information and edit capabilities
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  Switch,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LucideUser,
  LucideMail,
  LucidePhone,
  LucideMapPin,
  LucideShield,
  LucideSettings,
  LucideLogOut,
  LucideTrash2,
  LucideEdit2,
  LucideChevronRight,
  LucideBell,
  LucidePalette,
  LucideLock,
  LucideCheckCircle,
  LucideAlertCircle,
  LucideCalendar,
  LucideCar,
  LucideCreditCard,
  LucideHistory,
  LucideSun,
  LucideMoon,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import SwipeableScreen from '../../components/common/SwipeableScreen';
import { uploadProfilePicture, deleteProfilePicture } from '../../utils/imageHelpers';
import { clearAllData } from '../../utils/storage';
import {
  ProfilePictureUpload,
  RoleBadge,
  LoadingSpinner,
  Toast,
  CustomInput,
  PhoneInput,
  M3ConfirmDialog,
  M3Button,
  M3TextField,
} from '../../components/common';
import M3Dialog from '../../components/common/M3Dialog';
import { validateName, validatePhone, validateAddress } from '../../utils/validation';

export default function ProfileScreen() {
  const { profile, signOut, user, refreshProfile } = useAuth();
  const { colors, spacing, borderRadius, isDark, themeMode, updateThemeMode } = useTheme();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;
  
  // State
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Edit modals
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  
  // Change password modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Settings
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  
  // Toast
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  
  // M3 Dialog states
  const [logoutDialog, setLogoutDialog] = useState(false);
  
  // Delete account dialog states
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch user data
  const fetchUserData = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setUserData(data);
      
      // Fetch stats based on role
      await fetchStats(data.role);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  // Fetch user stats
  const fetchStats = async (role) => {
    if (!user?.id) return;
    
    try {
      if (role === 'driver') {
        // Get driver's car
        const { data: carData } = await supabase
          .from('cars')
          .select('id')
          .eq('driver_id', user.id)
          .single();
        
        if (carData) {
          // Get trip stats
          const { data: trips } = await supabase
            .from('trips')
            .select('fare_amount, payment_status')
            .eq('car_id', carData.id);
          
          const totalTrips = trips?.length || 0;
          const totalRevenue = trips?.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0) || 0;
          const paidTrips = trips?.filter(t => t.payment_status === 'paid').length || 0;
          
          // Get unique passengers
          const { data: passengers } = await supabase
            .from('trips')
            .select('passenger_id')
            .eq('car_id', carData.id);
          
          const uniquePassengers = new Set(passengers?.map(p => p.passenger_id)).size;
          
          setStats({
            totalTrips,
            totalRevenue,
            paidTrips,
            activePassengers: uniquePassengers,
          });
        }
      } else {
        // Passenger stats
        const { data: trips } = await supabase
          .from('trips')
          .select('fare_amount, payment_status')
          .eq('passenger_id', user.id);
        
        const totalTrips = trips?.length || 0;
        const totalPaid = trips?.filter(t => t.payment_status === 'paid')
          .reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0) || 0;
        const pendingAmount = trips?.filter(t => t.payment_status === 'pending')
          .reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0) || 0;
        
        setStats({
          totalTrips,
          totalPaid,
          pendingAmount,
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

  // Animation effect
  useEffect(() => {
    // Header fade in
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

    // Stagger card animations
    const cardAnimations = cardAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: 200 + index * 100,
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, cardAnimations).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  }, [user?.id]);

  // Handle profile picture update
  const handleProfilePictureUpdate = async (imageUri) => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const result = await uploadProfilePicture(user.id, imageUri);
      
      if (result.success) {
        // Update database
        await supabase
          .from('users')
          .update({ 
            profile_picture_url: result.url,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        setUserData(prev => ({ ...prev, profile_picture_url: result.url }));
        // Refresh global profile state so home page updates
        await refreshProfile();
        showToastMessage('Profile picture updated!', 'success');
      } else {
        showToastMessage('Failed to upload image. Please try again.', 'error');
      }
    } catch (err) {
      showToastMessage('Failed to update profile picture.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle remove profile picture
  const handleRemoveProfilePicture = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      await deleteProfilePicture(user.id);
      
      await supabase
        .from('users')
        .update({ 
          profile_picture_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      setUserData(prev => ({ ...prev, profile_picture_url: null }));
      // Refresh global profile state so home page updates
      await refreshProfile();
      showToastMessage('Profile picture removed.', 'success');
    } catch (err) {
      showToastMessage('Failed to remove profile picture.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (field, currentValue) => {
    setEditField(field);
    setEditValue(currentValue || '');
    setEditError('');
    setEditModalVisible(true);
  };

  // Save edited field
  const saveEditedField = async () => {
    if (!user?.id || !editField) return;
    
    // Validate based on field
    if (editField === 'full_name' && !validateName(editValue)) {
      setEditError('Name must be at least 2 characters with only letters');
      return;
    }
    
    if (editField === 'phone' && editValue && !validatePhone(editValue)) {
      setEditError('Please enter a valid 10-digit phone number');
      return;
    }
    
    if (editField === 'emergency_contact_phone' && editValue && !validatePhone(editValue)) {
      setEditError('Please enter a valid 10-digit phone number');
      return;
    }
    
    if (editField === 'home_address' && editValue && !validateAddress(editValue)) {
      setEditError('Address must be less than 200 characters');
      return;
    }

    // Check for duplicate phone
    if ((editField === 'phone' || editField === 'emergency_contact_phone') && editValue) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq(editField, editValue)
        .neq('id', user.id)
        .single();
      
      if (existingUser && editField === 'phone') {
        setEditError('This phone number is already in use');
        return;
      }
    }
    
    setLoading(true);
    try {
      const updateData = {
        [editField]: editValue.trim() || null,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUserData(prev => ({ ...prev, ...updateData }));
      setEditModalVisible(false);
      showToastMessage('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Update error:', err);
      showToastMessage('Failed to update profile. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    setPasswordError('');
    
    // Validate
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }
    
    setLoading(true);
    try {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: currentPassword,
      });
      
      if (signInError) {
        setPasswordError('Current password is incorrect');
        setLoading(false);
        return;
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (updateError) throw updateError;
      
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToastMessage('Password changed successfully!', 'success');
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setLogoutDialog(true);
  };
  
  // Execute logout
  const executeLogout = async () => {
    setLogoutDialog(false);
    await clearAllData();
    await signOut(false); // Pass false to skip double confirmation
  };

  // Handle delete account
  const handleDeleteAccount = () => {
    setDeleteConfirmText('');
    setDeletePassword('');
    setDeleteError('');
    setDeleteDialog(true);
  };
  
  // Close delete dialog
  const closeDeleteDialog = () => {
    setDeleteDialog(false);
    setDeleteConfirmText('');
    setDeletePassword('');
    setDeleteError('');
    setDeleteLoading(false);
  };
  
  // Check if delete button should be enabled
  const isDeleteEnabled = deleteConfirmText === 'DELETE' && deletePassword.length >= 6;
  
  // Execute delete with password verification
  const executeDeleteAccount = async () => {
    if (!isDeleteEnabled) return;
    
    setDeleteLoading(true);
    setDeleteError('');
    
    try {
      const userEmail = profile?.email || user?.email;
      
      // STEP 1: Verify password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: deletePassword,
      });
      
      if (authError) {
        setDeleteError('Incorrect password. Please try again.');
        setDeleteLoading(false);
        return;
      }
      
      const userId = user?.id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      console.log('Starting cascading deletion for user:', userId);
      
      // STEP 2: Delete from trips table (user can be driver OR passenger)
      const { error: tripsError } = await supabase
        .from('trips')
        .delete()
        .or(`passenger_id.eq.${userId}`);
      
      if (tripsError) {
        console.error('Error deleting trips:', tripsError);
        // Continue even if trips deletion has issues
      }
      
      // STEP 3: Get user's car IDs for fare_settings deletion
      const { data: userCars } = await supabase
        .from('cars')
        .select('id')
        .eq('driver_id', userId);
      
      // STEP 4: Delete fare_settings for user's cars
      if (userCars && userCars.length > 0) {
        const carIds = userCars.map(car => car.id);
        
        for (const carId of carIds) {
          const { error: fareError } = await supabase
            .from('fare_settings')
            .delete()
            .eq('car_id', carId);
          
          if (fareError) {
            console.error('Error deleting fare_settings for car:', carId, fareError);
          }
        }
        
        // Also delete trips associated with driver's cars
        const { error: driverTripsError } = await supabase
          .from('trips')
          .delete()
          .in('car_id', carIds);
        
        if (driverTripsError) {
          console.error('Error deleting driver trips:', driverTripsError);
        }
      }
      
      // STEP 5: Delete from cars table
      const { error: carsError } = await supabase
        .from('cars')
        .delete()
        .eq('driver_id', userId);
      
      if (carsError) {
        console.error('Error deleting cars:', carsError);
      }
      
      // STEP 6: Delete from users table
      const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (userDeleteError) {
        console.error('Error deleting user:', userDeleteError);
        throw new Error('Failed to delete user profile from database.');
      }
      
      console.log('User profile deleted from database');
      
      // STEP 7: Store deleted user ID locally to prevent re-creation
      await AsyncStorage.setItem(`@deleted_user_${userId}`, 'true');
      
      // STEP 8: Clear all local data
      await clearAllData();
      
      // Close dialog
      closeDeleteDialog();
      
      // Show success message
      showToastMessage('Your account has been permanently deleted.', 'success');
      
      // STEP 9: Sign out (this will navigate to login screen)
      setTimeout(async () => {
        await signOut(false);
      }, 1000);
      
    } catch (err) {
      console.error('Delete account error:', err);
      setDeleteError(err.message || 'Failed to delete account. Please try again or contact support.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Show toast
  const showToastMessage = (message, type) => {
    setToast({ visible: true, message, type });
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Get field label
  const getFieldLabel = (field) => {
    const labels = {
      full_name: 'Full Name',
      phone: 'Phone Number',
      emergency_contact_name: 'Emergency Contact Name',
      emergency_contact_phone: 'Emergency Contact Phone',
      home_address: 'Home Address',
    };
    return labels[field] || field;
  };

  const data = userData || profile;

  // Get theme mode label
  const getThemeModeLabel = () => {
    switch (themeMode) {
      case ThemeMode.LIGHT: return 'Light';
      case ThemeMode.DARK: return 'Dark';
      default: return 'System';
    }
  };

  // Cycle through theme modes
  const cycleThemeMode = () => {
    if (themeMode === ThemeMode.SYSTEM) updateThemeMode(ThemeMode.LIGHT);
    else if (themeMode === ThemeMode.LIGHT) updateThemeMode(ThemeMode.DARK);
    else updateThemeMode(ThemeMode.SYSTEM);
  };

  return (
    <SwipeableScreen>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Profile Header */}
        <Animated.View style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          <ProfilePictureUpload
            imageUri={data?.profile_picture_url}
            onImageSelected={handleProfilePictureUpdate}
            onRemoveImage={handleRemoveProfilePicture}
            size={120}
            loading={loading}
          />
          
          <Text style={[styles.userName, { color: colors.onSurface }]}>{data?.full_name || 'User'}</Text>
          <Text style={[styles.userEmail, { color: colors.onSurfaceVariant }]}>{data?.email}</Text>
          
          <RoleBadge role={data?.role} size="medium" />
          
          <View style={styles.memberSince}>
            <LucideCalendar size={14} color={colors.onSurfaceVariant} />
            <Text style={[styles.memberSinceText, { color: colors.onSurfaceVariant }]}>
              Member since {formatDate(data?.created_at)}
            </Text>
          </View>
        </Animated.View>

        {/* Personal Information Card */}
        <Animated.View style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.card,
            opacity: cardAnims[0],
            transform: [{ translateY: cardAnims[0].interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }) }],
          }
        ]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.outlineVariant }]}>
            <LucideUser size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Personal Information</Text>
          </View>
          
          <InfoItem
            icon={<LucideUser size={18} color={colors.onSurfaceVariant} />}
            label="Full Name"
            value={data?.full_name}
            onEdit={() => openEditModal('full_name', data?.full_name)}
            colors={colors}
          />
          
          <InfoItem
            icon={<LucideMail size={18} color={colors.onSurfaceVariant} />}
            label="Email"
            value={data?.email}
            verified={true}
            editable={false}
            colors={colors}
          />
          
          <InfoItem
            icon={<LucidePhone size={18} color={colors.onSurfaceVariant} />}
            label="Phone Number"
            value={data?.phone ? `+91 ${data.phone}` : 'Not set'}
            onEdit={() => openEditModal('phone', data?.phone)}
            colors={colors}
          />
          
          <InfoItem
            icon={<LucideMapPin size={18} color={colors.onSurfaceVariant} />}
            label="Home Address"
            value={data?.home_address || 'Not set'}
            onEdit={() => openEditModal('home_address', data?.home_address)}
            isLast
            colors={colors}
          />
        </Animated.View>

        {/* Emergency Contact Card */}
        <Animated.View style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            opacity: cardAnims[1],
            transform: [{ translateY: cardAnims[1].interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }) }],
          }
        ]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.outlineVariant }]}>
            <LucideShield size={20} color={colors.tertiary} />
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Emergency Contact</Text>
          </View>
          
          <InfoItem
            icon={<LucideUser size={18} color={colors.onSurfaceVariant} />}
            label="Contact Name"
            value={data?.emergency_contact_name || 'Not set'}
            onEdit={() => openEditModal('emergency_contact_name', data?.emergency_contact_name)}
            colors={colors}
          />
          
          <InfoItem
            icon={<LucidePhone size={18} color={colors.onSurfaceVariant} />}
            label="Contact Phone"
            value={data?.emergency_contact_phone || 'Not set'}
            onEdit={() => openEditModal('emergency_contact_phone', data?.emergency_contact_phone)}
            isLast
            colors={colors}
          />
        </Animated.View>

        {/* Account Settings Card */}
        <Animated.View style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            opacity: cardAnims[2],
            transform: [{ translateY: cardAnims[2].interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }) }],
          }
        ]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.outlineVariant }]}>
            <LucideSettings size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Account Settings</Text>
          </View>
          
          <Pressable
            style={({ pressed }) => [
              styles.settingItem,
              { borderBottomColor: colors.outlineVariant },
              pressed && { backgroundColor: colors.surfaceVariant }
            ]}
            onPress={() => setPasswordModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <LucideLock size={18} color={colors.onSurfaceVariant} />
              <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Change Password</Text>
            </View>
            <LucideChevronRight size={18} color={colors.onSurfaceVariant} />
          </Pressable>

          {/* Theme Toggle */}
          <Pressable
            style={({ pressed }) => [
              styles.settingItem,
              { borderBottomColor: colors.outlineVariant },
              pressed && { backgroundColor: colors.surfaceVariant }
            ]}
            onPress={cycleThemeMode}
          >
            <View style={styles.settingLeft}>
              {isDark ? (
                <LucideMoon size={18} color={colors.onSurfaceVariant} />
              ) : (
                <LucideSun size={18} color={colors.onSurfaceVariant} />
              )}
              <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Theme</Text>
            </View>
            <View style={styles.themeValue}>
              <Text style={[styles.themeLabelText, { color: colors.primary }]}>{getThemeModeLabel()}</Text>
              <LucideChevronRight size={18} color={colors.onSurfaceVariant} />
            </View>
          </Pressable>
          
          <View style={[styles.settingItem, { borderBottomColor: colors.outlineVariant }]}>
            <View style={styles.settingLeft}>
              <LucideBell size={18} color={colors.onSurfaceVariant} />
              <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Push Notifications</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: colors.surfaceVariant, true: colors.primaryContainer }}
              thumbColor={pushNotifications ? colors.primary : colors.outline}
            />
          </View>
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingLeft}>
              <LucideMail size={18} color={colors.onSurfaceVariant} />
              <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Email Notifications</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: colors.surfaceVariant, true: colors.primaryContainer }}
              thumbColor={emailNotifications ? colors.primary : colors.outline}
            />
          </View>
        </Animated.View>

        {/* Statistics Card */}
        <Animated.View style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            opacity: cardAnims[3],
            transform: [{ translateY: cardAnims[3].interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }) }],
          }
        ]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.outlineVariant }]}>
            <LucideHistory size={20} color={colors.secondary} />
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Account Statistics</Text>
          </View>
          
          {data?.role === 'driver' ? (
            // Driver Stats
            <>
              <StatItem
                icon={<LucideCar size={18} color={colors.primary} />}
                label="Total Trips Hosted"
                value={stats?.totalTrips || 0}
                colors={colors}
              />
              <StatItem
                icon={<LucideCreditCard size={18} color={colors.secondary} />}
                label="Total Revenue"
                value={`₹${stats?.totalRevenue?.toFixed(2) || '0.00'}`}
                colors={colors}
              />
              <StatItem
                icon={<LucideUser size={18} color={colors.tertiary} />}
                label="Active Passengers"
                value={stats?.activePassengers || 0}
                isLast
                colors={colors}
              />
            </>
          ) : (
            // Passenger Stats
            <>
              <StatItem
                icon={<LucideCar size={18} color={colors.primary} />}
                label="Total Trips"
                value={stats?.totalTrips || 0}
                colors={colors}
              />
              <StatItem
                icon={<LucideCreditCard size={18} color={colors.secondary} />}
                label="Total Paid"
                value={`₹${stats?.totalPaid?.toFixed(2) || '0.00'}`}
                colors={colors}
              />
              <StatItem
                icon={<LucideAlertCircle size={18} color={colors.tertiary} />}
                label="Pending Payments"
                value={`₹${stats?.pendingAmount?.toFixed(2) || '0.00'}`}
                isLast
                colors={colors}
              />
            </>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={{
          opacity: cardAnims[4],
          transform: [{ translateY: cardAnims[4].interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }) }],
        }}>
          <Pressable 
            style={({ pressed }) => [
              styles.logoutButton, 
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={handleLogout}
          >
            <LucideLogOut size={20} color={colors.onPrimary} />
            <Text style={[styles.logoutButtonText, { color: colors.onPrimary }]}>Logout</Text>
          </Pressable>
        </Animated.View>

        {/* Danger Zone Card */}
        <Animated.View style={[
          styles.card,
          styles.dangerZoneCard,
          {
            backgroundColor: isDark ? `${colors.error}15` : `${colors.error}08`,
            borderColor: colors.error,
            opacity: cardAnims[4],
            transform: [{ translateY: cardAnims[4].interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }) }],
            marginTop: 16,
          }
        ]}>
          <View style={[styles.cardHeader, { borderBottomColor: `${colors.error}30` }]}>
            <LucideAlertCircle size={20} color={colors.error} />
            <Text style={[styles.cardTitle, { color: colors.error }]}>Danger Zone</Text>
          </View>
          
          <Text style={{ 
            color: colors.onSurfaceVariant, 
            fontSize: 13, 
            lineHeight: 18,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
          }}>
            Once you delete your account, there is no going back. All your data including trips, vehicles, and payment history will be permanently removed.
          </Text>
          
          <View style={{ padding: 16, paddingTop: 8 }}>
            <Pressable 
              style={({ pressed }) => [
                styles.deleteButton, 
                { 
                  backgroundColor: colors.error,
                  borderColor: colors.error,
                  opacity: pressed ? 0.8 : 1 
                }
              ]}
              onPress={handleDeleteAccount}
            >
              <LucideTrash2 size={20} color={colors.onError || '#FFFFFF'} />
              <Text style={[styles.deleteButtonText, { color: colors.onError || '#FFFFFF' }]}>Delete Account Permanently</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Edit {getFieldLabel(editField)}</Text>
            
            {editField === 'phone' || editField === 'emergency_contact_phone' ? (
              <PhoneInput
                label={getFieldLabel(editField)}
                value={editValue}
                onChangeText={setEditValue}
                error={editError}
                isValid={editValue && validatePhone(editValue)}
              />
            ) : editField === 'home_address' ? (
              <CustomInput
                label={getFieldLabel(editField)}
                value={editValue}
                onChangeText={setEditValue}
                error={editError}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            ) : (
              <CustomInput
                label={getFieldLabel(editField)}
                value={editValue}
                onChangeText={setEditValue}
                error={editError}
                autoCapitalize="words"
              />
            )}
            
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton, 
                  { backgroundColor: colors.surfaceVariant, opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.modalButtonCancelText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton, 
                  { backgroundColor: colors.primary, marginLeft: 12, opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={saveEditedField}
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner visible size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.modalButtonSaveText, { color: colors.onPrimary }]}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Change Password</Text>
            
            <CustomInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Enter current password"
            />
            
            <CustomInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter new password"
            />
            
            <CustomInput
              label="Confirm New Password"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
              placeholder="Confirm new password"
              error={passwordError}
            />
            
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton, 
                  { backgroundColor: colors.surfaceVariant, opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setPasswordError('');
                }}
              >
                <Text style={[styles.modalButtonCancelText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton, 
                  { backgroundColor: colors.primary, marginLeft: 12, opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner visible size="small" color={colors.onPrimary} />
                ) : (
                  <Text style={[styles.modalButtonSaveText, { color: colors.onPrimary }]}>Change</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      {/* Loading Overlay */}
      <LoadingSpinner
        visible={loading && !editModalVisible && !passwordModalVisible}
        message="Updating..."
        overlay
      />
      
      {/* M3 Dialogs */}
      <M3ConfirmDialog
        visible={logoutDialog}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmText="Logout"
        onConfirm={executeLogout}
        onDismiss={() => setLogoutDialog(false)}
        isDestructive={true}
      />
      
      {/* Delete Account Dialog */}
      <M3Dialog
        visible={deleteDialog}
        onDismiss={closeDeleteDialog}
        title="Delete Account Permanently?"
        icon={<LucideTrash2 />}
        iconColor={colors.error}
        iconBackgroundColor={colors.errorContainer || `${colors.error}15`}
        showCloseButton={!deleteLoading}
        dismissible={!deleteLoading}
        actions={[
          {
            label: 'Cancel',
            onPress: closeDeleteDialog,
            variant: 'secondary',
            disabled: deleteLoading,
          },
          {
            label: deleteLoading ? 'Deleting...' : 'Delete Account',
            onPress: executeDeleteAccount,
            variant: 'danger',
            color: colors.error,
            disabled: !isDeleteEnabled || deleteLoading,
            loading: deleteLoading,
          },
        ]}
      >
        <View style={{ marginBottom: 16 }}>
          <Text style={{ 
            color: colors.onSurfaceVariant, 
            fontSize: 14, 
            lineHeight: 20,
            marginBottom: 20,
          }}>
            This will permanently delete your account and all associated data including trips, vehicles, fare settings, and payment history.{'\n\n'}
            <Text style={{ fontWeight: '700', color: colors.error }}>This action cannot be undone.</Text>
          </Text>
          
          {/* DELETE confirmation input */}
          <Text style={{ 
            color: colors.onSurface, 
            fontSize: 14, 
            fontWeight: '600',
            marginBottom: 8,
          }}>
            Type DELETE to confirm:
          </Text>
          <CustomInput
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
            placeholder="Type DELETE here"
            editable={!deleteLoading}
            autoCapitalize="characters"
            style={{ marginBottom: 16 }}
          />
          
          {/* Password verification input */}
          <Text style={{ 
            color: colors.onSurface, 
            fontSize: 14, 
            fontWeight: '600',
            marginBottom: 8,
          }}>
            Enter your password to verify:
          </Text>
          <CustomInput
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Your password"
            secureTextEntry
            editable={!deleteLoading}
          />
          
          {/* Error message */}
          {deleteError ? (
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginTop: 12,
              padding: 12,
              backgroundColor: colors.errorContainer || `${colors.error}15`,
              borderRadius: 8,
            }}>
              <LucideAlertCircle size={18} color={colors.error} />
              <Text style={{ 
                color: colors.error, 
                fontSize: 13, 
                marginLeft: 8,
                flex: 1,
              }}>
                {deleteError}
              </Text>
            </View>
          ) : null}
        </View>
      </M3Dialog>
    </View>
    </SwipeableScreen>
  );
}

// Info Item Component
const InfoItem = ({ icon, label, value, onEdit, verified, editable = true, isLast, colors }) => (
  <View style={[styles.infoItem, isLast && styles.infoItemLast, { borderBottomColor: colors?.outlineVariant }]}>
    <View style={styles.infoLeft}>
      {icon}
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors?.onSurfaceVariant }]}>{label}</Text>
        <View style={styles.infoValueRow}>
          <Text style={[styles.infoValue, { color: colors?.onSurface }, !value && { color: colors?.outline, fontStyle: 'italic' }]}>
            {value || 'Not set'}
          </Text>
          {verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors?.secondaryContainer }]}>
              <LucideCheckCircle size={14} color={colors?.secondary} />
              <Text style={[styles.verifiedText, { color: colors?.secondary }]}>Verified</Text>
            </View>
          )}
        </View>
      </View>
    </View>
    {editable && onEdit && (
      <Pressable 
        onPress={onEdit} 
        style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.6 }]}
      >
        <LucideEdit2 size={16} color={colors?.primary} />
      </Pressable>
    )}
  </View>
);

// Stat Item Component
const StatItem = ({ icon, label, value, isLast, colors }) => (
  <View style={[styles.statItem, isLast && styles.statItemLast, { borderBottomColor: colors?.outlineVariant }]}>
    <View style={styles.statLeft}>
      {icon}
      <Text style={[styles.statLabel, { color: colors?.onSurface }]}>{label}</Text>
    </View>
    <Text style={[styles.statValue, { color: colors?.primary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 12,
  },
  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  memberSinceText: {
    fontSize: 14,
    marginLeft: 6,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoItemLast: {
    borderBottomWidth: 0,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedText: {
    fontSize: 12,
    marginLeft: 2,
  },
  editButton: {
    padding: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderRadius: 12,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  themeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeLabelText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statItemLast: {
    borderBottomWidth: 0,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 0,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerZoneCard: {
    borderWidth: 1,
    marginBottom: 32,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
