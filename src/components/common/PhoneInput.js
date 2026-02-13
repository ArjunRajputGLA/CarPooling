// Phone Input Component with Country Code Selector - Material Design 3
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { LucideChevronDown, LucideCheck, LucideX, LucidePhone } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { COUNTRY_CODES } from '../../constants/theme';

const PhoneInput = ({
  label,
  value,
  onChangeText,
  onChangeCountryCode,
  countryCode = '+91',
  error,
  isValid,
  required = false,
  placeholder = 'Enter 10-digit mobile',
  style,
  isEmergencyContact = false,
}) => {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const clearButtonAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const modalSlideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  // Animate clear button visibility based on value
  useEffect(() => {
    Animated.timing(clearButtonAnim, {
      toValue: value && value.length > 0 ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [value]);

  const openModal = () => {
    setShowCountryPicker(true);
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
    ]).start(() => setShowCountryPicker(false));
  };

  const handlePhoneChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    const limitedValue = numericValue.slice(0, 10);
    onChangeText(limitedValue);
  };

  const formatPhoneDisplay = (phone) => {
    if (!phone) return '';
    if (phone.length <= 5) return phone;
    return `${phone.slice(0, 5)} ${phone.slice(5)}`;
  };

  const getBorderColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.primary;
    if (isValid && value) return colors.success;
    return colors.outline;
  };

  const getLabelColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.primary;
    return colors.onSurfaceVariant;
  };

  // Clear button handler
  const handleClear = () => {
    onChangeText('');
  };

  // Get the appropriate placeholder text
  const getPlaceholderText = () => {
    if (isEmergencyContact) {
      return 'Enter emergency contact number';
    }
    return placeholder || 'Enter 10-digit mobile number';
  };

  const renderCountryItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [
        styles.countryItem,
        {
          backgroundColor: item.code === countryCode 
            ? colors.primaryContainer 
            : pressed 
              ? colors.surfaceContainerHighest 
              : 'transparent',
          padding: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.outlineVariant,
        },
      ]}
      onPress={() => {
        onChangeCountryCode && onChangeCountryCode(item.code);
        closeModal();
      }}
    >
      <Text style={[styles.countryFlag, { marginRight: spacing.md }]}>{item.flag}</Text>
      <Text style={[
        styles.countryName, 
        { 
          color: colors.onSurface,
          ...typography.bodyLarge,
          flex: 1,
        }
      ]}>
        {item.country}
      </Text>
      <Text style={[
        styles.countryCode, 
        { 
          color: colors.onSurfaceVariant,
          ...typography.bodyMedium,
          marginRight: spacing.md,
        }
      ]}>
        {item.code}
      </Text>
      {item.code === countryCode && (
        <LucideCheck size={20} color={colors.primary} />
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { marginBottom: spacing.md }, style]}>
      <View style={[
        styles.inputContainer,
        {
          borderWidth: isFocused ? 2 : 1,
          borderColor: getBorderColor(),
          borderRadius: borderRadius.input || borderRadius.medium,
          backgroundColor: 'transparent',
        },
      ]}>
        {/* Country Code Selector */}
        <TouchableOpacity
          style={[
            styles.countrySelector, 
            { 
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
            }
          ]}
          onPress={openModal}
        >
          <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
          <Text style={[
            styles.selectedCode, 
            { 
              color: colors.onSurface,
              ...typography.bodyLarge,
              marginHorizontal: spacing.xs,
            }
          ]}>
            {selectedCountry.code}
          </Text>
          <LucideChevronDown size={16} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

        {/* Phone Input */}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.onSurface,
              paddingHorizontal: spacing.md,
              ...typography.bodyLarge,
            }
          ]}
          value={formatPhoneDisplay(value)}
          onChangeText={handlePhoneChange}
          placeholder={getPlaceholderText()}
          placeholderTextColor={colors.onSurfaceVariant}
          keyboardType="phone-pad"
          maxLength={11}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {/* Clear Button with Fade Animation - only shows when there's text */}
        <Animated.View 
          style={[
            styles.clearButton, 
            { 
              opacity: clearButtonAnim,
              transform: [{ scale: clearButtonAnim }],
            }
          ]}
          pointerEvents={value && value.length > 0 ? 'auto' : 'none'}
        >
          <TouchableOpacity
            onPress={handleClear}
            style={[styles.clearButtonTouchable, { marginRight: spacing.sm }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[styles.clearIconContainer, { backgroundColor: colors.surfaceContainerHighest }]}>
              <LucideX size={14} color={colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Validation Icon - only show when phone number is complete (10 digits) */}
        {value && value.length === 10 && (
          <View style={[styles.validationIcon, { paddingRight: spacing.md }]}>
            {/* Check internal validation: 10 digits starting with 6-9 */}
            {/^[6-9]\d{9}$/.test(value) ? (
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryContainer }]}>
                <LucideCheck size={16} color={colors.primary} />
              </View>
            ) : (
              <View style={[styles.iconContainer, { backgroundColor: colors.errorContainer }]}>
                <LucideX size={16} color={colors.error} />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={[
          styles.errorText, 
          { 
            color: colors.error,
            marginTop: spacing.xs,
            marginLeft: spacing.md,
            ...typography.bodySmall,
          }
        ]}>
          {error}
        </Text>
      )}

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
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
                Select Country
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <LucideX size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    position: 'relative',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryFlag: {
    fontSize: 20,
  },
  selectedCode: {
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 24,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
  },
  clearButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonTouchable: {
    padding: 4,
  },
  clearIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationIcon: {},
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {},
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {},
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
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryName: {},
  countryCode: {},
});

export default PhoneInput;
