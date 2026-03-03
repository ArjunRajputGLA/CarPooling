import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Alert, Linking as RNLinking, AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '../services/api';

// Session timeout configuration (in milliseconds)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every 1 minute
const LAST_ACTIVITY_KEY = '@carpooling_last_activity';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Driver email constant
const DRIVER_EMAIL = 'imstorm23203@gmail.com';

// Determine role based on email
const getRoleForEmail = (email) => {
  return email?.toLowerCase().trim() === DRIVER_EMAIL ? 'driver' : 'passenger';
};

// Error messages mapping for user-friendly display
const ERROR_MESSAGES = {
  'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
  'Email not confirmed': 'Please verify your email address before signing in.',
  'User already registered': 'An account with this email already exists. Please sign in instead.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
  'Unable to validate email address: invalid format': 'Please enter a valid email address.',
  'Signup is disabled': 'Registration is currently disabled. Please contact support.',
  'Email rate limit exceeded': 'Too many requests. Please wait a few minutes and try again.',
  'For security purposes, you can only request this once every 60 seconds': 'Please wait 60 seconds before requesting again.',
  'Network request failed': 'Network error. Please check your internet connection.',
  'fetch failed': 'Connection failed. Please check your internet connection.',
  'duplicate key value': 'This account already exists.',
};

// Get user-friendly error message
const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred';
  
  const errorMsg = error.message || error.toString();
  
  // Check for known error messages
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (errorMsg.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Network-related errors
  if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('timeout')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  return errorMsg;
};

// Show error alert
const showErrorAlert = (title, message, onPress = null) => {
  Alert.alert(
    title,
    message,
    [{ text: 'OK', onPress }],
    { cancelable: true }
  );
};

// Show success alert
const showSuccessAlert = (title, message, onPress = null) => {
  Alert.alert(
    title,
    message,
    [{ text: 'OK', onPress }],
    { cancelable: true }
  );
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
    const appState = useRef(AppState.currentState);
    const activityTimerRef = useRef(null);
    const isChangingPasswordRef = useRef(false);

    // Track user activity - call this from screens on interaction
    const updateLastActivity = useCallback(async () => {
        try {
            await AsyncStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        } catch (e) {
            // Silent fail
        }
    }, []);

    const checkSessionTimeout = useCallback(async () => {
        try {
            const lastActivity = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
            if (!lastActivity) {
                await updateLastActivity();
                return false;
            }
            
            const elapsed = Date.now() - parseInt(lastActivity, 10);
            if (elapsed > SESSION_TIMEOUT_MS) {
                console.log('Session timeout detected, elapsed:', Math.round(elapsed / 1000 / 60), 'minutes');
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }, [updateLastActivity]);

    // Handle app state changes (foreground/background)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // App came to foreground - check timeout
                if (session) {
                    const timedOut = await checkSessionTimeout();
                    if (timedOut) {
                        Alert.alert(
                            'Session Expired',
                            'Your session has expired due to inactivity. Please sign in again.',
                            [{ text: 'OK', onPress: () => signOut(false) }]
                        );
                        return;
                    }
                }
                await updateLastActivity();
            } else if (nextAppState.match(/inactive|background/)) {
                // App going to background - save activity timestamp
                await updateLastActivity();
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription?.remove();
        };
    }, [session, checkSessionTimeout, updateLastActivity]);

    // Periodic activity check while app is active
    useEffect(() => {
        if (session) {
            updateLastActivity();
            activityTimerRef.current = setInterval(async () => {
                const timedOut = await checkSessionTimeout();
                if (timedOut) {
                    clearInterval(activityTimerRef.current);
                    Alert.alert(
                        'Session Expired',
                        'Your session has expired due to inactivity. Please sign in again.',
                        [{ text: 'OK', onPress: () => signOut(false) }]
                    );
                }
            }, ACTIVITY_CHECK_INTERVAL);
        }

        return () => {
            if (activityTimerRef.current) {
                clearInterval(activityTimerRef.current);
            }
        };
    }, [session]);

    useEffect(() => {
        console.log('AuthProvider mounted');
        
        // Initialize auth first
        initializeAuth();

        // Listen for deep link URLs (for password recovery)
        const handleDeepLink = async (event) => {
            const url = event?.url || event;
            if (!url) return;
            console.log('Deep link received:', url);
            
            try {
                // Check if this is a recovery/reset-password link
                if (url.includes('reset-password') || url.includes('type=recovery')) {
                    // Extract tokens from URL fragment or query
                    let params;
                    if (url.includes('#')) {
                        params = new URLSearchParams(url.split('#')[1]);
                    } else if (url.includes('?')) {
                        params = new URLSearchParams(url.split('?')[1]);
                    }
                    
                    const accessToken = params?.get('access_token');
                    const refreshToken = params?.get('refresh_token');
                    
                    if (accessToken) {
                        console.log('Recovery tokens found, setting session...');
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });
                        if (error) {
                            console.error('Failed to set recovery session:', error);
                        }
                        // PASSWORD_RECOVERY event will be fired by onAuthStateChange
                    }
                }
            } catch (e) {
                console.error('Deep link handling error:', e);
            }
        };

        // Check if app was opened via a deep link
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink(url);
        });

        // Listen for incoming deep links while app is open
        const linkingSubscription = RNLinking.addEventListener('url', handleDeepLink);

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state change:', event);

                // CRITICAL: Block all auth state handling if password change is in progress
                if (isChangingPasswordRef.current) {
                    console.log('Blocking auth state update during password change sequence');
                    return;
                }
                
                // Handle password recovery flow
                if (event === 'PASSWORD_RECOVERY') {
                    console.log('Password recovery event detected');
                    setIsPasswordRecovery(true);
                    setSession(session);
                    setUser(session?.user || null);
                    setLoading(false);
                    return;
                }
                
                // Skip if still initializing to avoid race condition
                if (initializing && event === 'TOKEN_REFRESHED') {
                    console.log('Skipping TOKEN_REFRESHED during initialization');
                    return;
                }
                
                setSession(session);
                setUser(session?.user || null);
                
                if (session?.user) {
                    // Only fetch profile on specific events to prevent infinite loops (e.g. during password update)
                    // We definitely want to fetch on SIGNED_IN and INITIAL_SESSION
                    // We avoid fetching on USER_UPDATED (password change) and TOKEN_REFRESHED unless profile is missing
                    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || !profile) {
                         // Fetch profile when session changes
                         await fetchProfile(session.user.id, session.user);
                    } else {
                        // For other events, just ensure we're not stuck in loading
                        if (loading) setLoading(false);
                    }
                } else {
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
            linkingSubscription?.remove();
        };
    }, []);

    // Initialize authentication
    const initializeAuth = async () => {
        console.log('initializeAuth started');
        try {
            // Get current session
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Session fetch error:', error);
                setLoading(false);
                setInitializing(false);
                return;
            }

            console.log('Session fetch result:', session ? 'Session found' : 'No session');
            
            setSession(session);
            setUser(session?.user || null);
            
            if (session?.user) {
                console.log('Fetching profile for user:', session.user.id);
                await fetchProfile(session.user.id, session.user);
            } else {
                console.log('No session, setting loading to false');
                setLoading(false);
            }
        } catch (e) {
            console.error('Auth initialization error:', e);
            setLoading(false);
        } finally {
            setInitializing(false);
        }
    };

    // Fetch user profile from database
    const fetchProfile = async (userId, authUser = null) => {
        console.log('fetchProfile started for userId:', userId);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            console.log('fetchProfile result:', { data: data ? 'Found' : 'Not found', error: error?.code });

            if (error) {
                if (error.code === 'PGRST116') {
                    // User not found in public.users table - create it
                    console.log('User profile not found, creating new profile...');
                    await createProfileForUser(userId, authUser);
                    return;
                } else if (error.code === '42P17') {
                    // RLS infinite recursion error
                    console.log('RLS policy error, attempting to create profile...');
                    await createProfileForUser(userId, authUser);
                    return;
                } else {
                    console.error('Error fetching profile:', error);
                    setAuthError('Failed to fetch user profile');
                }
            } else if (data) {
                console.log('Profile found:', data.email, 'Role:', data.role);
                
                // Check if this is a "zombie" deleted profile (from old soft-delete)
                if (data.email?.includes('@deleted.com') || data.full_name === 'Deleted User') {
                    console.log('Detected deleted user profile, blocking access');
                    
                    // Clean up the zombie record
                    await supabase.from('users').delete().eq('id', userId);
                    
                    // Store deletion flag
                    await AsyncStorage.setItem(`@deleted_user_${userId}`, 'true');
                    
                    Alert.alert(
                        'Account Deleted',
                        'This account has been permanently deleted. Please create a new account with a different email.',
                        [{ text: 'OK' }]
                    );
                    
                    await supabase.auth.signOut();
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                    return;
                }
                
                setProfile(data);
                setAuthError(null);
            }
        } catch (e) {
            console.error('Profile fetch exception:', e);
        } finally {
            console.log('fetchProfile completed, setting loading to false');
            setLoading(false);
        }
    };

    // Create a profile for user if it doesn't exist (handles account linking)
    const createProfileForUser = async (userId, authUserParam = null) => {
        try {
            // Check if this user was previously deleted
            const wasDeleted = await AsyncStorage.getItem(`@deleted_user_${userId}`);
            if (wasDeleted === 'true') {
                console.log('User was previously deleted, blocking profile creation');
                Alert.alert(
                    'Account Deleted',
                    'This account has been permanently deleted. Please contact support or create a new account with a different email.',
                    [{ text: 'OK' }]
                );
                await supabase.auth.signOut();
                setSession(null);
                setUser(null);
                setProfile(null);
                setLoading(false);
                return;
            }

            // Get user details from auth if not provided
            let authUser = authUserParam;
            if (!authUser) {
                const { data: { user: fetchedUser } } = await supabase.auth.getUser();
                authUser = fetchedUser;
            }
            
            if (!authUser) {
                console.log('No auth user found');
                setLoading(false);
                return;
            }

            const email = authUser.email;
            const role = getRoleForEmail(email);
            const metadata = authUser?.user_metadata || {};
            
            console.log('Creating profile for:', email, 'with role:', role);

            // Check if a profile with this email already exists
            const { data: existingByEmail } = await supabase
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .single();

            if (existingByEmail && existingByEmail.id !== userId) {
                // Account exists with different ID
                console.log('Found existing profile with same email but different ID');
                setProfile(existingByEmail);
                setLoading(false);
                return;
            }

            // Try to insert new profile
            const { data: newProfile, error: insertError } = await supabase
                .from('users')
                .insert({
                    id: userId,
                    email: email.toLowerCase(),
                    role: role,
                    full_name: metadata.full_name || null,
                    phone: metadata.phone || null,
                })
                .select()
                .single();

            if (insertError) {
                // Profile might already exist, try to fetch it
                if (insertError.code === '23505') { // Duplicate key
                    console.log('Profile already exists, fetching...');
                    const { data: existingProfile } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', userId)
                        .single();
                    
                    if (existingProfile) {
                        setProfile(existingProfile);
                    }
                } else {
                    console.error('Error creating profile:', insertError);
                    setAuthError('Failed to create user profile');
                }
            } else {
                console.log('Profile created successfully');
                setProfile(newProfile);
            }
        } catch (e) {
            console.error('Create profile exception:', e);
            setAuthError('Failed to create user profile');
        } finally {
            setLoading(false);
        }
    };

    // Sign in with email and password
    const signIn = async (email, password) => {
        setAuthError(null);
        
        try {
            // Use backend API instead of direct Supabase call
            const { session, user } = await api.auth.login(email.toLowerCase().trim(), password);
            
            if (!session || !user) {
                throw new Error('Invalid login response from server');
            }

            // Manually set the session in Supabase client for DB access
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
            });

            if (sessionError) {
                console.error('Failed to set session in Supabase client:', sessionError);
                // We continue anyway as we have the session from backend
            }
            
            // Set initial activity timestamp on successful login
            await updateLastActivity();
            
            return { session, user };
        } catch (e) {
            const friendlyMessage = getErrorMessage(e);
            setAuthError(friendlyMessage);
            throw new Error(friendlyMessage);
        }
    };

    // Sign up with email and password
    const signUp = async (email, password, metadata = {}) => {
        setAuthError(null);
        try {
            // Use backend API instead of direct Supabase call
            const { session, user } = await api.auth.signup(email.toLowerCase().trim(), password, metadata);

            if (session && user) {
                 // Manually set the session in Supabase client for DB access
                 const { error: sessionError } = await supabase.auth.setSession({
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                });
                
                if (sessionError) {
                     console.error('Failed to set session in Supabase client:', sessionError);
                }
                
                await updateLastActivity();
            }
            
            return { session, user };
        } catch (e) {
            const friendlyMessage = getErrorMessage(e);
            setAuthError(friendlyMessage);
            throw new Error(friendlyMessage);
        }
    };



    // Sign out
    const signOut = async (showConfirm = true) => {
        const doSignOut = async () => {
            try {
                setLoading(true);
                
                // Clear any stored data
                await AsyncStorage.multiRemove([
                    '@carpooling_user_preferences',
                    '@carpooling_remembered_email',
                    '@carpooling_last_activity',
                ]);
                
                const { error } = await supabase.auth.signOut();
                
                if (error) {
                    console.error('Sign out error:', error);
                    showErrorAlert('Sign Out Error', 'Failed to sign out. Please try again.');
                }
                
                setSession(null);
                setUser(null);
                setProfile(null);
                setAuthError(null);
            } catch (e) {
                console.error('Sign out exception:', e);
            } finally {
                setLoading(false);
            }
        };

        if (showConfirm) {
            Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
                ]
            );
        } else {
            await doSignOut();
        }
    };

    // Update user profile
    const updateProfile = async (updates) => {
        if (!user?.id) return { error: 'No user logged in' };
        
        try {
            // First check if profile exists
            const { data: existingProfile, error: fetchError } = await supabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single();

            let data, error;

            if (fetchError && fetchError.code === 'PGRST116') {
                // Profile doesn't exist, create it
                const email = user.email;
                const role = getRoleForEmail(email);
                
                // Only include columns that exist in the database
                const insertData = {
                    id: user.id,
                    email: email,
                    role: role,
                    full_name: updates.full_name || null,
                    phone: updates.phone || null,
                    profile_picture_url: updates.profile_picture_url || null,
                };
                
                const result = await supabase
                    .from('users')
                    .insert(insertData)
                    .select()
                    .single();
                
                data = result.data;
                error = result.error;
            } else {
                // Profile exists, update it - only include valid columns
                const updateData = {};
                if (updates.full_name !== undefined) updateData.full_name = updates.full_name;
                if (updates.phone !== undefined) updateData.phone = updates.phone;
                if (updates.profile_picture_url !== undefined) updateData.profile_picture_url = updates.profile_picture_url;
                updateData.updated_at = new Date().toISOString();
                
                const result = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', user.id)
                    .select()
                    .single();
                
                data = result.data;
                error = result.error;
            }
            
            if (error) {
                const friendlyMessage = getErrorMessage(error);
                throw new Error(friendlyMessage);
            }
            
            setProfile(data);
            return { data, error: null };
        } catch (e) {
            console.error('Update profile error:', e);
            return { data: null, error: e.message };
        }
    };

    // Refresh profile data
    const refreshProfile = async () => {
        if (user?.id) {
            await fetchProfile(user.id, user);
        }
    };

    // Reset password
    const resetPassword = async (email) => {
        try {
            const redirectUrl = Linking.createURL('reset-password');
            const { error } = await supabase.auth.resetPasswordForEmail(
                email.toLowerCase().trim(),
                {
                    redirectTo: redirectUrl,
                }
            );
            
            if (error) {
                const friendlyMessage = getErrorMessage(error);
                throw new Error(friendlyMessage);
            }
        } catch (e) {
            const friendlyMessage = getErrorMessage(e);
            throw new Error(friendlyMessage);
        }
    };

    // Update password
    const updatePassword = async (newPassword) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });
            
            if (error) {
                const friendlyMessage = getErrorMessage(error);
                throw new Error(friendlyMessage);
            }
            
            // Clear recovery mode after successful password update
            setIsPasswordRecovery(false);
        } catch (e) {
            const friendlyMessage = getErrorMessage(e);
            throw new Error(friendlyMessage);
        }
    };

    // Check if email exists
    const checkEmailExists = async (email) => {
        try {
            const { data } = await supabase
                .from('users')
                .select('email')
                .eq('email', email.toLowerCase().trim())
                .single();
            
            return !!data;
        } catch (e) {
            return false;
        }
    };

    // Check if phone exists
    const checkPhoneExists = async (phone) => {
        try {
            const { data } = await supabase
                .from('users')
                .select('phone')
                .eq('phone', phone)
                .single();
            
            return !!data;
        } catch (e) {
            return false;
        }
    };

    const value = {
        // State
        session,
        user,
        profile,
        loading,
        authError,
        isPasswordRecovery,
        
        // Auth methods
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        
        // Profile methods
        updateProfile,
        refreshProfile,
        setProfile,
        
        // Session management
        updateLastActivity,
        setIsChangingPassword: (val) => { isChangingPasswordRef.current = val; },
        
        // Utility methods
        checkEmailExists,
        checkPhoneExists,
        showErrorAlert,
        showSuccessAlert,
        getErrorMessage,
        
        // Computed values
        isAuthenticated: !!session,
        isDriver: profile?.role === 'driver',
        isPassenger: profile?.role === 'passenger',
        isAdmin: profile?.role === 'driver', // Driver has admin privileges
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
