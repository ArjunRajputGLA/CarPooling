// Phone Input Component with Country Code Selector
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { LucideChevronDown, LucideCheck, LucideX } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, COUNTRY_CODES } from '../../constants/theme';

const PhoneInput = ({
  label,
  value,
  onChangeText,
  onChangeCountryCode,
  countryCode = '+91',
  error,
  isValid,
  required = false,
  placeholder = 'Phone Number',
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  const handlePhoneChange = (text) => {
    // Remove non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, '');
    // Limit to 10 digits
    const limitedValue = numericValue.slice(0, 10);
    onChangeText(limitedValue);
  };

  const formatPhoneDisplay = (phone) => {
    if (!phone) return '';
    if (phone.length <= 5) return phone;
    return `${phone.slice(0, 5)} ${phone.slice(5)}`;
  };

  const getBorderColor = () => {
    if (error) return COLORS.error;
    if (isFocused) return COLORS.primary;
    if (isValid && value) return COLORS.success;
    return COLORS.input.border;
  };

  const renderCountryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        item.code === countryCode && styles.countryItemSelected,
      ]}
      onPress={() => {
        onChangeCountryCode && onChangeCountryCode(item.code);
        setShowCountryPicker(false);
      }}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.country}</Text>
      <Text style={styles.countryCode}>{item.code}</Text>
      {item.code === countryCode && (
        <LucideCheck size={20} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.required}>*</Text>}
        </View>
      )}

      <View style={[
        styles.inputContainer,
        { borderColor: getBorderColor() },
        isFocused && styles.inputFocused,
        error && styles.inputError,
      ]}>
        {/* Country Code Selector */}
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => setShowCountryPicker(true)}
        >
          <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
          <Text style={styles.selectedCode}>{selectedCountry.code}</Text>
          <LucideChevronDown size={16} color={COLORS.gray[500]} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Phone Input */}
        <TextInput
          style={styles.input}
          value={formatPhoneDisplay(value)}
          onChangeText={handlePhoneChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.input.placeholder}
          keyboardType="phone-pad"
          maxLength={11} // 10 digits + 1 space
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {/* Validation Icon */}
        {value && (
          <View style={styles.validationIcon}>
            {isValid ? (
              <LucideCheck size={20} color={COLORS.success} />
            ) : (
              <LucideX size={20} color={COLORS.error} />
            )}
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCountryPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <LucideX size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              renderItem={renderCountryItem}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  required: {
    color: COLORS.error,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.input.background,
    minHeight: 48,
  },
  inputFocused: {
    borderWidth: 2,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: SPACING.xs,
  },
  selectedCode: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    marginRight: SPACING.xs,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.gray[300],
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
  },
  validationIcon: {
    paddingRight: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: SPACING.xs,
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
    maxHeight: '50%',
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
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  countryItemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  countryName: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    marginLeft: SPACING.md,
  },
  countryCode: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.gray[600],
    marginRight: SPACING.md,
  },
});

export default PhoneInput;
