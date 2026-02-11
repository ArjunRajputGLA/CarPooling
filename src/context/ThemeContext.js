/**
 * SaaS-Grade Theme Context
 * Premium professional theming system for the CarPooling application
 * Inspired by Stripe, Linear, Vercel, and Notion design systems
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appearance, useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme mode constants
export const ThemeMode = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
};

// Storage keys
const THEME_STORAGE_KEY = '@carpooling_theme_mode';
const ACCENT_COLOR_KEY = '@carpooling_accent_color';

// Create theme context
const ThemeContext = createContext(null);

// ============================================================================
// SAAS COLOR PALETTE - Light Theme
// ============================================================================
const lightColors = {
  // Primary Brand Colors
  primary: '#0066FF',
  primaryHover: '#0052CC',
  primaryLight: '#4D94FF',
  primaryLightest: '#E6F0FF',
  primaryDark: '#004ACC',
  onPrimary: '#FFFFFF',
  
  // Secondary Accent (Purple - Premium features)
  secondary: '#7C3AED',
  secondaryHover: '#6D28D9',
  secondaryLight: '#A78BFA',
  secondaryLightest: '#EDE9FE',
  onSecondary: '#FFFFFF',
  
  // Tertiary (Teal for variety)
  tertiary: '#0D9488',
  tertiaryHover: '#0F766E',
  tertiaryLight: '#5EEAD4',
  tertiaryLightest: '#CCFBF1',
  onTertiary: '#FFFFFF',
  
  // Semantic Colors
  success: '#10B981',
  successHover: '#059669',
  successLight: '#D1FAE5',
  successDark: '#047857',
  onSuccess: '#FFFFFF',
  
  warning: '#F59E0B',
  warningHover: '#D97706',
  warningLight: '#FEF3C7',
  warningDark: '#B45309',
  onWarning: '#FFFFFF',
  
  error: '#EF4444',
  errorHover: '#DC2626',
  errorLight: '#FEE2E2',
  errorDark: '#B91C1C',
  onError: '#FFFFFF',
  
  info: '#3B82F6',
  infoHover: '#2563EB',
  infoLight: '#DBEAFE',
  infoDark: '#1D4ED8',
  onInfo: '#FFFFFF',
  
  // Neutral Grays (Professional)
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Background & Surfaces
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9FAFB',
  surfaceTertiary: '#F3F4F6',
  surfaceElevated: '#FFFFFF',
  onBackground: '#111827',
  onSurface: '#111827',
  onSurfaceVariant: '#4B5563',
  
  // Surface containers (Material 3 compatibility)
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F9FAFB',
  surfaceContainer: '#F3F4F6',
  surfaceContainerHigh: '#E5E7EB',
  surfaceContainerHighest: '#D1D5DB',
  surfaceVariant: '#F3F4F6',
  
  // Text Colors
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  
  // Border Colors
  border: '#E5E7EB',
  borderHover: '#D1D5DB',
  borderFocus: '#0066FF',
  borderError: '#EF4444',
  borderSuccess: '#10B981',
  outline: '#E5E7EB',
  outlineVariant: '#D1D5DB',
  
  // Interactive States
  hoverOverlay: 'rgba(0, 0, 0, 0.04)',
  pressedOverlay: 'rgba(0, 0, 0, 0.08)',
  selectedBackground: '#E6F0FF',
  disabledBackground: '#F3F4F6',
  
  // Skeleton/Loading
  skeleton: '#E5E7EB',
  skeletonHighlight: '#F3F4F6',
  
  // Focus Ring
  focusRing: 'rgba(0, 102, 255, 0.25)',
  
  // Scrim/Overlay
  scrim: 'rgba(0, 0, 0, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',
  
  // Special Purpose
  revenue: '#10B981',
  pending: '#F59E0B',
  failed: '#EF4444',
  activeTrip: '#3B82F6',
  premium: '#7C3AED',
  notification: '#EF4444',
  
  // Card Specific
  cardBackground: '#FFFFFF',
  cardBorder: '#E5E7EB',
  cardShadow: 'rgba(0, 0, 0, 0.08)',
  
  // Input Specific
  inputBackground: '#FFFFFF',
  inputBorder: '#D1D5DB',
  inputBorderFocus: '#0066FF',
  inputPlaceholder: '#9CA3AF',
  
  // Navigation
  navBackground: '#FFFFFF',
  navBorder: '#E5E7EB',
  navActive: '#0066FF',
  navInactive: '#6B7280',
  navActiveBackground: '#E6F0FF',
  
  // Sidebar
  sidebarBackground: '#F9FAFB',
  sidebarBorder: '#E5E7EB',
  sidebarItemHover: '#F3F4F6',
  sidebarItemActive: '#E6F0FF',
  sidebarItemActiveBorder: '#0066FF',
  
  // Table
  tableHeader: '#F9FAFB',
  tableRow: '#FFFFFF',
  tableRowHover: '#F9FAFB',
  tableRowSelected: '#E6F0FF',
  tableBorder: '#E5E7EB',
  
  // Badge Colors
  badgeSuccess: '#D1FAE5',
  badgeSuccessText: '#047857',
  badgeWarning: '#FEF3C7',
  badgeWarningText: '#B45309',
  badgeError: '#FEE2E2',
  badgeErrorText: '#B91C1C',
  badgeInfo: '#DBEAFE',
  badgeInfoText: '#1D4ED8',
  badgeNeutral: '#F3F4F6',
  badgeNeutralText: '#374151',
  badgePremium: '#EDE9FE',
  badgePremiumText: '#6D28D9',
  
  // Role Badges
  driverBadge: '#FEF3C7',
  driverBadgeText: '#B45309',
  onDriverBadge: '#B45309',
  passengerBadge: '#E6F0FF',
  passengerBadgeText: '#0052CC',
  onPassengerBadge: '#0052CC',
  
  // Containers (M3 compatibility)
  primaryContainer: '#E6F0FF',
  onPrimaryContainer: '#0052CC',
  secondaryContainer: '#EDE9FE',
  onSecondaryContainer: '#6D28D9',
  tertiaryContainer: '#CCFBF1',
  onTertiaryContainer: '#0F766E',
  errorContainer: '#FEE2E2',
  onErrorContainer: '#B91C1C',
  successContainer: '#D1FAE5',
  onSuccessContainer: '#047857',
  warningContainer: '#FEF3C7',
  onWarningContainer: '#B45309',
  
  // Chart Colors
  chartPrimary: '#0066FF',
  chartSecondary: '#7C3AED',
  chartSuccess: '#10B981',
  chartWarning: '#F59E0B',
  chartError: '#EF4444',
  chartGradientStart: '#0066FF',
  chartGradientEnd: '#4D94FF',
  chartGrid: '#E5E7EB',
  chartAxis: '#6B7280',
  
  // Toast Colors
  toastSuccess: '#FFFFFF',
  toastSuccessBorder: '#10B981',
  toastError: '#FFFFFF',
  toastErrorBorder: '#EF4444',
  toastWarning: '#FFFFFF',
  toastWarningBorder: '#F59E0B',
  toastInfo: '#FFFFFF',
  toastInfoBorder: '#3B82F6',
  
  // Inverse
  inverseSurface: '#1F2937',
  inverseOnSurface: '#F9FAFB',
  inversePrimary: '#4D94FF',
  
  // Surface tint
  surfaceTint: '#0066FF',
};

// ============================================================================
// SAAS COLOR PALETTE - Dark Theme
// ============================================================================
const darkColors = {
  // Primary Brand Colors
  primary: '#3B82F6',
  primaryHover: '#60A5FA',
  primaryLight: '#1E40AF',
  primaryLightest: '#1E3A8A',
  primaryDark: '#2563EB',
  onPrimary: '#FFFFFF',
  
  // Secondary Accent (Purple - Premium features)
  secondary: '#A78BFA',
  secondaryHover: '#C4B5FD',
  secondaryLight: '#7C3AED',
  secondaryLightest: '#5B21B6',
  onSecondary: '#1F2937',
  
  // Tertiary
  tertiary: '#2DD4BF',
  tertiaryHover: '#5EEAD4',
  tertiaryLight: '#0D9488',
  tertiaryLightest: '#134E4A',
  onTertiary: '#1F2937',
  
  // Semantic Colors
  success: '#34D399',
  successHover: '#6EE7B7',
  successLight: '#064E3B',
  successDark: '#059669',
  onSuccess: '#000000',
  
  warning: '#FBBF24',
  warningHover: '#FCD34D',
  warningLight: '#78350F',
  warningDark: '#D97706',
  onWarning: '#000000',
  
  error: '#F87171',
  errorHover: '#FCA5A5',
  errorLight: '#7F1D1D',
  errorDark: '#DC2626',
  onError: '#000000',
  
  info: '#60A5FA',
  infoHover: '#93C5FD',
  infoLight: '#1E3A8A',
  infoDark: '#2563EB',
  onInfo: '#000000',
  
  // Neutral Grays (Dark Mode)
  gray50: '#18181B',
  gray100: '#27272A',
  gray200: '#3F3F46',
  gray300: '#52525B',
  gray400: '#71717A',
  gray500: '#A1A1AA',
  gray600: '#D4D4D8',
  gray700: '#E4E4E7',
  gray800: '#F4F4F5',
  gray900: '#FAFAFA',
  
  // Background & Surfaces
  background: '#18181B',
  surface: '#1F1F23',
  surfaceSecondary: '#27272A',
  surfaceTertiary: '#3F3F46',
  surfaceElevated: '#27272A',
  onBackground: '#FAFAFA',
  onSurface: '#FAFAFA',
  onSurfaceVariant: '#A1A1AA',
  
  // Surface containers (Material 3 compatibility)
  surfaceContainerLowest: '#18181B',
  surfaceContainerLow: '#1F1F23',
  surfaceContainer: '#27272A',
  surfaceContainerHigh: '#3F3F46',
  surfaceContainerHighest: '#52525B',
  surfaceVariant: '#3F3F46',
  
  // Text Colors
  textPrimary: '#FAFAFA',
  textSecondary: '#D4D4D8',
  textTertiary: '#A1A1AA',
  textDisabled: '#71717A',
  textInverse: '#18181B',
  textOnPrimary: '#FFFFFF',
  
  // Border Colors
  border: '#3F3F46',
  borderHover: '#52525B',
  borderFocus: '#3B82F6',
  borderError: '#F87171',
  borderSuccess: '#34D399',
  outline: '#3F3F46',
  outlineVariant: '#52525B',
  
  // Interactive States
  hoverOverlay: 'rgba(255, 255, 255, 0.06)',
  pressedOverlay: 'rgba(255, 255, 255, 0.1)',
  selectedBackground: '#1E3A8A',
  disabledBackground: '#27272A',
  
  // Skeleton/Loading
  skeleton: '#3F3F46',
  skeletonHighlight: '#52525B',
  
  // Focus Ring
  focusRing: 'rgba(59, 130, 246, 0.4)',
  
  // Scrim/Overlay
  scrim: 'rgba(0, 0, 0, 0.7)',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  shadow: '#000000',
  
  // Special Purpose
  revenue: '#34D399',
  pending: '#FBBF24',
  failed: '#F87171',
  activeTrip: '#60A5FA',
  premium: '#A78BFA',
  notification: '#F87171',
  
  // Card Specific
  cardBackground: '#18181B',
  cardBorder: '#3F3F46',
  cardShadow: 'rgba(0, 0, 0, 0.4)',
  
  // Input Specific
  inputBackground: '#27272A',
  inputBorder: '#52525B',
  inputBorderFocus: '#3B82F6',
  inputPlaceholder: '#71717A',
  
  // Navigation
  navBackground: '#18181B',
  navBorder: '#3F3F46',
  navActive: '#3B82F6',
  navInactive: '#A1A1AA',
  navActiveBackground: '#1E3A8A',
  
  // Sidebar
  sidebarBackground: '#18181B',
  sidebarBorder: '#3F3F46',
  sidebarItemHover: '#27272A',
  sidebarItemActive: '#1E3A8A',
  sidebarItemActiveBorder: '#3B82F6',
  
  // Table
  tableHeader: '#27272A',
  tableRow: '#18181B',
  tableRowHover: '#27272A',
  tableRowSelected: '#1E3A8A',
  tableBorder: '#3F3F46',
  
  // Badge Colors
  badgeSuccess: '#064E3B',
  badgeSuccessText: '#34D399',
  badgeWarning: '#78350F',
  badgeWarningText: '#FBBF24',
  badgeError: '#7F1D1D',
  badgeErrorText: '#F87171',
  badgeInfo: '#1E3A8A',
  badgeInfoText: '#60A5FA',
  badgeNeutral: '#3F3F46',
  badgeNeutralText: '#D4D4D8',
  badgePremium: '#5B21B6',
  badgePremiumText: '#A78BFA',
  
  // Role Badges
  driverBadge: '#78350F',
  driverBadgeText: '#FBBF24',
  onDriverBadge: '#FBBF24',
  passengerBadge: '#1E3A8A',
  passengerBadgeText: '#60A5FA',
  onPassengerBadge: '#60A5FA',
  
  // Containers (M3 compatibility)
  primaryContainer: '#1E3A8A',
  onPrimaryContainer: '#93C5FD',
  secondaryContainer: '#5B21B6',
  onSecondaryContainer: '#C4B5FD',
  tertiaryContainer: '#134E4A',
  onTertiaryContainer: '#5EEAD4',
  errorContainer: '#7F1D1D',
  onErrorContainer: '#FCA5A5',
  successContainer: '#064E3B',
  onSuccessContainer: '#6EE7B7',
  warningContainer: '#78350F',
  onWarningContainer: '#FCD34D',
  
  // Chart Colors
  chartPrimary: '#3B82F6',
  chartSecondary: '#A78BFA',
  chartSuccess: '#34D399',
  chartWarning: '#FBBF24',
  chartError: '#F87171',
  chartGradientStart: '#3B82F6',
  chartGradientEnd: '#60A5FA',
  chartGrid: '#3F3F46',
  chartAxis: '#A1A1AA',
  
  // Toast Colors
  toastSuccess: '#18181B',
  toastSuccessBorder: '#34D399',
  toastError: '#18181B',
  toastErrorBorder: '#F87171',
  toastWarning: '#18181B',
  toastWarningBorder: '#FBBF24',
  toastInfo: '#18181B',
  toastInfoBorder: '#60A5FA',
  
  // Inverse
  inverseSurface: '#E4E4E7',
  inverseOnSurface: '#27272A',
  inversePrimary: '#1E40AF',
  
  // Surface tint
  surfaceTint: '#3B82F6',
};

// ============================================================================
// PROFESSIONAL TYPOGRAPHY SYSTEM
// ============================================================================
const createTypography = () => ({
  // Display (Hero numbers, large metrics)
  displayXL: {
    fontSize: 60,
    lineHeight: 66,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  displayLarge: {
    fontSize: 48,
    lineHeight: 53,
    fontWeight: '700',
    letterSpacing: -0.96,
  },
  displayMedium: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.72,
  },
  displaySmall: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  
  // Headings
  headingXL: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headlineLarge: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: 0,
  },
  headlineMedium: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: 0,
  },
  headlineSmall: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0,
  },
  
  // Title (Card headers, section titles)
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: 0,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  
  // Body
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0,
  },
  
  // Label (Form labels, button text)
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0,
  },
  labelMedium: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  labelXSmall: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  
  // Caption (Timestamps, hints)
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  
  // Button specific
  buttonLarge: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0,
  },
  buttonMedium: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0,
  },
  buttonSmall: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0,
  },
  
  // Monospace (numbers, codes)
  mono: {
    fontFamily: Platform.select({
      ios: 'SF Mono',
      android: 'monospace',
      default: 'monospace',
    }),
    fontWeight: '500',
  },
});

// ============================================================================
// SPACING SYSTEM (8px base)
// ============================================================================
const createSpacing = () => ({
  '0': 0,
  '0.5': 4,
  '1': 8,
  '1.5': 12,
  '2': 16,
  '2.5': 20,
  '3': 24,
  '4': 32,
  '5': 40,
  '6': 48,
  '8': 64,
  
  // Named spacing for semantic use
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
  
  // Component-specific
  cardPadding: 24,
  cardPaddingCompact: 16,
  inputPadding: 12,
  buttonPadding: 12,
  listItemPadding: 16,
  sectionGap: 32,
  pageMargin: 24,
  
  // Touch targets
  touchTarget: 44,
  minTouchTarget: 44,
});

// ============================================================================
// BORDER RADIUS SYSTEM (Rounded SaaS Style)
// ============================================================================
const createBorderRadius = () => ({
  none: 0,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 32,
  full: 9999,
  
  // Component-specific (more rounded for modern SaaS look)
  card: 16,
  button: 12,
  input: 12,
  modal: 24,
  badge: 20,
  chip: 12,
  avatar: 9999,
  tooltip: 10,
  
  // Legacy aliases (for backward compatibility)
  extraSmall: 6,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 24,
});

// ============================================================================
// ELEVATION & SHADOW SYSTEM
// ============================================================================
const createElevation = (isDark) => {
  const shadowColor = isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 1)';
  const highlightBorder = isDark ? 'rgba(255, 255, 255, 0.05)' : 'transparent';
  
  return {
    level0: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    level1: {
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.15 : 0.08,
      shadowRadius: 3,
      elevation: 1,
    },
    level2: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    level3: {
      shadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 15,
      elevation: 6,
    },
    level4: {
      shadowColor,
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: isDark ? 0.3 : 0.12,
      shadowRadius: 25,
      elevation: 12,
    },
    level5: {
      shadowColor,
      shadowOffset: { width: 0, height: 25 },
      shadowOpacity: isDark ? 0.35 : 0.15,
      shadowRadius: 50,
      elevation: 24,
    },
    
    // Semantic shadows
    card: {
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.15 : 0.08,
      shadowRadius: 3,
      elevation: 1,
    },
    cardHover: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    dropdown: {
      shadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.25 : 0.12,
      shadowRadius: 20,
      elevation: 8,
    },
    modal: {
      shadowColor,
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: isDark ? 0.4 : 0.2,
      shadowRadius: 60,
      elevation: 24,
    },
    toast: {
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowRadius: 24,
      elevation: 8,
    },
    button: {
      shadowColor: isDark ? 'transparent' : 'rgba(0, 102, 255, 0.2)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 2,
    },
    buttonHover: {
      shadowColor: isDark ? 'transparent' : 'rgba(0, 102, 255, 0.3)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 4,
    },
    input: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    inputFocus: {
      shadowColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(0, 102, 255, 0.25)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 3,
      elevation: 0,
    },
  };
};

// ============================================================================
// ANIMATION SYSTEM
// ============================================================================
const createAnimation = () => ({
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 400,
    slower: 600,
    medium1: 200,
    medium2: 300,
    long1: 400,
    long2: 600,
  },
  
  easing: {
    default: 'ease-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  
  // Spring configurations for Animated API
  spring: {
    default: {
      tension: 100,
      friction: 10,
    },
    gentle: {
      tension: 50,
      friction: 8,
    },
    bouncy: {
      tension: 150,
      friction: 6,
    },
    stiff: {
      tension: 200,
      friction: 12,
    },
  },
});

// ============================================================================
// COMPONENT SIZES
// ============================================================================
const createComponentSizes = () => ({
  // Button heights
  buttonSmall: 36,
  buttonMedium: 44,
  buttonLarge: 52,
  
  // Input heights
  inputSmall: 36,
  inputMedium: 44,
  inputLarge: 52,
  
  // Avatar sizes
  avatarSmall: 32,
  avatarMedium: 40,
  avatarLarge: 56,
  avatarXLarge: 80,
  
  // Icon sizes
  iconSmall: 16,
  iconMedium: 20,
  iconLarge: 24,
  iconXLarge: 32,
  
  // Badge sizes
  badgeSmall: 20,
  badgeMedium: 24,
  badgeLarge: 32,
  
  // Navigation
  topNavHeight: 64,
  bottomNavHeight: 80,
  sidebarWidth: 260,
  sidebarCollapsedWidth: 72,
  
  // Cards
  cardMinWidth: 280,
  cardMaxWidth: 400,
  
  // Modal
  modalSmall: 400,
  modalMedium: 600,
  modalLarge: 900,
  
  // Toast
  toastWidth: 400,
  toastMinWidth: 300,
});

// ============================================================================
// ACCENT COLORS (User selectable)
// ============================================================================
export const AccentColors = {
  blue: {
    light: '#0066FF',
    dark: '#3B82F6',
    name: 'Blue',
  },
  purple: {
    light: '#7C3AED',
    dark: '#A78BFA',
    name: 'Purple',
  },
  teal: {
    light: '#0D9488',
    dark: '#2DD4BF',
    name: 'Teal',
  },
  green: {
    light: '#16A34A',
    dark: '#22C55E',
    name: 'Green',
  },
  orange: {
    light: '#EA580C',
    dark: '#F97316',
    name: 'Orange',
  },
  pink: {
    light: '#DB2777',
    dark: '#EC4899',
    name: 'Pink',
  },
  red: {
    light: '#DC2626',
    dark: '#EF4444',
    name: 'Red',
  },
  indigo: {
    light: '#4F46E5',
    dark: '#6366F1',
    name: 'Indigo',
  },
};

// Legacy ColorSeeds for backward compatibility
export const ColorSeeds = AccentColors;

const DEFAULT_ACCENT = 'blue';

// ============================================================================
// THEME PROVIDER
// ============================================================================
export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState(ThemeMode.SYSTEM);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedTheme, savedAccent] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(ACCENT_COLOR_KEY),
        ]);
        
        if (savedTheme) setThemeMode(savedTheme);
        if (savedAccent && AccentColors[savedAccent]) setAccentColor(savedAccent);
      } catch (error) {
        console.error('Error loading theme preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreferences();
  }, []);
  
  // Determine if dark mode based on theme mode
  const isDark = useMemo(() => {
    if (themeMode === ThemeMode.SYSTEM) {
      return systemColorScheme === 'dark';
    }
    return themeMode === ThemeMode.DARK;
  }, [themeMode, systemColorScheme]);
  
  // Get colors with accent applied
  const colors = useMemo(() => {
    const baseColors = isDark ? darkColors : lightColors;
    const accent = AccentColors[accentColor] || AccentColors.blue;
    
    // Override primary color with selected accent
    return {
      ...baseColors,
      primary: isDark ? accent.dark : accent.light,
      primaryHover: isDark ? accent.dark : accent.light,
      navActive: isDark ? accent.dark : accent.light,
      borderFocus: isDark ? accent.dark : accent.light,
      inputBorderFocus: isDark ? accent.dark : accent.light,
      focusRing: isDark ? `${accent.dark}40` : `${accent.light}40`,
      selectedBackground: isDark ? `${accent.dark}20` : `${accent.light}15`,
      navActiveBackground: isDark ? `${accent.dark}25` : `${accent.light}15`,
      sidebarItemActive: isDark ? `${accent.dark}25` : `${accent.light}15`,
      sidebarItemActiveBorder: isDark ? accent.dark : accent.light,
      chartPrimary: isDark ? accent.dark : accent.light,
      chartGradientStart: isDark ? accent.dark : accent.light,
      surfaceTint: isDark ? accent.dark : accent.light,
    };
  }, [isDark, accentColor]);
  
  // Create complete theme object
  const theme = useMemo(() => ({
    colors,
    typography: createTypography(),
    spacing: createSpacing(),
    borderRadius: createBorderRadius(),
    elevation: createElevation(isDark),
    animation: createAnimation(),
    componentSizes: createComponentSizes(),
    isDark,
    themeMode,
    accentColor,
    
    // Convenience aliases for backward compatibility
    touchTargets: createComponentSizes(),
    easing: createAnimation().easing,
  }), [colors, isDark, themeMode, accentColor]);
  
  // Update theme mode
  const updateThemeMode = useCallback(async (mode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeMode(mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  }, []);
  
  // Update accent color
  const updateAccentColor = useCallback(async (color) => {
    if (!AccentColors[color]) return;
    try {
      await AsyncStorage.setItem(ACCENT_COLOR_KEY, color);
      setAccentColor(color);
    } catch (error) {
      console.error('Error saving accent color:', error);
    }
  }, []);
  
  // Legacy compatibility
  const updateSeedColor = updateAccentColor;
  
  const value = useMemo(() => ({
    ...theme,
    updateThemeMode,
    updateAccentColor,
    updateSeedColor,
    isLoading,
    AccentColors,
    ColorSeeds: AccentColors,
    seedColor: accentColor,
  }), [theme, updateThemeMode, updateAccentColor, isLoading, accentColor]);
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
