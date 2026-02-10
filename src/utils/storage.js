// AsyncStorage helper functions
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  REMEMBERED_EMAIL: '@carpooling_remembered_email',
  REMEMBER_ME: '@carpooling_remember_me',
  USER_PREFERENCES: '@carpooling_user_preferences',
  THEME: '@carpooling_theme',
};

// Remember email functionality
export const saveRememberedEmail = async (email) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, email);
    await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
  } catch (error) {
    console.error('Error saving email:', error);
  }
};

export const getRememberedEmail = async () => {
  try {
    const rememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    if (rememberMe === 'true') {
      return await AsyncStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    }
    return null;
  } catch (error) {
    console.error('Error getting email:', error);
    return null;
  }
};

export const clearRememberedEmail = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'false');
  } catch (error) {
    console.error('Error clearing email:', error);
  }
};

export const isRememberMeEnabled = async () => {
  try {
    const rememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    return rememberMe === 'true';
  } catch (error) {
    return false;
  }
};

// User preferences
export const saveUserPreferences = async (preferences) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
};

export const getUserPreferences = async () => {
  try {
    const preferences = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    return preferences ? JSON.parse(preferences) : null;
  } catch (error) {
    console.error('Error getting preferences:', error);
    return null;
  }
};

// Theme
export const saveTheme = async (theme) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.error('Error saving theme:', error);
  }
};

export const getTheme = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  } catch (error) {
    return 'light';
  }
};

// Clear all app data
export const clearAllData = async () => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
};
