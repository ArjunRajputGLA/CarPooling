import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { View, Text, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { LucideHome, LucideQrCode, LucideUser, LucideScan, LucideHistory } from 'lucide-react-native';

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

// Theme
import { COLORS, TYPOGRAPHY, SPACING } from './src/constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Home screen that shows correct dashboard based on role
const HomeScreen = () => {
  const { profile, loading } = useAuth();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  if (profile?.role === 'driver') return <DriverDashboard />;
  return <PassengerDashboard />;
};

// Driver Tab Navigator
function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[500],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[200],
          paddingTop: SPACING.sm,
          paddingBottom: 35,
          height: 95,
        },
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.fontSize.xs,
          fontWeight: TYPOGRAPHY.fontWeight.medium,
        },
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTitleStyle: {
          fontSize: TYPOGRAPHY.fontSize.lg,
          fontWeight: TYPOGRAPHY.fontWeight.bold,
          color: COLORS.text.primary,
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={HomeScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <LucideHome color={color} size={size} />,
          tabBarLabel: 'Home',
          headerTitle: 'Driver Dashboard',
        }} 
      />
      <Tab.Screen 
        name="My QR" 
        component={QRCodeScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <LucideQrCode color={color} size={size} />,
          headerTitle: 'My QR Code',
        }} 
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <LucideHistory color={color} size={size} />,
          headerTitle: 'Trip History',
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <LucideUser color={color} size={size} />,
          headerTitle: 'My Profile',
        }} 
      />
    </Tab.Navigator>
  );
}

// Passenger Tab Navigator
function PassengerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[500],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[200],
          paddingTop: SPACING.sm,
          paddingBottom: 35,
          height: 95,
        },
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.fontSize.xs,
          fontWeight: TYPOGRAPHY.fontWeight.medium,
        },
        headerStyle: {
          backgroundColor: COLORS.white,
        },
        headerTitleStyle: {
          fontSize: TYPOGRAPHY.fontSize.lg,
          fontWeight: TYPOGRAPHY.fontWeight.bold,
          color: COLORS.text.primary,
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={HomeScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <LucideHome color={color} size={size} />,
          tabBarLabel: 'Home',
          headerTitle: 'Passenger Dashboard',
        }} 
      />
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <LucideScan color={color} size={size} />,
          headerTitle: 'Scan QR Code',
        }} 
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <LucideHistory color={color} size={size} />,
          headerTitle: 'My Trips',
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <LucideUser color={color} size={size} />,
          headerTitle: 'My Profile',
        }} 
      />
    </Tab.Navigator>
  );
}

// Loading Screen
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
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

// Main Navigation
function Navigation() {
  const { session, profile, loading, isPasswordRecovery } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Determine which screen to show
  const getMainComponent = () => {
    return profile?.role === 'driver' ? DriverTabs : PassengerTabs;
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background.light },
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

// Styles
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.light,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
  },
});

export default function App() {
  console.log('App Root Mounting');
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
