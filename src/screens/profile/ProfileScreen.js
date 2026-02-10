// Complete Profile Screen with all user information and edit capabilities
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  Switch,
} from 'react-native';
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
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
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
} from '../../components/common';
import { validateName, validatePhone, validateAddress } from '../../utils/validation';

export default function ProfileScreen() {
  const { profile, signOut, user, refreshProfile } = useAuth();
  
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
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await signOut(false); // Pass false to skip double confirmation
          },
        },
      ]
    );
  };

  // Handle delete account
  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This action cannot be undone. All your data will be permanently deleted. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This will delete your account, trip history, and all associated data permanently.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I Understand, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    try {
                      // Delete user's trip data
                      if (user?.id) {
                        const role = userData?.role || profile?.role;
                        
                        if (role === 'driver') {
                          // Get driver's cars
                          const { data: cars } = await supabase
                            .from('cars')
                            .select('id')
                            .eq('driver_id', user.id);
                          
                          if (cars?.length) {
                            const carIds = cars.map(c => c.id);
                            // Delete trips associated with driver's cars
                            await supabase
                              .from('trips')
                              .delete()
                              .in('car_id', carIds);
                            // Delete cars
                            await supabase
                              .from('cars')
                              .delete()
                              .eq('driver_id', user.id);
                          }
                        } else {
                          // Delete passenger's trips
                          await supabase
                            .from('trips')
                            .delete()
                            .eq('passenger_id', user.id);
                        }

                        // Delete user profile
                        await supabase
                          .from('users')
                          .delete()
                          .eq('id', user.id);
                      }

                      await clearAllData();
                      showToastMessage('Account deleted successfully.', 'success');
                      
                      // Sign out after brief delay for toast
                      setTimeout(async () => {
                        await signOut(false);
                      }, 1500);
                    } catch (err) {
                      console.error('Delete account error:', err);
                      showToastMessage('Failed to delete account. Please contact support.', 'error');
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
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

  return (
    <SwipeableScreen>
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <ProfilePictureUpload
            imageUri={data?.profile_picture_url}
            onImageSelected={handleProfilePictureUpdate}
            onRemoveImage={handleRemoveProfilePicture}
            size={120}
            loading={loading}
          />
          
          <Text style={styles.userName}>{data?.full_name || 'User'}</Text>
          <Text style={styles.userEmail}>{data?.email}</Text>
          
          <RoleBadge role={data?.role} size="medium" />
          
          <View style={styles.memberSince}>
            <LucideCalendar size={14} color={COLORS.gray[500]} />
            <Text style={styles.memberSinceText}>
              Member since {formatDate(data?.created_at)}
            </Text>
          </View>
        </View>

        {/* Personal Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LucideUser size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
          
          <InfoItem
            icon={<LucideUser size={18} color={COLORS.gray[500]} />}
            label="Full Name"
            value={data?.full_name}
            onEdit={() => openEditModal('full_name', data?.full_name)}
          />
          
          <InfoItem
            icon={<LucideMail size={18} color={COLORS.gray[500]} />}
            label="Email"
            value={data?.email}
            verified={true}
            editable={false}
          />
          
          <InfoItem
            icon={<LucidePhone size={18} color={COLORS.gray[500]} />}
            label="Phone Number"
            value={data?.phone ? `+91 ${data.phone}` : 'Not set'}
            onEdit={() => openEditModal('phone', data?.phone)}
          />
          
          <InfoItem
            icon={<LucideMapPin size={18} color={COLORS.gray[500]} />}
            label="Home Address"
            value={data?.home_address || 'Not set'}
            onEdit={() => openEditModal('home_address', data?.home_address)}
            isLast
          />
        </View>

        {/* Emergency Contact Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LucideShield size={20} color={COLORS.warning} />
            <Text style={styles.cardTitle}>Emergency Contact</Text>
          </View>
          
          <InfoItem
            icon={<LucideUser size={18} color={COLORS.gray[500]} />}
            label="Contact Name"
            value={data?.emergency_contact_name || 'Not set'}
            onEdit={() => openEditModal('emergency_contact_name', data?.emergency_contact_name)}
          />
          
          <InfoItem
            icon={<LucidePhone size={18} color={COLORS.gray[500]} />}
            label="Contact Phone"
            value={data?.emergency_contact_phone ? `+91 ${data.emergency_contact_phone}` : 'Not set'}
            onEdit={() => openEditModal('emergency_contact_phone', data?.emergency_contact_phone)}
            isLast
          />
        </View>

        {/* Account Settings Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LucideSettings size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Account Settings</Text>
          </View>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setPasswordModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <LucideLock size={18} color={COLORS.gray[500]} />
              <Text style={styles.settingLabel}>Change Password</Text>
            </View>
            <LucideChevronRight size={18} color={COLORS.gray[400]} />
          </TouchableOpacity>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <LucideBell size={18} color={COLORS.gray[500]} />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primaryLight }}
              thumbColor={pushNotifications ? COLORS.primary : COLORS.gray[100]}
            />
          </View>
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingLeft}>
              <LucideMail size={18} color={COLORS.gray[500]} />
              <Text style={styles.settingLabel}>Email Notifications</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primaryLight }}
              thumbColor={emailNotifications ? COLORS.primary : COLORS.gray[100]}
            />
          </View>
        </View>

        {/* Statistics Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <LucideHistory size={20} color={COLORS.success} />
            <Text style={styles.cardTitle}>Account Statistics</Text>
          </View>
          
          {data?.role === 'driver' ? (
            // Driver Stats
            <>
              <StatItem
                icon={<LucideCar size={18} color={COLORS.primary} />}
                label="Total Trips Hosted"
                value={stats?.totalTrips || 0}
              />
              <StatItem
                icon={<LucideCreditCard size={18} color={COLORS.success} />}
                label="Total Revenue"
                value={`₹${stats?.totalRevenue?.toFixed(2) || '0.00'}`}
              />
              <StatItem
                icon={<LucideUser size={18} color={COLORS.info} />}
                label="Active Passengers"
                value={stats?.activePassengers || 0}
                isLast
              />
            </>
          ) : (
            // Passenger Stats
            <>
              <StatItem
                icon={<LucideCar size={18} color={COLORS.primary} />}
                label="Total Trips"
                value={stats?.totalTrips || 0}
              />
              <StatItem
                icon={<LucideCreditCard size={18} color={COLORS.success} />}
                label="Total Paid"
                value={`₹${stats?.totalPaid?.toFixed(2) || '0.00'}`}
              />
              <StatItem
                icon={<LucideAlertCircle size={18} color={COLORS.warning} />}
                label="Pending Payments"
                value={`₹${stats?.pendingAmount?.toFixed(2) || '0.00'}`}
                isLast
              />
            </>
          )}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LucideLogOut size={20} color={COLORS.white} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <LucideTrash2 size={20} color={COLORS.error} />
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit {getFieldLabel(editField)}</Text>
            
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
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={saveEditedField}
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner visible size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Save</Text>
                )}
              </TouchableOpacity>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
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
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setPasswordError('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner visible size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Change</Text>
                )}
              </TouchableOpacity>
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
    </View>
    </SwipeableScreen>
  );
}

// Info Item Component
const InfoItem = ({ icon, label, value, onEdit, verified, editable = true, isLast }) => (
  <View style={[styles.infoItem, isLast && styles.infoItemLast]}>
    <View style={styles.infoLeft}>
      {icon}
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <View style={styles.infoValueRow}>
          <Text style={[styles.infoValue, !value && styles.infoValueEmpty]}>
            {value || 'Not set'}
          </Text>
          {verified && (
            <View style={styles.verifiedBadge}>
              <LucideCheckCircle size={14} color={COLORS.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
      </View>
    </View>
    {editable && onEdit && (
      <TouchableOpacity onPress={onEdit} style={styles.editButton}>
        <LucideEdit2 size={16} color={COLORS.primary} />
      </TouchableOpacity>
    )}
  </View>
);

// Stat Item Component
const StatItem = ({ icon, label, value, isLast }) => (
  <View style={[styles.statItem, isLast && styles.statItemLast]}>
    <View style={styles.statLeft}>
      {icon}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.light,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
  },
  userEmail: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  memberSinceText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.gray[500],
    marginLeft: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
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
    marginLeft: SPACING.md,
    flex: 1,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  infoValueEmpty: {
    color: COLORS.gray[400],
    fontStyle: 'italic',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  verifiedText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.success,
    marginLeft: 2,
  },
  editButton: {
    padding: SPACING.sm,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    marginLeft: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  statItemLast: {
    borderBottomWidth: 0,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    marginLeft: SPACING.md,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginLeft: SPACING.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginLeft: SPACING.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonCancel: {
    backgroundColor: COLORS.gray[200],
    marginRight: SPACING.sm,
  },
  modalButtonCancelText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  modalButtonSave: {
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  modalButtonSaveText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
