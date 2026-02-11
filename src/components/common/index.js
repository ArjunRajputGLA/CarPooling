// Export all common components
export { default as CustomInput } from './CustomInput';
export { default as PhoneInput } from './PhoneInput';
export { default as PasswordStrengthIndicator } from './PasswordStrengthIndicator';
export { default as ProfilePictureUpload } from './ProfilePictureUpload';
export { default as RoleBadge } from './RoleBadge';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as Toast, showToast, setToastRef } from './Toast';
export { default as OfflineBanner } from './OfflineBanner';
export { default as SwipeableScreen } from './SwipeableScreen';

// SaaS-Grade Material 3 Components
export { 
  M3Button, 
  LinkButton,
  M3FAB, 
  M3IconButton, 
  ButtonVariant, 
  ButtonSize 
} from './M3Button';

export { 
  M3Card, 
  M3MetricCard, 
  M3RevenueCard, 
  M3TripCard, 
  M3SectionCard,
  CardVariant 
} from './M3Card';

export { 
  M3Dialog, 
  M3ConfirmDialog, 
  M3ErrorDialog, 
  M3SuccessDialog, 
  M3InfoDialog, 
  M3WarningDialog,
  M3LoadingDialog, 
  DialogType 
} from './M3Dialog';

export { 
  M3TextField, 
  M3SearchInput,
  M3TextArea,
  TextFieldVariant,
  TextFieldSize 
} from './M3TextField';

export { 
  M3Chip, 
  M3StatusChip, 
  M3Badge,
  ChipVariant,
  ChipSize 
} from './M3Chip';

export { 
  M3EmptyState, 
  M3ErrorState,
  M3OfflineState,
  M3SearchEmptyState,
  EmptyStateType 
} from './M3EmptyState';

export { 
  default as ShimmerPlaceholder,
  M3CardSkeleton, 
  M3ListItemSkeleton, 
  M3MetricSkeleton,
  M3RevenueSkeleton,
  M3ProfileSkeleton,
  M3QRCodeSkeleton,
  M3TextSkeleton,
  M3AvatarSkeleton,
  M3ButtonSkeleton,
  M3DashboardSkeleton 
} from './M3Skeleton';

export { 
  M3SnackbarManager, 
  SnackbarType,
  showSnackbar,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  dismissSnackbar, 
  dismissAllSnackbars,
  setSnackbarRef 
} from './M3Snackbar';