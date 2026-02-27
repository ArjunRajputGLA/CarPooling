import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
    Platform,
    Share,
    Alert,
    Image,
    TextInput,
    FlatList,
    Keyboard,
    LayoutAnimation,
    UIManager,
    Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import {
    LucideNavigation,
    LucideMapPin,
    LucideSignal,
    LucideSignalLow,
    LucideSignalZero,
    LucideLocate,
    LucideLayers,
    LucidePlay,
    LucideSquare,
    LucideGauge,
    LucideSatellite,
    LucideMap,
    LucideMountain,
    LucideShare2,
    LucideCrosshair,
    LucideSearch,
    LucideChevronDown,
    LucideChevronUp,
    LucideCheckCircle2,
    LucideAlertTriangle,
    LucideX,
    LucideRefreshCw,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
    requestLocationPermission,
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,
    updateTripLocation,
    createActiveTrip,
    endActiveTrip,
    getDriverActiveTrip,
    getPassengerActiveTrip,
    reverseGeocode,
    getSignalStrength,
    formatSpeed,
    calculateDistance,
} from '../utils/locationService';
import { supabase } from '../lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Dark map style for Google Maps
const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
    { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
    { featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3C7680' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
    { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#023e58' }] },
    { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'transit', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{ color: '#283d6a' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#3a4762' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

const MAP_TYPES = ['standard', 'satellite', 'terrain'];

export default function MapScreen() {
    const { colors, isDark, borderRadius, spacing, elevation } = useTheme();
    const { profile, session } = useAuth();
    const isDriver = profile?.role === 'driver';

    const mapRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Location state
    const [currentLocation, setCurrentLocation] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [address, setAddress] = useState('Locating...');
    const [speed, setSpeed] = useState(0);
    const [heading, setHeading] = useState(0);
    const [accuracy, setAccuracy] = useState(null);
    const [signalStrength, setSignalStrength] = useState('searching');
    const [lastUpdated, setLastUpdated] = useState(null);

    // New features state
    const [distance, setDistance] = useState(0); // in km
    const [showTraffic, setShowTraffic] = useState(false);
    const previousLocationRef = useRef(null);
    const [mockDestination, setMockDestination] = useState(null);
    const [routeInfo, setRouteInfo] = useState({ distance: 0, duration: 0 });

    const [searchQuery, setSearchQuery] = useState('');
    const [predictions, setPredictions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isCardExpanded, setIsCardExpanded] = useState(true);
    const [showStartModal, setShowStartModal] = useState(false);
    const [showEndModal, setShowEndModal] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [isFollowing, setIsFollowing] = useState(true);
    const toastAnim = useRef(new Animated.Value(-100)).current;
    const expandAnim = useRef(new Animated.Value(1)).current;

    const triggerToast = useCallback(() => {
        setShowToast(true);
        Animated.sequence([
            Animated.timing(toastAnim, {
                toValue: Platform.OS === 'ios' ? 60 : 40,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.delay(3000),
            Animated.timing(toastAnim, {
                toValue: -100,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start(() => setShowToast(false));
    }, [toastAnim]);

    const toggleCard = useCallback(() => {
        const toValue = isCardExpanded ? 0 : 1;
        Animated.timing(expandAnim, {
            toValue,
            duration: 300,
            useNativeDriver: false,
        }).start();
        setIsCardExpanded(!isCardExpanded);
    }, [isCardExpanded, expandAnim]);

    const cardMaxHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 500]
    });

    const cardOpacity = expandAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1]
    });

    const searchPlaces = async (query) => {
        setSearchQuery(query);
        if (query.length > 2) {
            try {
                const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${process.env.EXPO_PUBLIC_MAPS_API}`);
                const data = await res.json();
                if (data.status === 'OK') {
                    setPredictions(data.predictions);
                } else {
                    setPredictions([]);
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            setPredictions([]);
        }
    };

    const selectPlace = async (placeId, description) => {
        Keyboard.dismiss();
        setIsSearching(false);
        setSearchQuery(description);
        setPredictions([]);

        try {
            const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${process.env.EXPO_PUBLIC_MAPS_API}`);
            const data = await res.json();
            if (data.status === 'OK') {
                const { lat, lng } = data.result.geometry.location;
                const dest = { latitude: lat, longitude: lng };
                setMockDestination(dest);
                if (mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }, 1000);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Map state
    const [mapType, setMapType] = useState(0); // index into MAP_TYPES
    const [isMapReady, setIsMapReady] = useState(false);

    // Trip state
    const [activeTrip, setActiveTrip] = useState(null);
    const [isTripLoading, setIsTripLoading] = useState(false);

    // Permission state
    const [hasPermission, setHasPermission] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Entrance animation
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    // Initialize: get permission and start tracking
    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            const granted = await requestLocationPermission();
            if (!isMounted) return;
            setHasPermission(granted);

            if (granted) {
                const loc = await getCurrentLocation();
                if (!isMounted) return;
                if (loc) {
                    setCurrentLocation(loc);
                    setAccuracy(loc.coords.accuracy);
                    setSignalStrength(getSignalStrength(loc.coords.accuracy));
                    setSpeed(formatSpeed(loc.coords.speed));
                    setHeading(loc.coords.heading || 0);

                    // Destination is now set by user tapping the map

                    const addr = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
                    if (isMounted) setAddress(addr);
                }

                // Check for existing active trip
                if (isDriver && session?.user?.id) {
                    const trip = await getDriverActiveTrip(session.user.id);
                    if (isMounted) setActiveTrip(trip);
                } else if (!isDriver && session?.user?.id) {
                    const trip = await getPassengerActiveTrip(session.user.id);
                    if (isMounted) setActiveTrip(trip);
                }
            }

            if (isMounted) setIsLoading(false);
        };

        init();
        return () => { isMounted = false; };
    }, []);

    // Start location tracking when permission is granted
    useEffect(() => {
        if (!hasPermission) return;

        let isMounted = true;
        let geocodeTimer = null;

        const startTracking = async () => {
            await startLocationTracking((location) => {
                if (!isMounted) return;

                if (previousLocationRef.current) {
                    const prevCoords = previousLocationRef.current.coords;
                    const newCoords = location.coords;
                    if (newCoords.accuracy <= 50) {
                        const dist = calculateDistance(
                            prevCoords.latitude, prevCoords.longitude,
                            newCoords.latitude, newCoords.longitude
                        );
                        if (dist > 0.005) { // accumulate if moved > 5m
                            setDistance(prev => prev + dist);
                            previousLocationRef.current = location;
                        }
                    }
                } else {
                    previousLocationRef.current = location;
                }

                setCurrentLocation(location);
                setAccuracy(location.coords.accuracy);
                setSignalStrength(getSignalStrength(location.coords.accuracy));
                setSpeed(formatSpeed(location.coords.speed));
                setHeading(location.coords.heading || 0);
                setLastUpdated(new Date());

                // Update address every 10 seconds to avoid rate limiting
                if (!geocodeTimer) {
                    geocodeTimer = setTimeout(async () => {
                        const addr = await reverseGeocode(location.coords.latitude, location.coords.longitude);
                        if (isMounted) setAddress(addr);
                        geocodeTimer = null;
                    }, 0);
                }

                // If driver has active trip, push location to Supabase
                if (isDriver && activeTrip?.id) {
                    updateTripLocation(activeTrip.id, location);
                }
            });
        };

        startTracking();

        return () => {
            isMounted = false;
            if (geocodeTimer) clearTimeout(geocodeTimer);
            stopLocationTracking();
        };
    }, [hasPermission, activeTrip?.id]);

    // Passenger: subscribe to driver's real-time location
    useEffect(() => {
        if (isDriver || !activeTrip?.id) return;

        const channel = supabase
            .channel(`active-trip-${activeTrip.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'active_trips',
                    filter: `id=eq.${activeTrip.id}`,
                },
                (payload) => {
                    const trip = payload.new;
                    if (trip.current_latitude && trip.current_longitude) {
                        setDriverLocation({
                            latitude: parseFloat(trip.current_latitude),
                            longitude: parseFloat(trip.current_longitude),
                            speed: trip.current_speed || 0,
                            heading: trip.current_heading || 0,
                        });
                    }
                    if (trip.status === 'completed') {
                        setActiveTrip(null);
                        setDriverLocation(null);
                    }
                }
            )
            .subscribe();

        // Also fetch current location immediately
        const fetchDriverLoc = async () => {
            const { data } = await supabase
                .from('active_trips')
                .select('*')
                .eq('id', activeTrip.id)
                .single();

            if (data?.current_latitude && data?.current_longitude) {
                setDriverLocation({
                    latitude: parseFloat(data.current_latitude),
                    longitude: parseFloat(data.current_longitude),
                    speed: data.current_speed || 0,
                    heading: data.current_heading || 0,
                });
            }
        };
        fetchDriverLoc();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isDriver, activeTrip?.id]);

    // Auto-follow logic
    useEffect(() => {
        if (!isFollowing || !mapRef.current) return;

        const loc = isDriver ? currentLocation?.coords : driverLocation;
        if (loc) {
            mapRef.current.animateToRegion({
                latitude: loc.latitude,
                longitude: loc.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 1000);
        }
    }, [isFollowing, isDriver, currentLocation?.coords.latitude, currentLocation?.coords.longitude, driverLocation?.latitude, driverLocation?.longitude]);

    // Center map on current location
    const centerOnLocation = useCallback(() => {
        if (!mapRef.current) return;
        setIsFollowing(true);
        const loc = isDriver ? currentLocation?.coords : driverLocation;
        if (loc) {
            mapRef.current.animateToRegion({
                latitude: loc.latitude,
                longitude: loc.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 500);
        }
    }, [currentLocation, driverLocation, isDriver]);

    // Toggle map type
    const toggleMapType = useCallback(() => {
        setMapType((prev) => (prev + 1) % MAP_TYPES.length);
    }, []);

    // Start trip (driver only)
    const handleStartTrip = useCallback(async () => {
        if (!session?.user?.id) return;
        setIsTripLoading(true);
        try {
            const trip = await createActiveTrip(session.user.id);
            if (trip) {
                setActiveTrip(trip);
                triggerToast();
            } else {
                Alert.alert('Error', 'Failed to start trip. Please try again.');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        }
        setIsTripLoading(false);
        setShowStartModal(false);
    }, [session?.user?.id]);

    // Actual Start Trip Action
    const confirmStartTrip = useCallback(() => {
        setShowStartModal(true);
    }, []);

    // End trip (driver only)
    const handleEndTrip = useCallback(async () => {
        if (!activeTrip?.id) return;
        setIsTripLoading(true);
        await endActiveTrip(activeTrip.id);
        setActiveTrip(null);
        setIsTripLoading(false);
        setShowEndModal(false);
    }, [activeTrip?.id]);

    const confirmEndTrip = useCallback(() => {
        setShowEndModal(true);
    }, []);

    // Manual Refresh Logic
    const handleManualRefresh = useCallback(async () => {
        try {
            const location = await getCurrentLocation();
            if (location) {
                setCurrentLocation(location);
                setLastUpdated(new Date());
                // If on a trip, sync with DB too
                if (isDriver && activeTrip?.id) {
                    updateTripLocation(activeTrip.id, location);
                }
            }
        } catch (error) {
            console.error('Manual refresh failed:', error);
        }
    }, [isDriver, activeTrip?.id]);

    // Share trip
    const handleShareTrip = useCallback(async () => {
        if (!activeTrip) return;
        try {
            await Share.share({
                message: `🚗 Track my live location on ShareWheels!\nTrip ID: ${activeTrip.id}\nI'm currently at: ${address}`,
                title: 'ShareWheels Live Trip',
            });
        } catch (error) {
            console.error('Error sharing trip:', error);
        }
    }, [activeTrip, address]);

    // Get map type icon
    const getMapTypeIcon = () => {
        const mapTypeName = MAP_TYPES[mapType];
        if (mapTypeName === 'satellite') return LucideSatellite;
        if (mapTypeName === 'terrain') return LucideMountain;
        return LucideMap;
    };

    // Signal icon component
    const SignalIcon = () => {
        const iconColor = signalStrength === 'strong' ? '#22C55E' :
            signalStrength === 'weak' ? '#F59E0B' : '#EF4444';
        const Icon = signalStrength === 'strong' ? LucideSignal :
            signalStrength === 'weak' ? LucideSignalLow : LucideSignalZero;
        return <Icon size={16} color={iconColor} />;
    };

    // Format time
    const formatTime = (date) => {
        if (!date) return '--:--';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    // Loading state
    if (isLoading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
                    Getting your location...
                </Text>
            </View>
        );
    }

    // No permission state
    if (!hasPermission) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
                <LucideMapPin size={64} color={colors.onSurfaceVariant} />
                <Text style={[styles.noPermissionTitle, { color: colors.onSurface }]}>
                    Location Access Required
                </Text>
                <Text style={[styles.noPermissionText, { color: colors.onSurfaceVariant }]}>
                    ShareWheels needs access to your location to show the live map and enable trip tracking.
                </Text>
                <TouchableOpacity
                    style={[styles.permissionButton, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                        const granted = await requestLocationPermission();
                        setHasPermission(granted);
                        if (granted) setIsLoading(true);
                    }}
                >
                    <Text style={[styles.permissionButtonText, { color: colors.onPrimary }]}>
                        Enable Location
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    const MapTypeIcon = getMapTypeIcon();
    const region = currentLocation ? {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
    } : {
        latitude: 28.6139, // Default to Delhi
        longitude: 77.2090,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: colors.background }]}>
            {/* Top Info Bar */}
            <View style={[styles.topBar, {
                backgroundColor: isDark ? 'rgba(39, 39, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]}>
                <View style={styles.topBarContent}>
                    <View style={[styles.addressContainer, { backgroundColor: isDark ? '#3F3F46' : '#F4F4F5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }]}>
                        <LucideSearch size={18} color={colors.onSurfaceVariant} style={{ marginRight: 8, marginTop: Platform.OS === 'ios' ? 0 : 2 }} />
                        <TextInput
                            style={[styles.addressInput, { color: colors.onSurface }]}
                            placeholder="Search destination..."
                            placeholderTextColor={colors.onSurfaceVariant}
                            value={searchQuery}
                            onChangeText={searchPlaces}
                            onFocus={() => setIsSearching(true)}
                            onBlur={() => { if (!searchQuery) setIsSearching(false); }}
                        />
                    </View>
                    <View style={styles.topBarRight}>
                        <SignalIcon />
                        <Text style={[styles.timeText, { color: colors.onSurfaceVariant }]}>
                            {formatTime(lastUpdated)}
                        </Text>
                    </View>
                </View>
                {activeTrip && (
                    <View style={[styles.tripBadge, { backgroundColor: '#22C55E20' }]}>
                        <View style={[styles.liveDot, { backgroundColor: '#22C55E' }]} />
                        <Text style={[styles.tripBadgeText, { color: '#22C55E' }]}>
                            {isDriver ? 'TRIP ACTIVE — SHARING LOCATION' : 'TRACKING DRIVER'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Predictions List */}
            {isSearching && predictions.length > 0 && (
                <View style={[styles.predictionsContainer, { backgroundColor: isDark ? '#27272A' : '#FFFFFF', ...elevation.level2 }]}>
                    <FlatList
                        data={predictions}
                        keyExtractor={(item) => item.place_id}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <TouchableOpacity style={[styles.predictionItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} onPress={() => selectPlace(item.place_id, item.description)}>
                                <LucideMapPin size={16} color={colors.onSurfaceVariant} style={{ marginRight: 12 }} />
                                <Text style={[styles.predictionText, { color: colors.onSurface }]}>{item.description}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={region}
                mapType={MAP_TYPES[mapType]}
                customMapStyle={isDark ? darkMapStyle : []}
                showsUserLocation={!isDriver}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={true}
                showsTraffic={showTraffic}
                rotateEnabled={true}
                zoomEnabled={true}
                scrollEnabled={true}
                pitchEnabled={true}
                onMapReady={() => setIsMapReady(true)}
                onPanDrag={() => setIsFollowing(false)}
                onPress={(e) => {
                    if (e.nativeEvent.coordinate) {
                        setMockDestination(e.nativeEvent.coordinate);
                    }
                }}
            >
                {/* Route drawing feature */}
                {currentLocation && mockDestination && process.env.EXPO_PUBLIC_MAPS_API && (
                    <MapViewDirections
                        origin={{
                            latitude: currentLocation.coords.latitude,
                            longitude: currentLocation.coords.longitude,
                        }}
                        destination={mockDestination}
                        apikey={process.env.EXPO_PUBLIC_MAPS_API}
                        strokeWidth={5}
                        strokeColor={colors.primary}
                        onReady={result => {
                            setRouteInfo({
                                distance: result.distance,
                                duration: result.duration
                            });
                        }}
                    />
                )}

                {/* Mock destination marker */}
                {mockDestination && (
                    <Marker coordinate={mockDestination} title="Destination">
                        <View style={styles.carMarkerContainer}>
                            <View style={[styles.carMarker, { backgroundColor: '#EF4444', width: 32, height: 32, borderRadius: 16 }]}>
                                <LucideMapPin size={16} color="#FFFFFF" />
                            </View>
                        </View>
                    </Marker>
                )}

                {/* Driver's car marker - 2D version (hidden, just for tracking if needed) */}
                {/* Driver's car marker - 2D Pointer */}
                {isDriver && currentLocation && (
                    <Marker
                        coordinate={{
                            latitude: currentLocation.coords.latitude,
                            longitude: currentLocation.coords.longitude,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat={true}
                        rotation={heading}
                    >
                        <View style={styles.pointerContainer}>
                            <LucideNavigation size={32} color="#22C55E" fill="#22C55E" />
                        </View>
                    </Marker>
                )}

                {/* Passenger viewing driver's location - 2D Pointer */}
                {!isDriver && driverLocation && (
                    <Marker
                        coordinate={{
                            latitude: driverLocation.latitude,
                            longitude: driverLocation.longitude,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat={true}
                        rotation={driverLocation.heading || 0}
                    >
                        <View style={styles.pointerContainer}>
                            <LucideNavigation size={32} color="#3B82F6" fill="#3B82F6" />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* FABs */}
            <View style={styles.fabContainer}>
                {/* Traffic toggle */}
                <TouchableOpacity
                    style={[styles.fab, styles.fabSmall, {
                        backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                        ...elevation.level2,
                    }]}
                    onPress={() => setShowTraffic(prev => !prev)}
                    activeOpacity={0.7}
                >
                    <LucideLayers size={20} color={showTraffic ? colors.primary : colors.onSurface} />
                </TouchableOpacity>

                {/* Map type toggle */}
                <TouchableOpacity
                    style={[styles.fab, styles.fabSmall, {
                        backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                        ...elevation.level2,
                    }]}
                    onPress={toggleMapType}
                    activeOpacity={0.7}
                >
                    <MapTypeIcon size={20} color={colors.onSurface} />
                </TouchableOpacity>

                {/* Center on location */}
                <TouchableOpacity
                    style={[styles.fab, styles.fabSmall, {
                        backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                        ...elevation.level2,
                    }]}
                    onPress={centerOnLocation}
                    activeOpacity={0.7}
                >
                    <LucideCrosshair size={20} color={colors.primary} />
                </TouchableOpacity>

                {/* Share trip */}
                {activeTrip && (
                    <>
                        <TouchableOpacity
                            style={[styles.fab, styles.fabSmall, {
                                backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                                ...elevation.level2,
                            }]}
                            onPress={handleShareTrip}
                            activeOpacity={0.7}
                        >
                            <LucideShare2 size={20} color={colors.onSurface} />
                        </TouchableOpacity>

                        {/* Manual Refresh button beneath Share - only visible during trip or if searching is not active */}
                        <TouchableOpacity
                            style={[styles.fab, styles.fabSmall, {
                                backgroundColor: isDark ? '#27272A' : '#FFFFFF',
                                ...elevation.level2,
                            }]}
                            onPress={handleManualRefresh}
                            activeOpacity={0.7}
                        >
                            <LucideRefreshCw size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </>
                )}
            </View>

            <View style={[styles.bottomCard, {
                backgroundColor: isDark ? 'rgba(39, 39, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                borderRadius: borderRadius.extraLarge || 28,
            }]}>
                {/* Drag handle / toggle */}
                <TouchableOpacity onPress={toggleCard} style={styles.cardToggle} activeOpacity={0.7}>
                    <View style={[styles.dragIndicator, { backgroundColor: colors.outlineVariant }]} />
                    {isCardExpanded ? (
                        <LucideChevronDown size={20} color={colors.onSurfaceVariant} style={{ marginTop: 4 }} />
                    ) : (
                        <LucideChevronUp size={20} color={colors.onSurfaceVariant} style={{ marginTop: 4 }} />
                    )}
                </TouchableOpacity>

                <Animated.View style={[styles.cardContent, { maxHeight: cardMaxHeight, opacity: cardOpacity }]}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <LucideGauge size={18} color={colors.primary} />
                            <Text style={[styles.statValue, { color: colors.onSurface }]}>{speed}</Text>
                            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>km/h</Text>
                        </View>

                        <View style={[styles.statDivider, { backgroundColor: colors.outlineVariant }]} />

                        <View style={styles.statItem}>
                            <LucideCrosshair size={18} color={
                                signalStrength === 'strong' ? '#22C55E' :
                                    signalStrength === 'weak' ? '#F59E0B' : '#EF4444'
                            } />
                            <Text style={[styles.statValue, { color: colors.onSurface }]}>
                                {accuracy ? `${Math.round(accuracy)}m` : '—'}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>accuracy</Text>
                        </View>

                        <View style={[styles.statDivider, { backgroundColor: colors.outlineVariant }]} />

                        <View style={styles.statItem}>
                            <LucideNavigation size={18} color={colors.tertiary || '#F59E0B'} />
                            <Text style={[styles.statValue, { color: colors.onSurface }]}>
                                {distance < 1 ? Math.round(distance * 1000) : distance.toFixed(1)}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
                                {distance < 1 ? 'meters' : 'km'}
                            </Text>
                        </View>
                    </View>

                    {/* Route ETA (Feature 2) */}
                    {mockDestination && routeInfo.duration > 0 && (
                        <View style={[styles.statsRow, { marginTop: 16, backgroundColor: isDark ? '#3F3F46' : '#F4F4F5', padding: 12, borderRadius: 12 }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, fontWeight: '500' }}>Estimated Arrival</Text>
                                <Text style={{ fontSize: 18, color: colors.onSurface, fontWeight: '700' }}>
                                    {Math.ceil(routeInfo.duration)} mins
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, fontWeight: '500' }}>Distance left</Text>
                                <Text style={{ fontSize: 18, color: colors.onSurface, fontWeight: '700' }}>
                                    {routeInfo.distance.toFixed(1)} km
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Trip action buttons (Driver) */}
                    {isDriver && (
                        <View style={styles.actionRow}>
                            {!activeTrip ? (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
                                    onPress={confirmStartTrip}
                                    disabled={isTripLoading}
                                    activeOpacity={0.8}
                                >
                                    {isTripLoading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <LucidePlay size={18} color="#FFFFFF" />
                                            <Text style={styles.actionButtonText}>Start Trip</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                                    onPress={confirmEndTrip}
                                    disabled={isTripLoading}
                                    activeOpacity={0.8}
                                >
                                    {isTripLoading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <LucideSquare size={18} color="#FFFFFF" />
                                            <Text style={styles.actionButtonText}>End Trip</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Passenger not tracking state */}
                    {!isDriver && !activeTrip && (
                        <View style={styles.noTripContainer}>
                            <Text style={[styles.noTripText, { color: colors.onSurfaceVariant }]}>
                                No active trip. Scan a driver's QR code to start tracking.
                            </Text>
                        </View>
                    )}

                    {/* Passenger tracking state */}
                    {!isDriver && activeTrip && !driverLocation && (
                        <View style={styles.noTripContainer}>
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.noTripText, { color: colors.onSurfaceVariant }]}>
                                Waiting for driver's location...
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </View>

            {/* Success Toast */}
            {showToast && (
                <Animated.View style={[
                    styles.toastContainer,
                    {
                        transform: [{ translateY: toastAnim }],
                        backgroundColor: isDark ? '#22C55E' : '#22C55E',
                    }
                ]}>
                    <LucideCheckCircle2 color="#FFFFFF" size={20} />
                    <View style={styles.toastTextContainer}>
                        <Text style={styles.toastTitle}>Trip Started</Text>
                        <Text style={styles.toastMessage}>Your location is now being tracked live.</Text>
                    </View>
                </Animated.View>
            )}

            {/* Start Trip Modal */}
            <Modal
                visible={showStartModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowStartModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#27272A' : '#FFFFFF' }]}>
                        <View style={[styles.modalHeader, { backgroundColor: '#22C55E' }]}>
                            <LucideCheckCircle2 color="#FFFFFF" size={32} />
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Start Your Journey</Text>
                            <Text style={[styles.modalText, { color: colors.onSurfaceVariant }]}>
                                You are about to start a new trip. Your live location will be shared with passengers in real-time.
                            </Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalSecondaryButton, { borderColor: colors.outlineVariant }]}
                                    onPress={() => setShowStartModal(false)}
                                >
                                    <Text style={[styles.modalSecondaryButtonText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalPrimaryButton, { backgroundColor: '#22C55E' }]}
                                    onPress={handleStartTrip}
                                    disabled={isTripLoading}
                                >
                                    {isTripLoading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.modalPrimaryButtonText}>Start Trip</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* End Trip Modal */}
            <Modal
                visible={showEndModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEndModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#27272A' : '#FFFFFF' }]}>
                        <View style={[styles.modalHeader, { backgroundColor: '#EF4444' }]}>
                            <LucideAlertTriangle color="#FFFFFF" size={32} />
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>End Trip?</Text>
                            <Text style={[styles.modalText, { color: colors.onSurfaceVariant }]}>
                                Are you sure you want to end this trip? Your live location sharing will stop immediately.
                            </Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalSecondaryButton, { borderColor: colors.outlineVariant }]}
                                    onPress={() => setShowEndModal(false)}
                                >
                                    <Text style={[styles.modalSecondaryButtonText, { color: colors.onSurfaceVariant }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalPrimaryButton, { backgroundColor: '#EF4444' }]}
                                    onPress={handleEndTrip}
                                    disabled={isTripLoading}
                                >
                                    {isTripLoading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.modalPrimaryButtonText}>End Trip</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
    },
    noPermissionTitle: {
        marginTop: 24,
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    noPermissionText: {
        marginTop: 12,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    permissionButton: {
        marginTop: 24,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    permissionButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },

    // Top bar
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingHorizontal: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
    },
    topBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    addressInput: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
        padding: 0,
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    tripBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    tripBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // Predictions
    predictionsContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 100,
        left: 16,
        right: 16,
        maxHeight: 250,
        borderRadius: 12,
        zIndex: 20,
    },
    predictionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    predictionText: {
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },

    // Map
    map: {
        flex: 1,
    },
    pointerContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Car marker
    carMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    carMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    accuracyPulse: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 2,
        opacity: 0.2,
    },

    // FABs
    fabContainer: {
        position: 'absolute',
        right: 16,
        top: Platform.OS === 'ios' ? 140 : 100,
        gap: 12,
        zIndex: 10,
    },
    fab: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
    },
    fabSmall: {
        width: 44,
        height: 44,
    },

    // Bottom card
    bottomCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    cardToggle: {
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 8,
    },
    dragIndicator: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    cardContent: {
        overflow: 'hidden',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: 32,
        opacity: 0.3,
    },

    // Action buttons
    actionRow: {
        marginTop: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },

    // No trip
    noTripContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        paddingVertical: 8,
    },
    noTripText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    modalHeader: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBody: {
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalPrimaryButton: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    modalPrimaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    modalSecondaryButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    modalSecondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },

    // Toast Styles
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        backgroundColor: '#22C55E',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 100,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    toastTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    toastTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    toastMessage: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 13,
        fontWeight: '500',
    },
});
