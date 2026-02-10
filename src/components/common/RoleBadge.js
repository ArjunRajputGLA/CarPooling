// Role Badge Component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideCar, LucideUser } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../constants/theme';

const RoleBadge = ({ role, size = 'medium' }) => {
  const isDriver = role === 'driver';
  
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
          fontSize: TYPOGRAPHY.fontSize.xs,
          iconSize: 12,
        };
      case 'large':
        return {
          paddingHorizontal: SPACING.xl,
          paddingVertical: SPACING.md,
          fontSize: TYPOGRAPHY.fontSize.lg,
          iconSize: 20,
        };
      default:
        return {
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          fontSize: TYPOGRAPHY.fontSize.sm,
          iconSize: 16,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDriver ? COLORS.driverBadge : COLORS.passengerBadge,
        paddingHorizontal: sizeStyles.paddingHorizontal,
        paddingVertical: sizeStyles.paddingVertical,
      },
    ]}>
      {isDriver ? (
        <LucideCar size={sizeStyles.iconSize} color={isDriver ? COLORS.black : COLORS.white} />
      ) : (
        <LucideUser size={sizeStyles.iconSize} color={COLORS.white} />
      )}
      <Text style={[
        styles.text,
        {
          fontSize: sizeStyles.fontSize,
          color: isDriver ? COLORS.black : COLORS.white,
        },
      ]}>
        {isDriver ? 'DRIVER' : 'PASSENGER'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  text: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginLeft: SPACING.xs,
    textTransform: 'uppercase',
  },
});

export default RoleBadge;
