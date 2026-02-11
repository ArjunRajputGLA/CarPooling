// Profile Picture Upload Component - Material Design 3
import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { LucideCamera, LucideImage, LucideTrash2, LucideX, LucideUser, LucidePencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';

const ProfilePictureUpload = ({
  imageUri,
  onImageSelected,
  onRemoveImage,
  size = 120,
  loading = false,
  editable = true,
}) => {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [showOptions, setShowOptions] = React.useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const modalSlideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const animatePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const animatePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const openModal = () => {
    setShowOptions(true);
    Animated.parallel([
      Animated.spring(modalSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalSlideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowOptions(false));
  };

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

    closeModal();
    
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

    closeModal();
    
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
    closeModal();
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemoveImage },
      ]
    );
  };

  const OptionButton = ({ icon, label, color, onPress, destructive }) => (
    <Pressable
      style={({ pressed }) => [
        styles.optionItem,
        { 
          padding: spacing.lg,
          backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
        },
      ]}
      onPress={onPress}
    >
      <View style={[
        styles.optionIcon, 
        { 
          backgroundColor: destructive ? colors.errorContainer : colors.primaryContainer,
          borderRadius: borderRadius.full,
        }
      ]}>
        {React.cloneElement(icon, { 
          size: 24, 
          color: destructive ? colors.error : colors.primary 
        })}
      </View>
      <Text style={[
        styles.optionText, 
        { 
          color: destructive ? colors.error : colors.onSurface,
          ...typography.bodyLarge,
          marginLeft: spacing.lg,
        }
      ]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { marginBottom: spacing.lg }]}>
      <Pressable
        onPressIn={animatePressIn}
        onPressOut={animatePressOut}
        onPress={() => editable && openModal()}
        disabled={!editable || loading}
      >
        <Animated.View 
          style={[
            styles.avatarContainer, 
            { 
              width: size, 
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surfaceContainerHighest,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
            />
          ) : (
            <View style={[
              styles.placeholder, 
              { 
                width: size, 
                height: size, 
                borderRadius: size / 2,
                backgroundColor: colors.primaryContainer,
              }
            ]}>
              <LucideUser size={size * 0.4} color={colors.onPrimaryContainer} />
            </View>
          )}
          
          {editable && !loading && (
            <View style={[
              styles.editOverlay,
              {
                backgroundColor: colors.primary,
                borderColor: colors.surface,
                borderRadius: borderRadius.full,
              }
            ]}>
              <LucidePencil size={16} color={colors.onPrimary} />
            </View>
          )}
        </Animated.View>
      </Pressable>

      {editable && (
        <Text style={[
          styles.hint, 
          { 
            marginTop: spacing.sm,
            color: colors.onSurfaceVariant,
            ...typography.bodySmall,
          }
        ]}>
          Tap to {imageUri ? 'change' : 'add'} photo
        </Text>
      )}

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <Animated.View 
            style={[
              styles.modalBackdrop,
              { opacity: backdropAnim }
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          </Animated.View>
          
          <Animated.View style={[
            styles.modalContent,
            {
              backgroundColor: colors.surfaceContainerLow,
              borderTopLeftRadius: borderRadius.extraLarge,
              borderTopRightRadius: borderRadius.extraLarge,
              transform: [{ translateY: modalSlideAnim }],
            }
          ]}>
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
            </View>
            
            <View style={[
              styles.modalHeader, 
              { 
                padding: spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: colors.outlineVariant,
              }
            ]}>
              <Text style={[styles.modalTitle, { color: colors.onSurface, ...typography.titleLarge }]}>
                Profile Photo
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <LucideX size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <OptionButton 
              icon={<LucideCamera />} 
              label="Take Photo" 
              onPress={takePhoto}
            />

            <OptionButton 
              icon={<LucideImage />} 
              label="Choose from Gallery" 
              onPress={chooseFromGallery}
            />

            {imageUri && (
              <OptionButton 
                icon={<LucideTrash2 />} 
                label="Remove Photo" 
                onPress={handleRemove}
                destructive
              />
            )}
            
            <View style={{ height: spacing.xxxl }} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarContainer: {
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatar: {},
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    padding: 8,
    borderWidth: 3,
  },
  hint: {
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    paddingBottom: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontWeight: '500',
  },
});

export default ProfilePictureUpload;
