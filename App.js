import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { View, Text, ActivityIndicator, StyleSheet, Animated, Pressable } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LucideHome, LucideQrCode, LucideUser, LucideScan, LucideHistory, LucideMapPin } from 'lucide-react-native';
import { useEffect } from 'react';
import { testPushToken } from './src/utils/pushTest';

// Push token test is called inside the main App component below

// Auth Screens
import { LoginScreen, RegisterScreen, ForgotPasswordScreen, ResetPasswordScreen } from './src/screens/auth';

// Profile Screen
import { ProfileScreen } from './src/screens/profile';

// Dashboard Screens
import DriverDashboard from './src/screens/DriverDashboard';
import PassengerDashboard from './src/screens/PassengerDashboard';

// Other Screens
import ScanScreen from './src/screens/ScanScreen';
import QRCodeScreen from './src/screens/QRCodeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import MapScreen from './src/screens/MapScreen';

// Theme
import { COLORS, TYPOGRAPHY, SPACING } from './src/constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Material 3 Tab Bar Button with pill indicator
const M3TabBarButton = ({ children, onPress, accessibilityState }) => {
  const { colors, borderRadius, isDark } = useTheme();
  const focused = accessibilityState?.selected ?? false;
  const scale = React.useRef(new Animated.Value(1)).current;

  // Vibrant purple for active state
  const activeColor = '#7C3AED';
  const activeBackground = 'rgba(124, 58, 237, 0.1)';

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: focused ? activeBackground : 'transparent',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 8,
            minWidth: 64,
            alignItems: 'center',
          }}
        >
          {children}
        </View>
      </Animated.View>
    </Pressable>
  );
};

// Home screen that shows correct dashboard based on role
const HomeScreen = () => {
  const { profile, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (profile?.role === 'driver') return <DriverDashboard />;
  return <PassengerDashboard />;
};

// Driver Tab Navigator with Material 3 styling
function DriverTabs() {
  const { colors, typography, borderRadius, elevation, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Navigation bar colors
  const navBackground = isDark ? '#27272A' : '#FFFFFF';
  const activeColor = '#7C3AED';
  const inactiveColor = isDark ? '#71717A' : '#9CA3AF';
  const labelActiveColor = '#7C3AED';
  const labelInactiveColor = isDark ? '#A1A1AA' : '#6B7280';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: navBackground,
          borderTopWidth: isDark ? 1 : 0,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          height: 80 + insets.bottom,
          // Light mode shadow
          ...(isDark ? {} : {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 8,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarButton: (props) => <M3TabBarButton {...props} />,
        headerStyle: {
          backgroundColor: colors.surface,
          ...elevation.level0,
        },
        headerTitleStyle: {
          fontSize: typography.titleLarge.fontSize,
          fontWeight: '500',
          color: colors.onSurface,
        },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LucideHome color={color} size={24} />,
          tabBarLabel: 'Home',
          headerTitle: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="My QR"
        component={QRCodeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LucideQrCode color={color} size={24} />,
          headerTitle: 'My QR Code',
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LucideMapPin color={color} size={24} />,
          headerTitle: 'Live Map',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LucideHistory color={color} size={24} />,
          headerTitle: 'Trip History',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LucideUser color={color} size={24} />,
          headerTitle: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Passenger Tab Navigator with Material 3 styling
function PassengerTabs() {
  const { colors, typography, borderRadius, elevation, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Navigation bar colors
  const navBackground = isDark ? '#27272A' : '#FFFFFF';
  const activeColor = '#7C3AED';
  const inactiveColor = isDark ? '#71717A' : '#9CA3AF';
  const labelActiveColor = '#7C3AED';
  const labelInactiveColor = isDark ? '#A1A1AA' : '#6B7280';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: navBackground,
          borderTopWidth: isDark ? 1 : 0,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          height: 80 + insets.bottom,
          // Light mode shadow
          ...(isDark ? {} : {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 8,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarButton: (props) => <M3TabBarButton {...props} />,
        headerStyle: {
          backgroundColor: colors.surface,
          ...elevation.level0,
        },
        headerTitleStyle: {
          fontSize: typography.titleLarge.fontSize,
          fontWeight: '500',
          color: colors.onSurface,
        },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LucideHome color={color} size={24} />,
          tabBarLabel: 'Home',
          headerTitle: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LucideScan color={color} size={24} />,
          headerTitle: 'Scan QR Code',
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LucideMapPin color={color} size={24} />,
          headerTitle: 'Live Map',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LucideHistory color={color} size={24} />,
          headerTitle: 'My Trips',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <LucideUser color={color} size={24} />,
          headerTitle: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Loading Screen with Material 3 styling
function LoadingScreen() {
  const { colors, typography } = useTheme();

  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>Loading...</Text>
    </View>
  );
}

// Deep linking configuration for password reset
const linking = {
  prefixes: [
    'carpooling://',
    'com.carpooling.app://',
    'exp://',  // Expo development
  ],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

// Main Navigation with Material 3 theming
function Navigation() {
  const { session, profile, loading, isPasswordRecovery } = useAuth();
  const { colors, isDark } = useTheme();

  if (loading) {
    return <LoadingScreen />;
  }

  // Determine which screen to show
  const getMainComponent = () => {
    return profile?.role === 'driver' ? DriverTabs : PassengerTabs;
  };

  return (
    <NavigationContainer
      linking={linking}
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.onSurface,
          border: colors.outlineVariant,
          notification: colors.error,
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: 'normal',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: 'bold',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '700',
          },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        {isPasswordRecovery ? (
          // Password Reset Flow
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
          />
        ) : !session ? (
          // Auth Stack
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                animationTypeForReplace: !session ? 'pop' : 'push',
              }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        ) : (
          // Main App Stack
          <Stack.Screen
            name="Main"
            component={getMainComponent()}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ThemedApp wrapper that uses theme inside provider
function ThemedApp() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default function App() {
  console.log('App Root Mounting');

  useEffect(() => {
    testPushToken();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
} 