import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    StyleSheet, 
    ActivityIndicator, 
    RefreshControl, 
    TouchableOpacity, 
    Alert,
    Image,
    Modal,
    ScrollView,
    Animated,
    Pressable,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { 
    LucideCalendar,
    LucideUsers,
    LucideWallet,
    LucideClock,
    LucideCheckCircle,
    LucideCircleDot,
    LucideCar,
    LucideQrCode,
    LucideChevronRight,
    LucideX,
    LucideUser,
    LucidePhone,
    LucideMail,
    LucideTrash2,
    LucideTrendingUp,
} from 'lucide-react-native';
import SwipeableScreen from '../components/common/SwipeableScreen';
import { M3ConfirmDialog, M3ErrorDialog, M3InfoDialog } from '../components/common';
import { 
    getTodayRange, 
    getWeekRange, 
    getWeekdays, 
    formatTime, 
    formatDate,
    getDateFromTimestamp 
} from '../utils/dateHelpers';

const FARE_PER_TRIP = 31;

const TripItem = React.memo(({ item, index, markAsPaid, deleteTrip }) => {
    const { colors, borderRadius } = useTheme();
    const itemAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        Animated.spring(itemAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            delay: index * 50,
            useNativeDriver: true,
        }).start();
    }, []);
    
    return (
        <Animated.View style={{
            opacity: itemAnim,
            transform: [{ 
                translateY: itemAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                })
            }],
        }}>
        <Pressable
            style={({ pressed }) => [
                styles.tripCard,
                {
                    backgroundColor: colors.surfaceContainerLow,
                    borderRadius: borderRadius.large,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                }
            ]}
            onLongPress={() => deleteTrip(item.id, item.passenger?.full_name || 'Unknown')}
            delayLongPress={600}
        >
            <View style={styles.tripHeader}>
                <View style={styles.passengerInfo}>
                    <View style={[styles.passengerAvatar, { backgroundColor: colors.primaryContainer }]}>
                        <Text style={[styles.passengerInitial, { color: colors.onPrimaryContainer }]}>
                            {item.passenger?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                    </View>
                    <View style={styles.passengerDetails}>
                        <Text style={[styles.passengerName, { color: colors.onSurface }]}>
                            {item.passenger?.full_name || 'Unknown Passenger'}
                        </Text>
                        <Text style={[styles.passengerPhone, { color: colors.onSurfaceVariant }]}>
                            {item.passenger?.phone || 'No phone'}
                        </Text>
                    </View>
                </View>
                <View style={styles.tripTime}>
                    <LucideClock size={14} color={colors.onSurfaceVariant} />
                    <Text style={[styles.timeText, { color: colors.onSurfaceVariant }]}>
                        {formatTime(item.scan_timestamp)}
                    </Text>
                </View>
            </View>

            <View style={[styles.tripFooter, { borderTopColor: colors.outlineVariant }]}>
                <View style={styles.fareContainer}>
                    <Text style={[styles.fareLabel, { color: colors.onSurfaceVariant }]}>Fare</Text>
                    <Text style={[styles.fareAmount, { color: colors.onSurface }]}>₹{item.fare_amount || FARE_PER_TRIP}</Text>
                </View>

                {item.payment_status === 'paid' ? (
                    <View style={[styles.statusButton, { backgroundColor: colors.primaryContainer }]}>
                        <LucideCheckCircle size={16} color={colors.primary} />
                        <Text style={[styles.statusText, { color: colors.primary }]}>Paid</Text>
                    </View>
                ) : (
                    <Pressable
                        style={({ pressed }) => [
                            styles.statusButton, 
                            { 
                                backgroundColor: colors.tertiaryContainer,
                                opacity: pressed ? 0.8 : 1,
                            }
                        ]}
                        onPress={() => markAsPaid(item.id, item.passenger?.full_name || 'Unknown')}
                    >
                        <LucideCircleDot size={16} color={colors.tertiary} />
                        <Text style={[styles.statusText, { color: colors.tertiary }]}>Mark Paid</Text>
                    </Pressable>
                )}
            </View>
        </Pressable>
        </Animated.View>
    );
});

// Grouped Trip Item - shows passenger once with all their trips
const GroupedTripItem = React.memo(({ item, index, markAsPaid, deleteTrip }) => {
    const { colors, borderRadius, spacing } = useTheme();
    const itemAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        Animated.spring(itemAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            delay: index * 80,
            useNativeDriver: true,
        }).start();
    }, []);

    const passenger = item.passenger;
    const trips = item.trips;
    const totalFare = trips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
    const allPaid = trips.every(t => t.payment_status === 'paid');
    const pendingCount = trips.filter(t => t.payment_status !== 'paid').length;
    
    return (
        <Animated.View style={{
            opacity: itemAnim,
            transform: [{ 
                translateY: itemAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                })
            }],
            marginBottom: spacing.md,
        }}>
            <View
                style={[
                    styles.groupedTripCard,
                    {
                        backgroundColor: colors.surfaceContainerLow,
                        borderRadius: borderRadius.large,
                    }
                ]}
            >
                {/* Passenger Header */}
                <View style={styles.groupedPassengerHeader}>
                    <View style={styles.passengerInfo}>
                        <View style={[styles.passengerAvatar, { backgroundColor: colors.primaryContainer }]}>
                            <Text style={[styles.passengerInitial, { color: colors.onPrimaryContainer }]}>
                                {passenger?.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                        </View>
                        <View style={styles.passengerDetails}>
                            <Text style={[styles.passengerName, { color: colors.onSurface }]}>
                                {passenger?.full_name || 'Unknown Passenger'}
                            </Text>
                            <Text style={[styles.passengerPhone, { color: colors.onSurfaceVariant }]}>
                                {passenger?.phone || 'No phone'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.groupedSummary}>
                        <Text style={[styles.groupedTripCount, { color: colors.onSurfaceVariant }]}>
                            {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
                        </Text>
                        <Text style={[styles.groupedTotalFare, { color: colors.onSurface }]}>
                            ₹{totalFare}
                        </Text>
                    </View>
                </View>

                {/* Individual Trips */}
                {trips.map((trip, tripIndex) => {
                    const tripLabel = tripIndex === 0 ? 'Going' : tripIndex === 1 ? 'Return' : `Trip ${tripIndex + 1}`;
                    const isLast = tripIndex === trips.length - 1;
                    
                    return (
                        <Pressable
                            key={trip.id}
                            style={[
                                styles.groupedTripRow,
                                { borderTopColor: colors.outlineVariant },
                                !isLast && { borderBottomWidth: 0 }
                            ]}
                            onLongPress={() => deleteTrip(trip.id, passenger?.full_name || 'Unknown')}
                            delayLongPress={600}
                        >
                            <View style={styles.tripRowLeft}>
                                <View style={[
                                    styles.tripTypeBadge, 
                                    { backgroundColor: tripIndex === 0 ? colors.primaryContainer : colors.tertiaryContainer }
                                ]}>
                                    <Text style={[
                                        styles.tripTypeText, 
                                        { color: tripIndex === 0 ? colors.primary : colors.tertiary }
                                    ]}>
                                        {tripLabel}
                                    </Text>
                                </View>
                                <View style={styles.tripRowTime}>
                                    <LucideClock size={12} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.tripRowTimeText, { color: colors.onSurfaceVariant }]}>
                                        {formatTime(trip.scan_timestamp)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.tripRowRight}>
                                <Text style={[styles.tripRowFare, { color: colors.onSurface }]}>
                                    ₹{trip.fare_amount || FARE_PER_TRIP}
                                </Text>
                                {trip.payment_status === 'paid' ? (
                                    <View style={[styles.miniStatusButton, { backgroundColor: colors.primaryContainer }]}>
                                        <LucideCheckCircle size={14} color={colors.primary} />
                                        <Text style={[styles.miniStatusText, { color: colors.primary }]}>Paid</Text>
                                    </View>
                                ) : (
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.miniStatusButton, 
                                            { 
                                                backgroundColor: colors.tertiaryContainer,
                                                opacity: pressed ? 0.8 : 1,
                                            }
                                        ]}
                                        onPress={() => markAsPaid(trip.id, passenger?.full_name || 'Unknown')}
                                    >
                                        <LucideCircleDot size={14} color={colors.tertiary} />
                                        <Text style={[styles.miniStatusText, { color: colors.tertiary }]}>Mark Paid</Text>
                                    </Pressable>
                                )}
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </Animated.View>
    );
});

export default function DriverDashboard() {
    const { user, profile } = useAuth();
    const { colors, spacing, borderRadius, typography, isDark } = useTheme();
    const navigation = useNavigation();
    const [trips, setTrips] = useState([]);
    const [weekTrips, setWeekTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [carId, setCarId] = useState(null);
    const [stats, setStats] = useState({ 
        total: 0, paid: 0, pending: 0, 
        paidRevenue: 0, pendingRevenue: 0,
        weekTrips: 0, weekPending: 0, weekPaid: 0
    });
    const [passengerSummary, setPassengerSummary] = useState([]);
    const [selectedPassenger, setSelectedPassenger] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const subscriptionRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    
    // M3 Dialog states
    const [confirmDialog, setConfirmDialog] = useState({ visible: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm', isDestructive: false });
    const [errorDialog, setErrorDialog] = useState({ visible: false, title: '', message: '' });
    const [infoDialog, setInfoDialog] = useState({ visible: false, title: '', message: '' });
    
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getFirstName = () => {
        if (profile?.full_name) return profile.full_name.split(' ')[0];
        return 'Driver';
    };

    const formatDisplayDate = () => {
        return new Date().toLocaleDateString('en-US', { 
            weekday: 'long', month: 'long', day: 'numeric' 
        });
    };

    const fetchTrips = async () => {
        try {
            // Get driver's car
            const { data: carData, error: carError } = await supabase
                .from('cars')
                .select('id')
                .eq('driver_id', user?.id)
                .single();

            if (carError || !carData) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            setCarId(carData.id);
            const { start: todayStart, end: todayEnd } = getTodayRange();

            // Fetch today's trips
            const { data, error } = await supabase
                .from('trips')
                .select(`
                    *,
                    passenger:users!passenger_id(id, full_name, email, phone, profile_picture_url)
                `)
                .eq('car_id', carData.id)
                .gte('scan_timestamp', todayStart)
                .lt('scan_timestamp', todayEnd)
                .order('scan_timestamp', { ascending: false });

            if (error) throw error;
            
            setTrips(data || []);
            calculateStats(data || []);

            // Fetch week's trips for summary
            await fetchWeekData(carData.id);

        } catch (e) {
            console.error('Error fetching trips:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchWeekData = async (cid) => {
        try {
            const { start: weekStart, end: weekEnd } = getWeekRange();

            const { data, error } = await supabase
                .from('trips')
                .select(`
                    *,
                    passenger:users!passenger_id(id, full_name, email, phone)
                `)
                .eq('car_id', cid)
                .gte('scan_timestamp', weekStart)
                .lt('scan_timestamp', weekEnd)
                .order('scan_timestamp', { ascending: false });

            if (error) throw error;

            setWeekTrips(data || []);
            calculateWeekStats(data || []);
            buildPassengerSummary(data || []);
        } catch (e) {
            console.error('Error fetching week data:', e);
        }
    };

    const calculateStats = (tripData) => {
        const total = tripData.length;
        const paidTrips = tripData.filter(t => t.payment_status === 'paid');
        const pendingTrips = tripData.filter(t => t.payment_status === 'pending');
        const paidRevenue = paidTrips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
        const pendingRevenue = pendingTrips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
        
        setStats(prev => ({
            ...prev,
            total,
            paid: paidTrips.length,
            pending: pendingTrips.length,
            paidRevenue,
            pendingRevenue,
        }));
    };

    const calculateWeekStats = (data) => {
        const weekPending = data.filter(t => t.payment_status === 'pending')
            .reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
        const weekPaid = data.filter(t => t.payment_status === 'paid')
            .reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
        
        setStats(prev => ({
            ...prev,
            weekTrips: data.length,
            weekPending,
            weekPaid,
        }));
    };

    const buildPassengerSummary = (data) => {
        const passengerMap = {};
        data.forEach(trip => {
            const pid = trip.passenger_id;
            if (!passengerMap[pid]) {
                passengerMap[pid] = {
                    id: pid,
                    name: trip.passenger?.full_name || 'Unknown',
                    phone: trip.passenger?.phone || 'N/A',
                    email: trip.passenger?.email || 'N/A',
                    trips: 0,
                    pending: 0,
                    paid: 0,
                    pendingAmount: 0,
                    paidAmount: 0,
                    dates: new Set(),
                };
            }
            passengerMap[pid].trips++;
            passengerMap[pid].dates.add(getDateFromTimestamp(trip.scan_timestamp));
            if (trip.payment_status === 'pending') {
                passengerMap[pid].pending++;
                passengerMap[pid].pendingAmount += (parseFloat(trip.fare_amount) || FARE_PER_TRIP);
            } else {
                passengerMap[pid].paid++;
                passengerMap[pid].paidAmount += (parseFloat(trip.fare_amount) || FARE_PER_TRIP);
            }
        });

        const summary = Object.values(passengerMap).map(p => ({
            ...p,
            daysActive: p.dates.size,
            dates: undefined,
        }));

        summary.sort((a, b) => b.pendingAmount - a.pendingAmount);
        setPassengerSummary(summary);
    };

    const markAsPaid = async (tripId, passengerName) => {
        setConfirmDialog({
            visible: true,
            title: 'Confirm Payment',
            message: `Mark this trip for ${passengerName} as paid? This action will record the payment.`,
            confirmText: 'Mark Paid',
            isDestructive: false,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, visible: false }));
                try {
                    const { error } = await supabase
                        .from('trips')
                        .update({ 
                            payment_status: 'paid',
                            payment_date: new Date().toISOString()
                        })
                        .eq('id', tripId);

                    if (error) throw error;
                    fetchTrips();
                } catch (e) {
                    setErrorDialog({ visible: true, title: 'Error', message: 'Failed to update payment: ' + e.message });
                }
            },
        });
    };

    const markPassengerWeekPaid = async (passengerId, passengerName) => {
        const pendingTrips = weekTrips.filter(
            t => t.passenger_id === passengerId && t.payment_status === 'pending'
        );

        if (pendingTrips.length === 0) {
            setInfoDialog({ visible: true, title: 'Info', message: 'No pending payments for this passenger.' });
            return;
        }

        const totalAmount = pendingTrips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0);

        setConfirmDialog({
            visible: true,
            title: 'Mark All as Paid',
            message: `Mark all ${pendingTrips.length} pending trips for ${passengerName} as paid?\n\nTotal: \u20B9${totalAmount}`,
            confirmText: 'Mark All Paid',
            isDestructive: false,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, visible: false }));
                try {
                    const ids = pendingTrips.map(t => t.id);
                    const { error } = await supabase
                        .from('trips')
                        .update({ 
                            payment_status: 'paid',
                            payment_date: new Date().toISOString()
                        })
                        .in('id', ids);

                    if (error) throw error;
                    setModalVisible(false);
                    fetchTrips();
                } catch (e) {
                    setErrorDialog({ visible: true, title: 'Error', message: 'Failed to update payments: ' + e.message });
                }
            },
        });
    };

    const deleteTrip = (tripId, passengerName) => {
        setConfirmDialog({
            visible: true,
            title: 'Delete Trip',
            message: `Are you sure you want to delete the trip for ${passengerName}? This action cannot be undone.`,
            confirmText: 'Delete',
            isDestructive: true,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, visible: false }));
                try {
                    const { error } = await supabase
                        .from('trips')
                        .delete()
                        .eq('id', tripId);
                    if (error) throw error;
                    fetchTrips();
                } catch (e) {
                    setErrorDialog({ visible: true, title: 'Error', message: 'Failed to delete trip: ' + e.message });
                }
            },
        });
    };

    // Real-time subscription for new trips
    useEffect(() => {
        if (!carId) return;

        const channel = supabase
            .channel('driver-trips')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'trips',
                filter: `car_id=eq.${carId}`,
            }, () => {
                // Refresh when any trip changes
                fetchTrips();
            })
            .subscribe();

        subscriptionRef.current = channel;

        return () => {
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
            }
        };
    }, [carId]);

    useFocusEffect(
        useCallback(() => {
            fetchTrips();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchTrips();
    }, []);

    // Group trips by passenger for Today's Trips display
    const groupedTrips = useMemo(() => {
        const grouped = {};
        trips.forEach(trip => {
            const passengerId = trip.passenger_id;
            if (!grouped[passengerId]) {
                grouped[passengerId] = {
                    id: passengerId,
                    passenger: trip.passenger,
                    trips: []
                };
            }
            grouped[passengerId].trips.push(trip);
        });
        // Sort trips within each group by timestamp (oldest first for Going/Return order)
        Object.values(grouped).forEach(group => {
            group.trips.sort((a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp));
        });
        // Return as array, sorted by most recent trip
        return Object.values(grouped).sort((a, b) => {
            const aLatest = Math.max(...a.trips.map(t => new Date(t.scan_timestamp)));
            const bLatest = Math.max(...b.trips.map(t => new Date(t.scan_timestamp)));
            return bLatest - aLatest;
        });
    }, [trips]);

    const renderGroupedTripItem = useCallback(({ item, index }) => (
        <GroupedTripItem 
            item={item} 
            index={index} 
            markAsPaid={markAsPaid} 
            deleteTrip={deleteTrip} 
        />
    ), [markAsPaid, deleteTrip]);

    const renderTripItem = useCallback(({ item, index }) => (
        <TripItem 
            item={item} 
            index={index} 
            markAsPaid={markAsPaid} 
            deleteTrip={deleteTrip} 
        />
    ), [markAsPaid, deleteTrip]);

    const openPassengerDetail = (passenger) => {
        setSelectedPassenger(passenger);
        setModalVisible(true);
    };

    const PassengerSummaryCard = ({ item }) => {
        const totalContribution = (item.paidAmount || 0) + (item.pendingAmount || 0);
        
        return (
            <Pressable 
                style={({ pressed }) => [
                    styles.passengerCard,
                    {
                        backgroundColor: colors.surfaceContainerLow,
                        borderRadius: borderRadius.large,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                    }
                ]}
                onPress={() => openPassengerDetail(item)}
            >
                <View style={styles.passengerCardHeader}>
                    <View style={[styles.passengerCardAvatar, { backgroundColor: colors.primaryContainer }]}>
                        <Text style={[styles.passengerCardInitial, { color: colors.onPrimaryContainer }]}>
                            {item.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.passengerCardInfo}>
                        <Text style={[styles.passengerCardName, { color: colors.onSurface }]}>{item.name}</Text>
                        <Text style={[styles.passengerCardMeta, { color: colors.onSurfaceVariant }]}>
                            {item.trips} trips · {item.daysActive} days
                        </Text>
                    </View>
                    <View style={styles.passengerCardAmount}>
                        <Text style={[styles.pendingAmountLabel, { color: colors.onSurfaceVariant }]}>Contribution</Text>
                        <Text style={[styles.pendingAmountValue, { color: colors.primary }]}>₹{totalContribution}</Text>
                    </View>
                </View>
            </Pressable>
        );
    };

    const PassengerDetailModal = () => (
        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surfaceContainerLow, borderTopLeftRadius: borderRadius.extraLarge, borderTopRightRadius: borderRadius.extraLarge }]}>
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
                    </View>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Passenger Details</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                            <LucideX size={24} color={colors.onSurfaceVariant} />
                        </TouchableOpacity>
                    </View>
                    {selectedPassenger && (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalPassengerHeader}>
                                <View style={[styles.modalAvatar, { backgroundColor: colors.primaryContainer }]}>
                                    <Text style={[styles.modalAvatarText, { color: colors.onPrimaryContainer }]}>
                                        {selectedPassenger.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={[styles.modalPassengerName, { color: colors.onSurface }]}>{selectedPassenger.name}</Text>
                            </View>

                            <View style={[styles.modalInfoSection, { backgroundColor: colors.surfaceContainerHighest, borderRadius: borderRadius.large }]}>
                                <View style={styles.modalInfoRow}>
                                    <LucidePhone size={18} color={colors.primary} />
                                    <Text style={[styles.modalInfoText, { color: colors.onSurface }]}>{selectedPassenger.phone}</Text>
                                </View>
                                <View style={styles.modalInfoRow}>
                                    <LucideMail size={18} color={colors.primary} />
                                    <Text style={[styles.modalInfoText, { color: colors.onSurface }]}>{selectedPassenger.email}</Text>
                                </View>
                            </View>

                            <View style={styles.modalStatsGrid}>
                                <View style={[styles.modalStatCard, { backgroundColor: colors.primaryContainer, borderRadius: borderRadius.large }]}>
                                    <Text style={[styles.modalStatNumber, { color: colors.onPrimaryContainer }]}>{selectedPassenger.trips}</Text>
                                    <Text style={[styles.modalStatLabel, { color: colors.onPrimaryContainer }]}>Total Trips</Text>
                                </View>
                                <View style={[styles.modalStatCard, { backgroundColor: colors.tertiaryContainer, borderRadius: borderRadius.large }]}>
                                    <Text style={[styles.modalStatNumber, { color: colors.onTertiaryContainer }]}>₹{selectedPassenger.pendingAmount}</Text>
                                    <Text style={[styles.modalStatLabel, { color: colors.onTertiaryContainer }]}>Pending</Text>
                                </View>
                                <View style={[styles.modalStatCard, { backgroundColor: colors.secondaryContainer, borderRadius: borderRadius.large }]}>
                                    <Text style={[styles.modalStatNumber, { color: colors.onSecondaryContainer }]}>₹{selectedPassenger.paidAmount}</Text>
                                    <Text style={[styles.modalStatLabel, { color: colors.onSecondaryContainer }]}>Paid</Text>
                                </View>
                                <View style={[styles.modalStatCard, { backgroundColor: colors.surfaceContainerHighest, borderRadius: borderRadius.large }]}>
                                    <Text style={[styles.modalStatNumber, { color: colors.onSurface }]}>{selectedPassenger.daysActive}</Text>
                                    <Text style={[styles.modalStatLabel, { color: colors.onSurfaceVariant }]}>Days Active</Text>
                                </View>
                            </View>

                            {selectedPassenger.pendingAmount > 0 && (
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.markAllPaidButton,
                                        { 
                                            backgroundColor: colors.primary,
                                            borderRadius: borderRadius.large,
                                            opacity: pressed ? 0.9 : 1,
                                        }
                                    ]}
                                    onPress={() => markPassengerWeekPaid(selectedPassenger.id, selectedPassenger.name)}
                                >
                                    <LucideCheckCircle size={20} color={colors.onPrimary} />
                                    <Text style={[styles.markAllPaidText, { color: colors.onPrimary }]}>
                                        Mark All Paid (₹{selectedPassenger.pendingAmount})
                                    </Text>
                                </Pressable>
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );

    const ListHeader = () => (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Welcome Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.welcomeContainer}>
                        <Text style={[styles.greeting, { color: colors.onSurfaceVariant }]}>{getGreeting()},</Text>
                        <Text style={[styles.userName, { color: colors.onSurface }]}>{getFirstName()} 👋</Text>
                    </View>
                    <Pressable 
                        style={({ pressed }) => [
                            styles.avatarContainer, 
                            { transform: [{ scale: pressed ? 0.95 : 1 }] }
                        ]} 
                        onPress={() => navigation.navigate('Profile')}
                    >
                        {profile?.profile_picture_url ? (
                            <Image source={{ uri: profile.profile_picture_url }} style={[styles.avatar, { borderColor: colors.primary }]} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryContainer }]}>
                                <Text style={[styles.avatarText, { color: colors.onPrimaryContainer }]}>{getFirstName().charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                    </Pressable>
                </View>
                <View style={styles.dateContainer}>
                    <LucideCalendar size={16} color={colors.onSurfaceVariant} />
                    <Text style={[styles.dateText, { color: colors.onSurfaceVariant }]}>{formatDisplayDate()}</Text>
                </View>
            </View>

            {/* Today's Stats Cards */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: colors.primaryContainer, borderRadius: borderRadius.large }]}>
                    <LucideUsers size={22} color={colors.primary} />
                    <Text style={[styles.statNumber, { color: colors.onPrimaryContainer }]}>{stats.total}</Text>
                    <Text style={[styles.statLabel, { color: colors.onPrimaryContainer }]}>Today</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.secondaryContainer, borderRadius: borderRadius.large }]}>
                    <LucideCheckCircle size={22} color={colors.secondary} />
                    <Text style={[styles.statNumber, { color: colors.onSecondaryContainer }]}>{stats.paid}</Text>
                    <Text style={[styles.statLabel, { color: colors.onSecondaryContainer }]}>Received</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.tertiaryContainer, borderRadius: borderRadius.large }]}>
                    <LucideCircleDot size={22} color={colors.tertiary} />
                    <Text style={[styles.statNumber, { color: colors.onTertiaryContainer }]}>{stats.pending}</Text>
                    <Text style={[styles.statLabel, { color: colors.onTertiaryContainer }]}>Pending</Text>
                </View>
            </View>

            {/* Revenue Cards */}
            <View style={styles.revenueRow}>
                <View style={[styles.revenueCard, { backgroundColor: colors.primary, borderRadius: borderRadius.extraLarge }]}>
                    <View style={[styles.revenueLeft, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <LucideWallet size={24} color={colors.onPrimary} />
                    </View>
                    <View style={styles.revenueRight}>
                        <Text style={[styles.revenueLabel, { color: colors.onPrimary + 'CC' }]}>Received Today</Text>
                        <Text style={[styles.revenueAmount, { color: colors.onPrimary }]}>₹{stats.paidRevenue}</Text>
                    </View>
                </View>
                <View style={[styles.revenueCard, { backgroundColor: colors.tertiary, borderRadius: borderRadius.extraLarge }]}>
                    <View style={[styles.revenueLeft, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <LucideTrendingUp size={24} color={colors.onTertiary} />
                    </View>
                    <View style={styles.revenueRight}>
                        <Text style={[styles.revenueLabel, { color: colors.onTertiary + 'CC' }]}>Pending</Text>
                        <Text style={[styles.revenueAmount, { color: colors.onTertiary }]}>₹{stats.pendingRevenue}</Text>
                    </View>
                </View>
            </View>

            {/* Weekly Summary */}
            <View style={[styles.weekCard, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.extraLarge }]}>
                <Text style={[styles.weekTitle, { color: colors.onSurface }]}>This Week's Summary</Text>
                <View style={styles.weekStatsRow}>
                    <View style={styles.weekStat}>
                        <Text style={[styles.weekStatNumber, { color: colors.onSurface }]}>{stats.weekTrips}</Text>
                        <Text style={[styles.weekStatLabel, { color: colors.onSurfaceVariant }]}>Total Trips</Text>
                    </View>
                    <View style={[styles.weekStatDivider, { backgroundColor: colors.outlineVariant }]} />
                    <View style={styles.weekStat}>
                        <Text style={[styles.weekStatNumber, { color: colors.primary }]}>₹{stats.weekPaid}</Text>
                        <Text style={[styles.weekStatLabel, { color: colors.onSurfaceVariant }]}>Collected</Text>
                    </View>
                    <View style={[styles.weekStatDivider, { backgroundColor: colors.outlineVariant }]} />
                    <View style={styles.weekStat}>
                        <Text style={[styles.weekStatNumber, { color: colors.tertiary }]}>₹{stats.weekPending}</Text>
                        <Text style={[styles.weekStatLabel, { color: colors.onSurfaceVariant }]}>Pending</Text>
                    </View>
                </View>
            </View>

            {/* Passenger Weekly Summary */}
            {passengerSummary.length > 0 && (
                <View style={styles.passengerSection}>
                    <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Passengers This Week</Text>
                    {passengerSummary.map((p) => (
                        <PassengerSummaryCard key={p.id} item={p} />
                    ))}
                </View>
            )}

            {/* Today's Trips Header */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Today's Trips</Text>
                <Text style={[styles.sectionCount, { color: colors.onSurfaceVariant }]}>{trips.length} trips</Text>
            </View>
        </Animated.View>
    );

    const ListEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceContainerHighest }]}>
                <LucideQrCode size={48} color={colors.onSurfaceVariant} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No Trips Yet Today</Text>
            <Text style={[styles.emptyHint, { color: colors.onSurfaceVariant }]}>
                Share your QR code with passengers to start recording trips
            </Text>
            <Pressable 
                style={({ pressed }) => [
                    styles.actionHint,
                    { 
                        backgroundColor: colors.primaryContainer,
                        borderRadius: borderRadius.full,
                        opacity: pressed ? 0.8 : 1,
                    }
                ]}
                onPress={() => navigation.navigate('My QR')}
            >
                <LucideQrCode size={18} color={colors.primary} />
                <Text style={[styles.actionHintText, { color: colors.primary }]}>Go to My QR tab</Text>
            </Pressable>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SwipeableScreen>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <FlatList
                data={groupedTrips}
                renderItem={renderGroupedTripItem}
                keyExtractor={item => item.id}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={ListEmpty}
                contentContainerStyle={[styles.listContent, { padding: spacing.lg, paddingBottom: spacing.xl * 2 }]}
                showsVerticalScrollIndicator={false}
            />
            <PassengerDetailModal />
            
            {/* M3 Dialogs */}
            <M3ConfirmDialog
                visible={confirmDialog.visible}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                onConfirm={confirmDialog.onConfirm}
                onDismiss={() => setConfirmDialog(prev => ({ ...prev, visible: false }))}
                isDestructive={confirmDialog.isDestructive}
            />
            <M3ErrorDialog
                visible={errorDialog.visible}
                title={errorDialog.title}
                message={errorDialog.message}
                onDismiss={() => setErrorDialog({ visible: false, title: '', message: '' })}
            />
            <M3InfoDialog
                visible={infoDialog.visible}
                title={infoDialog.title}
                message={infoDialog.message}
                onDismiss={() => setInfoDialog({ visible: false, title: '', message: '' })}
            />
        </View>
        </SwipeableScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: {},
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Header
    header: { marginBottom: 16 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcomeContainer: { flex: 1 },
    greeting: { fontSize: 16 },
    userName: { fontSize: 28, fontWeight: '700', marginTop: 2 },
    avatarContainer: { marginLeft: 12 },
    avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 3 },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 24, fontWeight: '700' },
    dateContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    dateText: { fontSize: 14, marginLeft: 6 },

    // Stats
    statsContainer: { flexDirection: 'row', marginBottom: 12, gap: 8 },
    statCard: { flex: 1, padding: 12, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    statNumber: { fontSize: 22, fontWeight: '700', marginTop: 6 },
    statLabel: { fontSize: 11, marginTop: 2 },

    // Revenue
    revenueRow: { flexDirection: 'row', marginBottom: 16, gap: 12 },
    revenueCard: { flex: 1, flexDirection: 'row', padding: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    revenueLeft: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    revenueRight: { flex: 1 },
    revenueLabel: { fontSize: 12 },
    revenueAmount: { fontSize: 24, fontWeight: '700' },

    // Week Summary
    weekCard: { padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    weekTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
    weekStatsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    weekStat: { alignItems: 'center' },
    weekStatNumber: { fontSize: 20, fontWeight: '700' },
    weekStatLabel: { fontSize: 12, marginTop: 2 },
    weekStatDivider: { width: 1, height: 30 },

    // Passenger Section
    passengerSection: { marginBottom: 16 },
    passengerCard: { padding: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    passengerCardHeader: { flexDirection: 'row', alignItems: 'center' },
    passengerCardAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    passengerCardInitial: { fontSize: 16, fontWeight: '600' },
    passengerCardInfo: { flex: 1 },
    passengerCardName: { fontSize: 15, fontWeight: '600' },
    passengerCardMeta: { fontSize: 12, marginTop: 2 },
    passengerCardAmount: { alignItems: 'flex-end' },
    pendingAmountLabel: { fontSize: 11 },
    pendingAmountValue: { fontSize: 16, fontWeight: '700' },
    paidAmountLabel: { fontSize: 11, marginBottom: 2 },

    // Section Header
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    sectionCount: { fontSize: 14 },

    // Trip Card
    tripCard: { padding: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    passengerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    passengerAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    passengerInitial: { fontSize: 18, fontWeight: '600' },
    passengerDetails: { flex: 1 },
    passengerName: { fontSize: 16, fontWeight: '600' },
    passengerPhone: { fontSize: 13, marginTop: 2 },
    tripTime: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 13, marginLeft: 4 },
    tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
    fareContainer: { flexDirection: 'row', alignItems: 'center' },
    fareLabel: { fontSize: 14, marginRight: 6 },
    fareAmount: { fontSize: 18, fontWeight: '700' },
    statusButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    statusText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },

    // Grouped Trip Card
    groupedTripCard: { padding: 0, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, overflow: 'hidden' },
    groupedPassengerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
    groupedSummary: { alignItems: 'flex-end' },
    groupedTripCount: { fontSize: 12 },
    groupedTotalFare: { fontSize: 16, fontWeight: '700' },
    groupedTripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
    tripRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tripTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    tripTypeText: { fontSize: 12, fontWeight: '600' },
    tripRowTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tripRowTimeText: { fontSize: 12 },
    tripRowRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tripRowFare: { fontSize: 14, fontWeight: '600' },
    miniStatusButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
    miniStatusText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 48 },
    emptyIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptyHint: { fontSize: 14, textAlign: 'center', marginBottom: 16, paddingHorizontal: 24 },
    actionHint: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
    actionHintText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { padding: 20, maxHeight: '75%' },
    handleContainer: { alignItems: 'center', paddingBottom: 8 },
    handle: { width: 32, height: 4, borderRadius: 2 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    closeButton: { padding: 8 },
    modalPassengerHeader: { alignItems: 'center', marginBottom: 16 },
    modalAvatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    modalAvatarText: { fontSize: 28, fontWeight: '700' },
    modalPassengerName: { fontSize: 20, fontWeight: '700' },
    modalInfoSection: { padding: 12, marginBottom: 16 },
    modalInfoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    modalInfoText: { fontSize: 15, marginLeft: 10 },
    modalStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    modalStatCard: { width: '47%', padding: 12, alignItems: 'center' },
    modalStatNumber: { fontSize: 18, fontWeight: '700' },
    modalStatLabel: { fontSize: 11, marginTop: 2 },
    markAllPaidButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    markAllPaidText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
