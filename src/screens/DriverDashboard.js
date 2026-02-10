import React, { useState, useCallback, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import SwipeableScreen from '../components/common/SwipeableScreen';
import { 
    getTodayRange, 
    getWeekRange, 
    getWeekdays, 
    formatTime, 
    formatDate,
    getDateFromTimestamp 
} from '../utils/dateHelpers';

const FARE_PER_TRIP = 31;

export default function DriverDashboard() {
    const { user, profile } = useAuth();
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
        const paidRevenue = paidTrips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0);
        const pendingRevenue = pendingTrips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0);
        
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
            .reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0);
        const weekPaid = data.filter(t => t.payment_status === 'paid')
            .reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0);
        
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
                passengerMap[pid].pendingAmount += (parseFloat(trip.fare_amount) || 0);
            } else {
                passengerMap[pid].paid++;
                passengerMap[pid].paidAmount += (parseFloat(trip.fare_amount) || 0);
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
        Alert.alert(
            'Confirm Payment',
            `Mark this trip for ${passengerName} as paid? This action will record the payment.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Paid',
                    style: 'default',
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
                            fetchTrips();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to update payment: ' + e.message);
                        }
                    },
                },
            ]
        );
    };

    const markPassengerWeekPaid = async (passengerId, passengerName) => {
        const pendingTrips = weekTrips.filter(
            t => t.passenger_id === passengerId && t.payment_status === 'pending'
        );

        if (pendingTrips.length === 0) {
            Alert.alert('Info', 'No pending payments for this passenger.');
            return;
        }

        const totalAmount = pendingTrips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0);

        Alert.alert(
            'Mark All as Paid',
            `Mark all ${pendingTrips.length} pending trips for ${passengerName} as paid?\n\nTotal: \u20B9${totalAmount}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark All Paid',
                    onPress: async () => {
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
                            Alert.alert('Error', 'Failed to update payments: ' + e.message);
                        }
                    },
                },
            ]
        );
    };

    const deleteTrip = (tripId, passengerName) => {
        Alert.alert(
            'Delete Trip',
            `Are you sure you want to delete the trip for ${passengerName}? This action cannot be undone.`,
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
                            fetchTrips();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete trip: ' + e.message);
                        }
                    },
                },
            ]
        );
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

    const renderTripItem = ({ item }) => (
        <TouchableOpacity
            style={styles.tripCard}
            activeOpacity={0.8}
            onLongPress={() => deleteTrip(item.id, item.passenger?.full_name || 'Unknown')}
            delayLongPress={600}
        >
            <View style={styles.tripHeader}>
                <View style={styles.passengerInfo}>
                    <View style={styles.passengerAvatar}>
                        <Text style={styles.passengerInitial}>
                            {item.passenger?.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                    </View>
                    <View style={styles.passengerDetails}>
                        <Text style={styles.passengerName}>
                            {item.passenger?.full_name || 'Unknown Passenger'}
                        </Text>
                        <Text style={styles.passengerPhone}>
                            {item.passenger?.phone || 'No phone'}
                        </Text>
                    </View>
                </View>
                <View style={styles.tripTime}>
                    <LucideClock size={14} color={COLORS.gray[500]} />
                    <Text style={styles.timeText}>
                        {formatTime(item.scan_timestamp)}
                    </Text>
                </View>
            </View>

            <View style={styles.tripFooter}>
                <View style={styles.fareContainer}>
                    <Text style={styles.fareLabel}>Fare</Text>
                    <Text style={styles.fareAmount}>₹{item.fare_amount || FARE_PER_TRIP}</Text>
                </View>

                {item.payment_status === 'paid' ? (
                    <View style={[styles.statusButton, styles.paidButton]}>
                        <LucideCheckCircle size={16} color="#065F46" />
                        <Text style={[styles.statusText, styles.paidText]}>Paid</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.statusButton, styles.pendingButton]}
                        onPress={() => markAsPaid(item.id, item.passenger?.full_name || 'Unknown')}
                        activeOpacity={0.7}
                    >
                        <LucideCircleDot size={16} color="#92400E" />
                        <Text style={[styles.statusText, styles.pendingText]}>Mark Paid</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );

    const openPassengerDetail = (passenger) => {
        setSelectedPassenger(passenger);
        setModalVisible(true);
    };

    const PassengerSummaryCard = ({ item }) => (
        <TouchableOpacity 
            style={styles.passengerCard}
            onPress={() => openPassengerDetail(item)}
            activeOpacity={0.7}
        >
            <View style={styles.passengerCardHeader}>
                <View style={styles.passengerCardAvatar}>
                    <Text style={styles.passengerCardInitial}>
                        {item.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.passengerCardInfo}>
                    <Text style={styles.passengerCardName}>{item.name}</Text>
                    <Text style={styles.passengerCardMeta}>
                        {item.trips} trips � {item.daysActive} days
                    </Text>
                </View>
                <View style={styles.passengerCardAmount}>
                    {item.pendingAmount > 0 ? (
                        <>
                            <Text style={styles.pendingAmountLabel}>Pending</Text>
                            <Text style={styles.pendingAmountValue}>₹{item.pendingAmount}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.paidAmountLabel}>All Paid</Text>
                            <LucideCheckCircle size={16} color={COLORS.success} />
                        </>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    const PassengerDetailModal = () => (
        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Passenger Details</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                            <LucideX size={24} color={COLORS.gray[600]} />
                        </TouchableOpacity>
                    </View>
                    {selectedPassenger && (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalPassengerHeader}>
                                <View style={styles.modalAvatar}>
                                    <Text style={styles.modalAvatarText}>
                                        {selectedPassenger.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.modalPassengerName}>{selectedPassenger.name}</Text>
                            </View>

                            <View style={styles.modalInfoSection}>
                                <View style={styles.modalInfoRow}>
                                    <LucidePhone size={18} color={COLORS.primary} />
                                    <Text style={styles.modalInfoText}>{selectedPassenger.phone}</Text>
                                </View>
                                <View style={styles.modalInfoRow}>
                                    <LucideMail size={18} color={COLORS.primary} />
                                    <Text style={styles.modalInfoText}>{selectedPassenger.email}</Text>
                                </View>
                            </View>

                            <View style={styles.modalStatsGrid}>
                                <View style={[styles.modalStatCard, { backgroundColor: '#EBF5FF' }]}>
                                    <Text style={styles.modalStatNumber}>{selectedPassenger.trips}</Text>
                                    <Text style={styles.modalStatLabel}>Total Trips</Text>
                                </View>
                                <View style={[styles.modalStatCard, { backgroundColor: '#FEF3C7' }]}>
                                    <Text style={styles.modalStatNumber}>₹{selectedPassenger.pendingAmount}</Text>
                                    <Text style={styles.modalStatLabel}>Pending</Text>
                                </View>
                                <View style={[styles.modalStatCard, { backgroundColor: '#D1FAE5' }]}>
                                    <Text style={styles.modalStatNumber}>₹{selectedPassenger.paidAmount}</Text>
                                    <Text style={styles.modalStatLabel}>Paid</Text>
                                </View>
                                <View style={[styles.modalStatCard, { backgroundColor: '#F3E8FF' }]}>
                                    <Text style={styles.modalStatNumber}>{selectedPassenger.daysActive}</Text>
                                    <Text style={styles.modalStatLabel}>Days Active</Text>
                                </View>
                            </View>

                            {selectedPassenger.pendingAmount > 0 && (
                                <TouchableOpacity
                                    style={styles.markAllPaidButton}
                                    onPress={() => markPassengerWeekPaid(selectedPassenger.id, selectedPassenger.name)}
                                >
                                    <LucideCheckCircle size={20} color={COLORS.white} />
                                    <Text style={styles.markAllPaidText}>
                                        Mark All Paid (₹{selectedPassenger.pendingAmount})
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );

    const ListHeader = () => (
        <View>
            {/* Welcome Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.welcomeContainer}>
                        <Text style={styles.greeting}>{getGreeting()},</Text>
                        <Text style={styles.userName}>{getFirstName()} 👋</Text>
                    </View>
                    <TouchableOpacity style={styles.avatarContainer} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
                        {profile?.profile_picture_url ? (
                            <Image source={{ uri: profile.profile_picture_url }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{getFirstName().charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                <View style={styles.dateContainer}>
                    <LucideCalendar size={16} color={COLORS.text.secondary} />
                    <Text style={styles.dateText}>{formatDisplayDate()}</Text>
                </View>
            </View>

            {/* Today's Stats Cards */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: '#EBF5FF' }]}>
                    <LucideUsers size={22} color={COLORS.primary} />
                    <Text style={styles.statNumber}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Today</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                    <LucideCheckCircle size={22} color={COLORS.success} />
                    <Text style={styles.statNumber}>{stats.paid}</Text>
                    <Text style={styles.statLabel}>Paid</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                    <LucideCircleDot size={22} color="#D97706" />
                    <Text style={styles.statNumber}>{stats.pending}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
            </View>

            {/* Revenue Cards */}
            <View style={styles.revenueRow}>
                <View style={[styles.revenueCard, { backgroundColor: COLORS.primary }]}>
                    <View style={styles.revenueLeft}>
                        <LucideWallet size={24} color={COLORS.white} />
                    </View>
                    <View style={styles.revenueRight}>
                        <Text style={styles.revenueLabel}>Paid Today</Text>
                        <Text style={styles.revenueAmount}>₹{stats.paidRevenue.toFixed(0)}</Text>
                    </View>
                </View>
                <View style={[styles.revenueCard, { backgroundColor: '#D97706' }]}>
                    <View style={styles.revenueLeft}>
                        <LucideCircleDot size={24} color={COLORS.white} />
                    </View>
                    <View style={styles.revenueRight}>
                        <Text style={styles.revenueLabel}>Pending</Text>
                        <Text style={styles.revenueAmount}>₹{stats.pendingRevenue.toFixed(0)}</Text>
                    </View>
                </View>
            </View>

            {/* Weekly Summary */}
            <View style={styles.weekCard}>
                <Text style={styles.weekTitle}>This Week's Summary</Text>
                <View style={styles.weekStatsRow}>
                    <View style={styles.weekStat}>
                        <Text style={styles.weekStatNumber}>{stats.weekTrips}</Text>
                        <Text style={styles.weekStatLabel}>Total Trips</Text>
                    </View>
                    <View style={styles.weekStatDivider} />
                    <View style={styles.weekStat}>
                        <Text style={[styles.weekStatNumber, { color: COLORS.success }]}>₹{stats.weekPaid}</Text>
                        <Text style={styles.weekStatLabel}>Collected</Text>
                    </View>
                    <View style={styles.weekStatDivider} />
                    <View style={styles.weekStat}>
                        <Text style={[styles.weekStatNumber, { color: '#D97706' }]}>₹{stats.weekPending}</Text>
                        <Text style={styles.weekStatLabel}>Pending</Text>
                    </View>
                </View>
            </View>

            {/* Passenger Weekly Summary */}
            {passengerSummary.length > 0 && (
                <View style={styles.passengerSection}>
                    <Text style={styles.sectionTitle}>Passengers This Week</Text>
                    {passengerSummary.map((p) => (
                        <PassengerSummaryCard key={p.id} item={p} />
                    ))}
                </View>
            )}

            {/* Today's Trips Header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Trips</Text>
                <Text style={styles.sectionCount}>{trips.length} trips</Text>
            </View>
        </View>
    );

    const ListEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <LucideQrCode size={48} color={COLORS.gray[400]} />
            </View>
            <Text style={styles.emptyTitle}>No Trips Yet Today</Text>
            <Text style={styles.emptyHint}>
                Share your QR code with passengers to start recording trips
            </Text>
            <TouchableOpacity 
                style={styles.actionHint}
                onPress={() => navigation.navigate('My QR')}
            >
                <LucideQrCode size={18} color={COLORS.primary} />
                <Text style={styles.actionHintText}>Go to My QR tab</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SwipeableScreen>
        <View style={styles.container}>
            <FlatList
                data={trips}
                renderItem={renderTripItem}
                keyExtractor={item => item.id}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                    />
                }
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={ListEmpty}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
            <PassengerDetailModal />
        </View>
        </SwipeableScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.light },
    listContent: { padding: SPACING.lg, paddingBottom: SPACING.xl * 2 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background.light },
    
    // Header
    header: { marginBottom: SPACING.lg },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcomeContainer: { flex: 1 },
    greeting: { fontSize: 16, color: COLORS.text.secondary },
    userName: { fontSize: 28, fontWeight: '700', color: COLORS.text.primary, marginTop: 2 },
    avatarContainer: { marginLeft: SPACING.md },
    avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: '#FFD700' },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFD700', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 24, fontWeight: '700', color: COLORS.text.primary },
    dateContainer: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
    dateText: { fontSize: 14, color: COLORS.text.secondary, marginLeft: SPACING.xs },

    // Stats
    statsContainer: { flexDirection: 'row', marginBottom: SPACING.md },
    statCard: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', marginHorizontal: 4, ...SHADOWS.sm },
    statNumber: { fontSize: 22, fontWeight: '700', color: COLORS.text.primary, marginTop: SPACING.xs },
    statLabel: { fontSize: 11, color: COLORS.text.secondary, marginTop: 2 },

    // Revenue
    revenueRow: { flexDirection: 'row', marginBottom: SPACING.lg, gap: SPACING.sm },
    revenueCard: { flex: 1, flexDirection: 'row', borderRadius: BORDER_RADIUS.xl, padding: SPACING.md, alignItems: 'center', ...SHADOWS.md },
    revenueLeft: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
    revenueRight: { flex: 1 },
    revenueLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
    revenueAmount: { fontSize: 24, fontWeight: '700', color: COLORS.white },

    // Week Summary
    weekCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg, ...SHADOWS.sm },
    weekTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginBottom: SPACING.md },
    weekStatsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    weekStat: { alignItems: 'center' },
    weekStatNumber: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
    weekStatLabel: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
    weekStatDivider: { width: 1, height: 30, backgroundColor: COLORS.gray[200] },

    // Passenger Section
    passengerSection: { marginBottom: SPACING.lg },
    passengerCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
    passengerCardHeader: { flexDirection: 'row', alignItems: 'center' },
    passengerCardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
    passengerCardInitial: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
    passengerCardInfo: { flex: 1 },
    passengerCardName: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
    passengerCardMeta: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
    passengerCardAmount: { alignItems: 'flex-end' },
    pendingAmountLabel: { fontSize: 11, color: '#92400E' },
    pendingAmountValue: { fontSize: 16, fontWeight: '700', color: '#D97706' },
    paidAmountLabel: { fontSize: 11, color: '#065F46', marginBottom: 2 },

    // Section Header
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginBottom: SPACING.sm },
    sectionCount: { fontSize: 14, color: COLORS.text.secondary },

    // Trip Card
    tripCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
    tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    passengerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    passengerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
    passengerInitial: { fontSize: 18, fontWeight: '600', color: COLORS.primary },
    passengerDetails: { flex: 1 },
    passengerName: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary },
    passengerPhone: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
    tripTime: { flexDirection: 'row', alignItems: 'center' },
    timeText: { fontSize: 13, color: COLORS.gray[500], marginLeft: 4 },
    tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.gray[100] },
    fareContainer: { flexDirection: 'row', alignItems: 'center' },
    fareLabel: { fontSize: 14, color: COLORS.text.secondary, marginRight: SPACING.xs },
    fareAmount: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
    statusButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full },
    paidButton: { backgroundColor: '#D1FAE5' },
    pendingButton: { backgroundColor: '#FEF3C7' },
    statusText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
    paidText: { color: '#065F46' },
    pendingText: { color: '#92400E' },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xl * 2 },
    emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.gray[100], justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginBottom: SPACING.sm },
    emptyHint: { fontSize: 14, color: COLORS.text.secondary, textAlign: 'center', marginBottom: SPACING.lg, paddingHorizontal: SPACING.xl },
    actionHint: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '15', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full },
    actionHintText: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginLeft: SPACING.sm },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.xl, maxHeight: '75%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
    modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
    closeButton: { padding: SPACING.sm },
    modalPassengerHeader: { alignItems: 'center', marginBottom: SPACING.lg },
    modalAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
    modalAvatarText: { fontSize: 28, fontWeight: '700', color: COLORS.primary },
    modalPassengerName: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
    modalInfoSection: { backgroundColor: COLORS.gray[50], borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg },
    modalInfoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
    modalInfoText: { fontSize: 15, color: COLORS.text.primary, marginLeft: SPACING.sm },
    modalStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
    modalStatCard: { width: '47%', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, alignItems: 'center' },
    modalStatNumber: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
    modalStatLabel: { fontSize: 11, color: COLORS.text.secondary, marginTop: 2 },
    markAllPaidButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.md },
    markAllPaidText: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginLeft: SPACING.sm },
});
