import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    StyleSheet, 
    ActivityIndicator, 
    Pressable, 
    Modal,
    RefreshControl,
    Image,
    ScrollView,
    TextInput,
    Alert,
    Animated,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { 
    LucideCalendar, 
    LucideX, 
    LucideUser, 
    LucideMail, 
    LucidePhone,
    LucideCar,
    LucideWallet,
    LucideClock,
    LucideSearch,
    LucideCheckCircle,
    LucideCircleDot,
    LucideTrash2,
    LucideChevronLeft,
    LucideChevronRight,
    LucideInbox,
} from 'lucide-react-native';
import { getMonthRange, formatDate, formatTime, formatDateTime } from '../utils/dateHelpers';
import SwipeableScreen from '../components/common/SwipeableScreen';

const FARE_PER_TRIP = 31;

export default function HistoryScreen() {
    const { user, profile } = useAuth();
    const { colors, spacing, borderRadius, isDark } = useTheme();
    const [trips, setTrips] = useState([]);
    const [filteredTrips, setFilteredTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [totalFare, setTotalFare] = useState(0);
    const [paidFare, setPaidFare] = useState(0);
    const [pendingFare, setPendingFare] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, pending, paid
    
    // Modal state
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    
    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    
    // Subscription ref
    const subscriptionRef = useRef(null);
    
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    // Real-time subscription for trip updates
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('history-trips-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'trips',
            }, () => {
                // Refresh history when trips are updated
                fetchHistory(true);
            })
            .subscribe();

        subscriptionRef.current = channel;

        return () => {
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
            }
        };
    }, [user?.id, filterMonth, filterYear]);

    // Refresh on focus
    useFocusEffect(
        useCallback(() => {
            fetchHistory();
        }, [filterMonth, filterYear])
    );

    useEffect(() => {
        applyFilters();
    }, [trips, searchQuery, statusFilter]);

    const fetchHistory = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const { start, end } = getMonthRange(filterYear, filterMonth);

            let build = supabase
                .from('trips')
                .select(`
                    *,
                    car:cars(car_name, license_plate),
                    passenger:users!passenger_id(id, full_name, email, phone, profile_picture_url)
                `)
                .order('scan_timestamp', { ascending: false })
                .gte('scan_timestamp', start)
                .lt('scan_timestamp', end);

            if (profile?.role === 'passenger') {
                build = build.eq('passenger_id', user.id);
            } else {
                const { data: cars } = await supabase.from('cars').select('id').eq('driver_id', user.id);
                const carIds = cars ? cars.map(c => c.id) : [];
                if (carIds.length > 0) {
                    build = build.in('car_id', carIds);
                } else {
                    setTrips([]);
                    setTotalFare(0);
                    setPaidFare(0);
                    setPendingFare(0);
                    setLoading(false);
                    setRefreshing(false);
                    return;
                }
            }

            const { data, error } = await build;
            if (error) throw error;
            setTrips(data || []);

            // Calculate totals properly
            const total = (data || []).reduce((sum, trip) => sum + (parseFloat(trip.fare_amount) || FARE_PER_TRIP), 0);
            const paid = (data || []).filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
            const pending = (data || []).filter(t => t.payment_status === 'pending').reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
            setTotalFare(total);
            setPaidFare(paid);
            setPendingFare(pending);
        } catch (e) {
            console.error('History fetch error:', e);
            Alert.alert('Error', 'Failed to load trip history. Pull down to refresh.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const applyFilters = () => {
        let result = [...trips];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(trip => {
                const passengerName = trip.passenger?.full_name?.toLowerCase() || '';
                const carName = trip.car?.car_name?.toLowerCase() || '';
                const plate = trip.car?.license_plate?.toLowerCase() || '';
                return passengerName.includes(query) || carName.includes(query) || plate.includes(query);
            });
        }

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(trip => trip.payment_status === statusFilter);
        }

        setFilteredTrips(result);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchHistory(true);
    }, [filterMonth, filterYear]);

    const handleTripPress = (trip) => {
        setSelectedTrip(trip);
        setModalVisible(true);
    };

    const markTripPaid = async (tripId) => {
        Alert.alert(
            'Confirm Payment',
            'Mark this trip as paid?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Paid',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('trips')
                                .update({ 
                                    payment_status: 'paid',
                                    payment_date: new Date().toISOString()
                                })
                                .eq('id', tripId);
                            if (error) throw error;
                            setModalVisible(false);
                            fetchHistory(true);
                        } catch (e) {
                            Alert.alert('Error', 'Failed to update payment status.');
                        }
                    },
                },
            ]
        );
    };

    const deleteTrip = (tripId) => {
        Alert.alert(
            'Delete Trip',
            'Are you sure you want to delete this trip? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('trips')
                                .delete()
                                .eq('id', tripId);
                            if (error) throw error;
                            setModalVisible(false);
                            setSelectedTrip(null);
                            fetchHistory(true);
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete trip: ' + e.message);
                        }
                    },
                },
            ]
        );
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedTrip(null);
    };

    const renderItem = ({ item }) => (
        <Pressable 
            style={({ pressed }) => [
                styles.card,
                { 
                    backgroundColor: colors.surfaceContainerLow, 
                    borderRadius: borderRadius.large,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                }
            ]}
            onPress={() => handleTripPress(item)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.dateContainer}>
                    <LucideCalendar size={16} color={colors.primary} />
                    <Text style={[styles.cardDate, { color: colors.onSurface }]}>{formatDate(item.scan_timestamp)}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    { 
                        backgroundColor: item.payment_status === 'paid' ? colors.primaryContainer : colors.tertiaryContainer,
                        borderRadius: borderRadius.full,
                    }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.payment_status === 'paid' ? colors.primary : colors.tertiary }
                    ]}>
                        {item.payment_status === 'paid' ? '✓ PAID' : '◐ PENDING'}
                    </Text>
                </View>
            </View>
            <View style={styles.cardRow}>
                <View style={styles.detailRow}>
                    {profile?.role === 'passenger' ? (
                        <>
                            <LucideCar size={16} color={colors.onSurfaceVariant} />
                            <Text style={[styles.cardDetail, { color: colors.onSurfaceVariant }]}>{item.car?.car_name || 'Unknown'}</Text>
                        </>
                    ) : (
                        <>
                            <LucideUser size={16} color={colors.onSurfaceVariant} />
                            <Text style={[styles.cardDetail, { color: colors.onSurfaceVariant }]}>{item.passenger?.full_name || 'Unknown'}</Text>
                        </>
                    )}
                </View>
                <View style={styles.fareContainer}>
                    <Text style={[styles.fareLabel, { color: colors.onSurfaceVariant }]}>₹</Text>
                    <Text style={[styles.fareAmount, { color: colors.primary }]}>{item.fare_amount || FARE_PER_TRIP}</Text>
                </View>
            </View>
            <View style={styles.timeRow}>
                <LucideClock size={12} color={colors.onSurfaceVariant} />
                <Text style={[styles.cardTime, { color: colors.onSurfaceVariant }]}>{formatTime(item.scan_timestamp)}</Text>
            </View>
        </Pressable>
    );

    // Group trips by date+passenger (for driver view) or date+car (for passenger view)
    const groupedFilteredTrips = useMemo(() => {
        const isDriver = profile?.role === 'driver';
        
        // Group by date + passenger (driver) or date + car (passenger)
        const grouped = {};
        filteredTrips.forEach(trip => {
            const dateKey = formatDate(trip.scan_timestamp);
            const groupKey = isDriver ? trip.passenger_id : trip.car_id;
            const key = `${dateKey}_${groupKey}`;
            
            if (!grouped[key]) {
                grouped[key] = {
                    id: key,
                    isGrouped: true,
                    isDriver: isDriver,
                    date: dateKey,
                    passenger: isDriver ? trip.passenger : null,
                    car: !isDriver ? trip.car : null,
                    trips: []
                };
            }
            grouped[key].trips.push(trip);
        });
        
        // Sort trips within each group by timestamp
        Object.values(grouped).forEach(group => {
            group.trips.sort((a, b) => new Date(a.scan_timestamp) - new Date(b.scan_timestamp));
        });
        
        // Return as array, sorted by most recent date first
        return Object.values(grouped).sort((a, b) => {
            const aDate = new Date(a.trips[0]?.scan_timestamp);
            const bDate = new Date(b.trips[0]?.scan_timestamp);
            return bDate - aDate;
        });
    }, [filteredTrips, profile?.role]);

    // Render grouped trip item for both driver and passenger view
    const renderGroupedItem = ({ item }) => {
        const totalFare = item.trips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
        const allPaid = item.trips.every(t => t.payment_status === 'paid');
        const hasPending = item.trips.some(t => t.payment_status !== 'paid');
        const isDriver = item.isDriver;

        return (
            <View style={[
                styles.groupedCard,
                { 
                    backgroundColor: colors.surfaceContainerLow, 
                    borderRadius: borderRadius.large,
                }
            ]}>
                {/* Header with date */}
                <View style={styles.groupedCardHeader}>
                    <View style={styles.dateContainer}>
                        <LucideCalendar size={16} color={colors.primary} />
                        <Text style={[styles.cardDate, { color: colors.onSurface }]}>{item.date}</Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { 
                            backgroundColor: allPaid ? colors.primaryContainer : colors.tertiaryContainer,
                            borderRadius: borderRadius.full,
                        }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: allPaid ? colors.primary : colors.tertiary }
                        ]}>
                            {allPaid ? '✓ ALL PAID' : hasPending ? '◐ HAS PENDING' : ''}
                        </Text>
                    </View>
                </View>

                {/* Passenger/Car Info Row */}
                <View style={styles.groupedPassengerRow}>
                    <View style={styles.detailRow}>
                        {isDriver ? (
                            <>
                                <LucideUser size={16} color={colors.onSurfaceVariant} />
                                <Text style={[styles.cardDetail, { color: colors.onSurface, fontWeight: '600' }]}>
                                    {item.passenger?.full_name || 'Unknown'}
                                </Text>
                            </>
                        ) : (
                            <>
                                <LucideCar size={16} color={colors.onSurfaceVariant} />
                                <Text style={[styles.cardDetail, { color: colors.onSurface, fontWeight: '600' }]}>
                                    {item.car?.car_name || 'Unknown Car'}
                                </Text>
                            </>
                        )}
                    </View>
                    <View style={styles.groupedSummaryInfo}>
                        <Text style={[styles.tripCountText, { color: colors.onSurfaceVariant }]}>
                            {item.trips.length} {item.trips.length === 1 ? 'trip' : 'trips'}
                        </Text>
                        <Text style={[styles.totalFareText, { color: colors.primary }]}>₹{totalFare}</Text>
                    </View>
                </View>

                {/* Individual trip rows */}
                {item.trips.map((trip, tripIndex) => {
                    const tripLabel = tripIndex === 0 ? 'Going' : tripIndex === 1 ? 'Return' : `Trip ${tripIndex + 1}`;
                    
                    return (
                        <Pressable
                            key={trip.id}
                            style={[
                                styles.groupedTripRow,
                                { borderTopColor: colors.outlineVariant }
                            ]}
                            onPress={() => handleTripPress(trip)}
                        >
                            <View style={styles.tripRowLeftHistory}>
                                <View style={[
                                    styles.tripTypeBadgeHistory, 
                                    { backgroundColor: tripIndex === 0 ? colors.primaryContainer : colors.tertiaryContainer }
                                ]}>
                                    <Text style={[
                                        styles.tripTypeTextHistory, 
                                        { color: tripIndex === 0 ? colors.primary : colors.tertiary }
                                    ]}>
                                        {tripLabel}
                                    </Text>
                                </View>
                                <View style={styles.tripTimeHistory}>
                                    <LucideClock size={12} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.tripTimeTextHistory, { color: colors.onSurfaceVariant }]}>
                                        {formatTime(trip.scan_timestamp)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.tripRowRightHistory}>
                                <Text style={[styles.tripFareHistory, { color: colors.onSurface }]}>
                                    ₹{trip.fare_amount || FARE_PER_TRIP}
                                </Text>
                                <View style={[
                                    styles.miniStatusBadge,
                                    { backgroundColor: trip.payment_status === 'paid' ? colors.primaryContainer : colors.tertiaryContainer }
                                ]}>
                                    {trip.payment_status === 'paid' ? (
                                        <LucideCheckCircle size={14} color={colors.primary} />
                                    ) : (
                                        <LucideCircleDot size={14} color={colors.tertiary} />
                                    )}
                                </View>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        );
    };

    const changeMonth = (delta) => {
        let newMonth = filterMonth + delta;
        let newYear = filterYear;
        if (newMonth > 11) { newMonth = 0; newYear++; }
        if (newMonth < 0) { newMonth = 11; newYear--; }
        setFilterMonth(newMonth);
        setFilterYear(newYear);
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Trip Detail Modal
    const TripDetailModal = () => (
        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
            <Pressable style={styles.modalOverlay} onPress={closeModal}>
                <Pressable style={[styles.modalContent, { backgroundColor: colors.surfaceContainerHigh, borderTopLeftRadius: borderRadius.extraLarge, borderTopRightRadius: borderRadius.extraLarge }]} onPress={(e) => e.stopPropagation()}>
                    <View style={[styles.modalHandle, { backgroundColor: colors.outlineVariant }]} />
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Trip Details</Text>
                        <Pressable onPress={closeModal} style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}>
                            <LucideX size={24} color={colors.onSurfaceVariant} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                        {selectedTrip && (
                            <>
                                {/* Passenger/Car Info */}
                                {profile?.role === 'driver' && selectedTrip.passenger && (
                                    <View style={styles.passengerHeader}>
                                        {selectedTrip.passenger?.profile_picture_url ? (
                                            <Image 
                                                source={{ uri: selectedTrip.passenger.profile_picture_url }}
                                                style={[styles.passengerAvatar, { borderColor: colors.primary }]}
                                            />
                                        ) : (
                                            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryContainer }]}>
                                                <Text style={[styles.avatarText, { color: colors.primary }]}>
                                                    {selectedTrip.passenger?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={[styles.passengerName, { color: colors.onSurface }]}>
                                            {selectedTrip.passenger?.full_name || 'Unknown Passenger'}
                                        </Text>
                                    </View>
                                )}

                                {/* Contact Info (Driver only) */}
                                {profile?.role === 'driver' && (
                                    <View style={[styles.infoSection, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.large }]}>
                                        <View style={[styles.infoRow, { borderBottomColor: colors.outlineVariant }]}>
                                            <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryContainer }]}>
                                                <LucideMail size={20} color={colors.primary} />
                                            </View>
                                            <View style={styles.infoContent}>
                                                <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>Email</Text>
                                                <Text style={[styles.infoValue, { color: colors.onSurface }]}>
                                                    {selectedTrip.passenger?.email || 'Not provided'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                                            <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryContainer }]}>
                                                <LucidePhone size={20} color={colors.primary} />
                                            </View>
                                            <View style={styles.infoContent}>
                                                <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>Phone</Text>
                                                <Text style={[styles.infoValue, { color: colors.onSurface }]}>
                                                    {selectedTrip.passenger?.phone || 'Not provided'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Trip Info Grid */}
                                <View style={styles.tripInfoSection}>
                                    <Text style={[styles.tripInfoTitle, { color: colors.onSurface }]}>Trip Information</Text>
                                    <View style={styles.tripInfoGrid}>
                                        <View style={[styles.tripInfoItem, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.medium }]}>
                                            <LucideCalendar size={18} color={colors.onSurfaceVariant} />
                                            <Text style={[styles.tripInfoLabel, { color: colors.onSurfaceVariant }]}>Date</Text>
                                            <Text style={[styles.tripInfoValue, { color: colors.onSurface }]}>
                                                {formatDate(selectedTrip.scan_timestamp)}
                                            </Text>
                                        </View>
                                        <View style={[styles.tripInfoItem, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.medium }]}>
                                            <LucideClock size={18} color={colors.onSurfaceVariant} />
                                            <Text style={[styles.tripInfoLabel, { color: colors.onSurfaceVariant }]}>Time</Text>
                                            <Text style={[styles.tripInfoValue, { color: colors.onSurface }]}>
                                                {formatTime(selectedTrip.scan_timestamp)}
                                            </Text>
                                        </View>
                                        <View style={[styles.tripInfoItem, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.medium }]}>
                                            <LucideWallet size={18} color={colors.onSurfaceVariant} />
                                            <Text style={[styles.tripInfoLabel, { color: colors.onSurfaceVariant }]}>Fare</Text>
                                            <Text style={[styles.tripInfoValue, { color: colors.onSurface }]}>₹{selectedTrip.fare_amount || FARE_PER_TRIP}</Text>
                                        </View>
                                        <View style={[styles.tripInfoItem, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.medium }]}>
                                            <LucideCar size={18} color={colors.onSurfaceVariant} />
                                            <Text style={[styles.tripInfoLabel, { color: colors.onSurfaceVariant }]}>Car</Text>
                                            <Text style={[styles.tripInfoValue, { color: colors.onSurface }]}>
                                                {selectedTrip.car?.car_name || 'N/A'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Payment Status */}
                                <View style={[
                                    styles.paymentStatusCard,
                                    { 
                                        backgroundColor: selectedTrip.payment_status === 'paid' ? colors.primaryContainer : colors.tertiaryContainer,
                                        borderRadius: borderRadius.large,
                                    }
                                ]}>
                                    {selectedTrip.payment_status === 'paid' ? (
                                        <LucideCheckCircle size={24} color={colors.primary} />
                                    ) : (
                                        <LucideCircleDot size={24} color={colors.tertiary} />
                                    )}
                                    <View style={styles.paymentStatusInfo}>
                                        <Text style={[
                                            styles.paymentStatusText,
                                            { color: selectedTrip.payment_status === 'paid' ? colors.onPrimaryContainer : colors.onTertiaryContainer }
                                        ]}>
                                            {selectedTrip.payment_status === 'paid' ? 'Payment Completed' : 'Payment Pending'}
                                        </Text>
                                        {selectedTrip.payment_date && (
                                            <Text style={[styles.paymentDateText, { color: colors.onPrimaryContainer }]}>
                                                Paid on {formatDateTime(selectedTrip.payment_date)}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Mark as Paid button (Driver only) */}
                                {profile?.role === 'driver' && selectedTrip.payment_status === 'pending' && (
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.markPaidButton,
                                            { 
                                                backgroundColor: colors.primary,
                                                borderRadius: borderRadius.large,
                                                opacity: pressed ? 0.8 : 1,
                                            }
                                        ]}
                                        onPress={() => markTripPaid(selectedTrip.id)}
                                    >
                                        <LucideCheckCircle size={20} color={colors.onPrimary} />
                                        <Text style={[styles.markPaidText, { color: colors.onPrimary }]}>Mark as Paid</Text>
                                    </Pressable>
                                )}

                                {/* Delete Trip button (Driver only) */}
                                {profile?.role === 'driver' && (
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.deleteTripButton,
                                            { 
                                                backgroundColor: colors.errorContainer,
                                                borderRadius: borderRadius.large,
                                                opacity: pressed ? 0.8 : 1,
                                            }
                                        ]}
                                        onPress={() => deleteTrip(selectedTrip.id)}
                                    >
                                        <LucideTrash2 size={20} color={colors.error} />
                                        <Text style={[styles.deleteTripText, { color: colors.error }]}>Delete Trip</Text>
                                    </Pressable>
                                )}

                                {/* Close */}
                                <Pressable 
                                    style={({ pressed }) => [
                                        styles.closeModalButton, 
                                        { 
                                            backgroundColor: colors.surfaceContainerHighest,
                                            borderRadius: borderRadius.large,
                                            opacity: pressed ? 0.8 : 1,
                                        }
                                    ]} 
                                    onPress={closeModal}
                                >
                                    <Text style={[styles.closeModalButtonText, { color: colors.onSurface }]}>Close</Text>
                                </Pressable>
                            </>
                        )}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );

    return (
        <SwipeableScreen>
        <Animated.View style={[styles.container, { backgroundColor: colors.surface, padding: spacing.lg, opacity: fadeAnim }]}>
            {/* Month Filter */}
            <View style={[styles.filter, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.large }]}>
                <Pressable 
                    onPress={() => changeMonth(-1)} 
                    style={({ pressed }) => [styles.arrowButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <LucideChevronLeft size={24} color={colors.primary} />
                </Pressable>
                <Text style={[styles.month, { color: colors.onSurface }]}>{monthNames[filterMonth]} {filterYear}</Text>
                <Pressable 
                    onPress={() => changeMonth(1)} 
                    style={({ pressed }) => [styles.arrowButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <LucideChevronRight size={24} color={colors.primary} />
                </Pressable>
            </View>

            {/* Summary */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: colors.primary, borderRadius: borderRadius.large }]}>
                    <Text style={[styles.summaryLabel, { color: colors.onPrimary }]}>Total</Text>
                    <Text style={[styles.summaryAmount, { color: colors.onPrimary }]}>₹{totalFare}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: colors.tertiary, borderRadius: borderRadius.large }]}>
                    <Text style={[styles.summaryLabel, { color: colors.onTertiary }]}>Paid</Text>
                    <Text style={[styles.summaryAmount, { color: colors.onTertiary }]}>₹{paidFare}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: colors.secondary, borderRadius: borderRadius.large }]}>
                    <Text style={[styles.summaryLabel, { color: colors.onSecondary }]}>Pending</Text>
                    <Text style={[styles.summaryAmount, { color: colors.onSecondary }]}>₹{pendingFare}</Text>
                </View>
            </View>

            {/* Search & Filter */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchBox, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.large }]}>
                    <LucideSearch size={18} color={colors.onSurfaceVariant} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.onSurface }]}
                        placeholder={profile?.role === 'driver' ? 'Search passengers...' : 'Search cars...'}
                        placeholderTextColor={colors.onSurfaceVariant}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <LucideX size={18} color={colors.onSurfaceVariant} />
                        </Pressable>
                    )}
                </View>
                <View style={styles.filterRow}>
                    {['all', 'pending', 'paid'].map(status => (
                        <Pressable
                            key={status}
                            style={({ pressed }) => [
                                styles.filterChip,
                                { 
                                    backgroundColor: statusFilter === status ? colors.primary : colors.surfaceContainerHighest,
                                    borderRadius: borderRadius.full,
                                    opacity: pressed ? 0.8 : 1,
                                }
                            ]}
                            onPress={() => setStatusFilter(status)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                { color: statusFilter === status ? colors.onPrimary : colors.onSurfaceVariant }
                            ]}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Trip count */}
            <Text style={[styles.resultsCount, { color: colors.onSurfaceVariant }]}>
                {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''}
                {searchQuery || statusFilter !== 'all' ? ' (filtered)' : ''}
            </Text>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={groupedFilteredTrips}
                    renderItem={renderGroupedItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surfaceContainerHighest }]}>
                                <LucideInbox size={48} color={colors.onSurfaceVariant} />
                            </View>
                            <Text style={[styles.empty, { color: colors.onSurfaceVariant }]}>
                                {searchQuery || statusFilter !== 'all' 
                                    ? 'No trips match your filters.' 
                                    : 'No trips found for this month.'}
                            </Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    contentContainerStyle={groupedFilteredTrips.length === 0 ? styles.emptyListContent : styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <TripDetailModal />
        </Animated.View>
        </SwipeableScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    
    // Filter
    filter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    arrowButton: { paddingHorizontal: 16, paddingVertical: 8 },
    month: { fontSize: 18, fontWeight: '700' },

    // Summary
    summaryRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
    summaryCard: { flex: 1, padding: 12, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    summaryLabel: { fontSize: 12, fontWeight: '500', opacity: 0.9 },
    summaryAmount: { fontSize: 18, fontWeight: '700', marginTop: 2 },

    // Search
    searchContainer: { marginBottom: 8 },
    searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, paddingVertical: 4 },
    filterRow: { flexDirection: 'row', gap: 8 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6 },
    filterChipText: { fontSize: 13, fontWeight: '500' },
    resultsCount: { fontSize: 12, marginBottom: 8 },

    // Card
    card: { padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    dateContainer: { flexDirection: 'row', alignItems: 'center' },
    cardDate: { fontWeight: '600', fontSize: 14, marginLeft: 6 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 11, fontWeight: '700' },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    cardDetail: { fontSize: 14, marginLeft: 6 },
    fareContainer: { flexDirection: 'row', alignItems: 'baseline' },
    fareLabel: { fontSize: 12, marginRight: 2 },
    fareAmount: { fontSize: 18, fontWeight: '700' },
    timeRow: { flexDirection: 'row', alignItems: 'center' },
    cardTime: { fontSize: 12, marginLeft: 6 },

    // Grouped Card (for driver view - multiple trips per passenger per day)
    groupedCard: { marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, overflow: 'hidden' },
    groupedCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 8 },
    groupedPassengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12 },
    groupedSummaryInfo: { alignItems: 'flex-end' },
    tripCountText: { fontSize: 12 },
    totalFareText: { fontSize: 16, fontWeight: '700' },
    groupedTripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
    tripRowLeftHistory: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tripTypeBadgeHistory: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    tripTypeTextHistory: { fontSize: 12, fontWeight: '600' },
    tripTimeHistory: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tripTimeTextHistory: { fontSize: 12 },
    tripRowRightHistory: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tripFareHistory: { fontSize: 14, fontWeight: '600' },
    miniStatusBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

    // Loading / Empty
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
    emptyIconContainer: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    empty: { textAlign: 'center', fontSize: 14 },
    listContent: { paddingBottom: 24 },
    emptyListContent: { flexGrow: 1 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { padding: 24, maxHeight: '85%' },
    modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalScrollContent: { paddingBottom: 12 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700' },
    closeButton: { padding: 8 },
    passengerHeader: { alignItems: 'center', marginBottom: 24 },
    passengerAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 3 },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { fontSize: 32, fontWeight: '700' },
    passengerName: { fontSize: 20, fontWeight: '700' },
    infoSection: { padding: 16, marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    infoIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 12, marginBottom: 2 },
    infoValue: { fontSize: 15, fontWeight: '500' },
    tripInfoSection: { marginBottom: 16 },
    tripInfoTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
    tripInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tripInfoItem: { width: '47%', padding: 12, alignItems: 'center' },
    tripInfoLabel: { fontSize: 11, marginTop: 6 },
    tripInfoValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
    paymentStatusCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 16 },
    paymentStatusInfo: { marginLeft: 12, flex: 1 },
    paymentStatusText: { fontSize: 16, fontWeight: '600' },
    paymentDateText: { fontSize: 12, marginTop: 2, opacity: 0.8 },
    markPaidButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    markPaidText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
    deleteTripButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginBottom: 12 },
    deleteTripText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
    closeModalButton: { padding: 16, alignItems: 'center' },
    closeModalButtonText: { fontSize: 16, fontWeight: '600' },
});
