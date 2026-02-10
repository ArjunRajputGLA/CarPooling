// Profile Picture Upload Component
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LucideCamera, LucideImage, LucideTrash2, LucideX, LucideUser } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const ProfilePictureUpload = ({
  imageUri,
  onImageSelected,
  onRemoveImage,
  size = 120,
  loading = false,
  editable = true,
}) => {
  const [showOptions, setShowOptions] = React.useState(false);

  const requestPermissions = async (type) => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is required to take photos.');
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery access is required to select photos.');
        return false;
      }
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions('camera');
    if (!hasPermission) return;

    setShowOptions(false);
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  };

  const chooseFromGallery = async () => {
    const hasPermission = await requestPermissions('gallery');
    if (!hasPermission) return;

    setShowOptions(false);
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  };

  const handleRemove = () => {
    setShowOptions(false);
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemoveImage },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.avatarContainer, { width: size, height: size }]}
        onPress={() => editable && setShowOptions(true)}
        disabled={!editable || loading}
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[styles.avatar, { width: size, height: size }]}
          />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size }]}>
            <LucideUser size={size * 0.4} color={COLORS.gray[400]} />
          </View>
        )}
        
        {editable && !loading && (
          <View style={styles.cameraOverlay}>
            <LucideCamera size={20} color={COLORS.white} />
          </View>
        )}
      </TouchableOpacity>

      {editable && (
        <Text style={styles.hint}>Tap to {imageUri ? 'change' : 'add'} photo</Text>
      )}

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile Photo</Text>
              <TouchableOpacity onPress={() => setShowOptions(false)}>
                <LucideX size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.optionItem} onPress={takePhoto}>
              <View style={[styles.optionIcon, { backgroundColor: COLORS.primary }]}>
                <LucideCamera size={24} color={COLORS.white} />
              </View>
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionItem} onPress={chooseFromGallery}>
              <View style={[styles.optionIcon, { backgroundColor: COLORS.success }]}>
                <LucideImage size={24} color={COLORS.white} />
              </View>
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            {imageUri && (
              <TouchableOpacity style={styles.optionItem} onPress={handleRemove}>
                <View style={[styles.optionIcon, { backgroundColor: COLORS.error }]}>
                  <LucideTrash2 size={24} color={COLORS.white} />
                </View>
                <Text style={[styles.optionText, { color: COLORS.error }]}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    backgroundColor: COLORS.gray[100],
    ...SHADOWS.md,
  },
  avatar: {
    borderRadius: BORDER_RADIUS.full,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.full,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    padding: SPACING.sm,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  hint: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.gray[500],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  optionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

export default ProfilePictureUpload;
