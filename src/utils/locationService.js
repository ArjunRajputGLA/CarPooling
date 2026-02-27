import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

let locationSubscription = null;

/**
 * Request foreground location permission with graceful denial handling
 * @returns {boolean} Whether permission was granted
 */
export async function requestLocationPermission() {
    try {
        const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

        if (existingStatus === 'granted') {
            return true;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
            return true;
        }

        // Permission denied — show explanation
        Alert.alert(
            'Location Permission Required',
            'ShareWheels needs access to your location to show your position on the map and enable live trip tracking. Please enable location access in your device settings.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open Settings',
                    onPress: () => {
                        if (Platform.OS === 'ios') {
                            Linking.openURL('app-settings:');
                        } else {
                            Linking.openSettings();
                        }
                    }
                },
            ]
        );
        return false;
    } catch (error) {
        console.error('Error requesting location permission:', error);
        return false;
    }
}

/**
 * Request background location permission (for active trip tracking)
 * @returns {boolean} Whether permission was granted
 */
export async function requestBackgroundPermission() {
    try {
        const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
            const granted = await requestLocationPermission();
            if (!granted) return false;
        }

        const { status } = await Location.requestBackgroundPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error requesting background location permission:', error);
        return false;
    }
}

/**
 * Get current location (one-shot high-accuracy read)
 * @returns {Location.LocationObject | null}
 */
export async function getCurrentLocation() {
    try {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) return null;

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });
        return location;
    } catch (error) {
        console.error('Error getting current location:', error);
        return null;
    }
}

/**
 * Start continuous location tracking
 * @param {function} onLocationUpdate - Callback with Location.LocationObject
 * @param {object} options - Optional override settings
 * @returns {Location.LocationSubscription | null}
 */
export async function startLocationTracking(onLocationUpdate, options = {}) {
    try {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) return null;

        // Stop any existing subscription first
        await stopLocationTracking();

        const defaultOptions = {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,        // Update every 5 meters of movement
            timeInterval: 5000,          // Update every 5 seconds
            ...options,
        };

        locationSubscription = await Location.watchPositionAsync(
            defaultOptions,
            (location) => {
                if (onLocationUpdate) {
                    onLocationUpdate(location);
                }
            }
        );

        return locationSubscription;
    } catch (error) {
        console.error('Error starting location tracking:', error);
        return null;
    }
}

/**
 * Stop location tracking
 */
export async function stopLocationTracking() {
    if (locationSubscription) {
        locationSubscription.remove();
        locationSubscription = null;
    }
}

/**
 * Save location data to Supabase active_trips table (updates current location)
 * @param {string} activeTripId - The active trip UUID
 * @param {Location.LocationObject} location - The location object from expo-location
 */
export async function updateTripLocation(activeTripId, location) {
    try {
        const { coords } = location;

        // Update the active trip with current location
        const { error: updateError } = await supabase
            .from('active_trips')
            .update({
                current_latitude: coords.latitude,
                current_longitude: coords.longitude,
                current_speed: coords.speed ? Math.round(coords.speed * 3.6) : 0, // m/s to km/h
                current_heading: coords.heading || 0,
                last_location_update: new Date().toISOString(),
            })
            .eq('id', activeTripId);

        if (updateError) {
            console.error('Error updating trip location:', updateError);
        }

        // Also insert into trip_locations for history/breadcrumb trail
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error: insertError } = await supabase
                .from('trip_locations')
                .insert({
                    active_trip_id: activeTripId,
                    driver_id: user.id,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    accuracy: coords.accuracy,
                    speed: coords.speed ? Math.round(coords.speed * 3.6) : 0,
                    heading: coords.heading || 0,
                });

            if (insertError) {
                console.error('Error inserting trip location breadcrumb:', insertError);
            }
        }
    } catch (error) {
        console.error('Error saving location to Supabase:', error);
    }
}

/**
 * Create a new active trip in Supabase
 * @param {string} driverId
 * @param {string|null} passengerId
 * @param {string|null} tripId
 * @returns {object|null} The created active trip
 */
export async function createActiveTrip(driverId, passengerId = null, tripId = null) {
    try {
        const { data, error } = await supabase
            .from('active_trips')
            .insert({
                driver_id: driverId,
                passenger_id: passengerId,
                trip_id: tripId,
                status: 'active',
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating active trip:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Error creating active trip:', error);
        return null;
    }
}

/**
 * End an active trip
 * @param {string} activeTripId
 */
export async function endActiveTrip(activeTripId) {
    try {
        const { error } = await supabase
            .from('active_trips')
            .update({
                status: 'completed',
                ended_at: new Date().toISOString(),
            })
            .eq('id', activeTripId);

        if (error) {
            console.error('Error ending active trip:', error);
        }
    } catch (error) {
        console.error('Error ending active trip:', error);
    }
}

/**
 * Get the driver's current active trip
 * @param {string} driverId
 * @returns {object|null}
 */
export async function getDriverActiveTrip(driverId) {
    try {
        const { data, error } = await supabase
            .from('active_trips')
            .select('*')
            .eq('driver_id', driverId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error getting driver active trip:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Error getting driver active trip:', error);
        return null;
    }
}

/**
 * Get active trip for a passenger (to track their driver)
 * @param {string} passengerId
 * @returns {object|null}
 */
export async function getPassengerActiveTrip(passengerId) {
    try {
        const { data, error } = await supabase
            .from('active_trips')
            .select('*')
            .eq('passenger_id', passengerId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error getting passenger active trip:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Error getting passenger active trip:', error);
        return null;
    }
}

/**
 * Reverse geocode coordinates to get address string
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string} Address or fallback coordinates
 */
export async function reverseGeocode(latitude, longitude) {
    try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results && results.length > 0) {
            const addr = results[0];
            const parts = [
                addr.street,
                addr.district || addr.subregion,
                addr.city,
            ].filter(Boolean);
            return parts.join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
}

/**
 * Determine GPS signal strength based on accuracy in meters
 * @param {number} accuracy - Accuracy in meters
 * @returns {'strong'|'weak'|'searching'}
 */
export function getSignalStrength(accuracy) {
    if (!accuracy || accuracy > 100) return 'searching';
    if (accuracy <= 20) return 'strong';
    if (accuracy <= 50) return 'weak';
    return 'searching';
}

/**
 * Format speed from m/s to km/h
 * @param {number|null} speedMs - Speed in m/s
 * @returns {number} Speed in km/h
 */
export function formatSpeed(speedMs) {
    if (!speedMs || speedMs < 0) return 0;
    return Math.round(speedMs * 3.6);
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
