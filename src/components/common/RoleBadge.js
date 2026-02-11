// Role Badge Component - Material Design 3
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LucideCar, LucideUser } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const RoleBadge = ({ role, size = 'medium', animated = true }) => {
  const { colors, borderRadius, spacing, typography } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const isDriver = role === 'driver';
  
  useEffect(() => {
    if (animated) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [animated]);
  
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          fontSize: typography.labelSmall.fontSize,
          iconSize: 12,
        };
      case 'large':
        return {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          fontSize: typography.labelLarge.fontSize,
          iconSize: 20,
        };
      default:
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: typography.labelMedium.fontSize,
          iconSize: 16,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // MD3 tonal colors
  const backgroundColor = isDriver 
    ? colors.tertiaryContainer 
    : colors.primaryContainer;
  const textColor = isDriver 
    ? colors.onTertiaryContainer 
    : colors.onPrimaryContainer;

  return (
    <Animated.View style={[
      styles.container,
      {
        backgroundColor,
        paddingHorizontal: sizeStyles.paddingHorizontal,
        paddingVertical: sizeStyles.paddingVertical,
        borderRadius: borderRadius.full,
        transform: [{ scale: scaleAnim }],
      },
    ]}>
      {isDriver ? (
        <LucideCar size={sizeStyles.iconSize} color={textColor} />
      ) : (
        <LucideUser size={sizeStyles.iconSize} color={textColor} />
      )}
      <Text style={[
        styles.text,
        {
          fontSize: sizeStyles.fontSize,
          color: textColor,
          marginLeft: spacing.xs,
        },
      ]}>
        {isDriver ? 'DRIVER' : 'PASSENGER'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default RoleBadge;
