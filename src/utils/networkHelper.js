import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Alert } from 'react-native';

// Cache keys
const CACHE_PREFIX = '@carpooling_cache_';
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Simple network check by attempting to fetch Supabase health
 */
export const checkNetworkStatus = async () => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://www.google.com/generate_204', {
            method: 'HEAD',
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok || response.status === 204;
    } catch (e) {
        return false;
    }
};

/**
 * Cache data to AsyncStorage with expiry
 */
export const cacheData = async (key, data) => {
    try {
        const cacheEntry = {
            data,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
    } catch (e) {
        console.warn('Cache write error:', e);
    }
};

/**
 * Read cached data from AsyncStorage
 * Returns null if expired or not found
 */
export const getCachedData = async (key, maxAge = CACHE_EXPIRY_MS) => {
    try {
        const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        
        const { data, timestamp } = JSON.parse(raw);
        const age = Date.now() - timestamp;
        
        if (age > maxAge) {
            // Expired, but return stale data with a flag
            return { data, stale: true };
        }
        
        return { data, stale: false };
    } catch (e) {
        return null;
    }
};

/**
 * Clear all cached data
 */
export const clearCache = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
        if (cacheKeys.length > 0) {
            await AsyncStorage.multiRemove(cacheKeys);
        }
    } catch (e) {
        console.warn('Cache clear error:', e);
    }
};

/**
 * Queue an operation for later execution when offline
 */
const QUEUE_KEY = '@carpooling_offline_queue';

export const queueOfflineOperation = async (operation) => {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        const queue = raw ? JSON.parse(raw) : [];
        queue.push({
            ...operation,
            queuedAt: Date.now(),
        });
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.warn('Queue write error:', e);
    }
};

export const getOfflineQueue = async () => {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
};

export const clearOfflineQueue = async () => {
    try {
        await AsyncStorage.removeItem(QUEUE_KEY);
    } catch (e) {
        console.warn('Queue clear error:', e);
    }
};

/**
 * Custom hook for network-aware data fetching with caching
 * 
 * Usage:
 *   const { data, loading, error, isOffline, refetch } = useNetworkData(
 *     'driver_trips_today',
 *     fetchTripsFromSupabase,
 *     { deps: [carId] }
 *   );
 */
export const useNetworkData = (cacheKey, fetchFn, options = {}) => {
    const { deps = [], maxCacheAge = CACHE_EXPIRY_MS, enabled = true } = options;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(false);
    const [isStale, setIsStale] = useState(false);
    const mountedRef = useRef(true);

    const fetch = useCallback(async (showLoading = true) => {
        if (!enabled) return;
        
        if (showLoading) setLoading(true);
        setError(null);

        try {
            // Try to fetch fresh data
            const result = await fetchFn();
            if (mountedRef.current) {
                setData(result);
                setIsOffline(false);
                setIsStale(false);
                // Cache the fresh data
                if (cacheKey) {
                    await cacheData(cacheKey, result);
                }
            }
        } catch (e) {
            console.warn(`Fetch error for ${cacheKey}:`, e.message);
            
            // Check if it's a network error
            const isNetworkError = 
                e.message?.includes('network') || 
                e.message?.includes('fetch') || 
                e.message?.includes('timeout') ||
                e.message?.includes('Network request failed');

            if (isNetworkError && cacheKey) {
                // Try to load cached data
                const cached = await getCachedData(cacheKey, maxCacheAge * 2); // Allow stale on offline
                if (cached && mountedRef.current) {
                    setData(cached.data);
                    setIsStale(true);
                    setIsOffline(true);
                } else if (mountedRef.current) {
                    setError('No cached data available offline');
                    setIsOffline(true);
                }
            } else if (mountedRef.current) {
                setError(e.message || 'Failed to fetch data');
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [cacheKey, fetchFn, enabled, ...deps]);

    useEffect(() => {
        mountedRef.current = true;
        fetch();
        return () => { mountedRef.current = false; };
    }, [fetch]);

    return { data, loading, error, isOffline, isStale, refetch: fetch };
};

/**
 * Offline banner component helper - returns offline status info
 */
export const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(true);
    const checkIntervalRef = useRef(null);

    useEffect(() => {
        const check = async () => {
            const online = await checkNetworkStatus();
            setIsOnline(online);
        };

        check();

        // Check periodically
        checkIntervalRef.current = setInterval(check, 30000); // Every 30s

        // Check when app comes to foreground
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') check();
        });

        return () => {
            clearInterval(checkIntervalRef.current);
            sub?.remove();
        };
    }, []);

    return isOnline;
};
