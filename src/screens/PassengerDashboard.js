import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    RefreshControl, 
    ScrollView, 
    ActivityIndicator,
    Image,
    TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { 
    LucideCheckCircle, 
    LucideXCircle, 
    LucideScan, 
    LucideCalendar,
    LucideClock,
    LucideCar,
    LucideWallet,
    LucideMapPin,
    LucideCircleDot,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import { 
    getTodayRange, 
    getWeekRange, 
    getWeekdays, 
    formatTime, 
    formatDate,
    getDateFromTimestamp,
    isFriday,
} from '../utils/dateHelpers';

const FARE_PER_TRIP = 31;

export default function PassengerDashboard() {
    const { user, profile } = useAuth();
    const navigation = useNavigation();
    const [todayTrips, setTodayTrips] = useState([]);
    const [weekTrips, setWeekTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const subscriptionRef = useRef(null);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getFirstName = () => {
        if (profile?.full_name) return profile.full_name.split(' ')[0];
        return 'Passenger';
    };

    const fetchDashboard = async () => {
        try {
            const { start: todayStart, end: todayEnd } = getTodayRange();

            // Fetch today's trips
            const { data: todayData, error: todayError } = await supabase
                .from('trips')
                .select(`
                    *,
                    car:cars(car_name, license_plate)
                `)
                .eq('passenger_id', user?.id)
                .gte('scan_timestamp', todayStart)
                .lt('scan_timestamp', todayEnd)
                .order('scan_timestamp', { ascending: false });

            if (todayError && todayError.code !== 'PGRST116') {
                console.error('Error fetching today trips:', todayError);
            } else {
                setTodayTrips(todayData || []);
            }

            // Fetch this week's trips
            const { start: weekStart, end: weekEnd } = getWeekRange();
            const { data: weekData, error: weekError } = await supabase
                .from('trips')
                .select(`
                    *,
                    car:cars(car_name, license_plate)
                `)
                .eq('passenger_id', user?.id)
                .gte('scan_timestamp', weekStart)
                .lt('scan_timestamp', weekEnd)
                .order('scan_timestamp', { ascending: false });

            if (weekError && weekError.code !== 'PGRST116') {
                console.error('Error fetching week trips:', weekError);
            } else {
                setWeekTrips(weekData || []);
            }
        } catch (e) {
            console.error('Dashboard error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Real-time subscription for payment status changes
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('passenger-trips')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'trips',
                filter: `passenger_id=eq.${user.id}`,
            }, () => {
                fetchDashboard();
            })
            .subscribe();

        subscriptionRef.current = channel;

        return () => {
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
            }
        };
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            fetchDashboard();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboard();
    }, []);

    const formatDisplayDate = () => {
        return new Date().toLocaleDateString('en-US', { 
            weekday: 'long', month: 'long', day: 'numeric' 
        });
    };

    // Calculate stats
    const todayTripCount = todayTrips.length;
    const todayTotal = todayTrips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
    const todayPaid = todayTrips.filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0);
    
    const weekTripCount = weekTrips.length;
    const weekPending = weekTrips.filter(t => t.payment_status === 'pending').reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
    const weekPaid = weekTrips.filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0);
    const weekTotal = weekPending + weekPaid;

    // Get weekday activity
    const weekdays = getWeekdays();
    const tripDateSet = new Set(weekTrips.map(t => getDateFromTimestamp(t.scan_timestamp)));

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SwipeableScreen>
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh}
                    colors={[COLORS.primary]}
                />
            }
            showsVerticalScrollIndicator={false}
        >
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

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: '#EBF5FF' }]}>
                    <LucideScan size={24} color={COLORS.primary} />
                    <Text style={styles.statNumber}>{todayTripCount}</Text>
                    <Text style={styles.statLabel}>Today's Trips</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                    <LucideWallet size={24} color="#D97706" />
                    <Text style={styles.statNumber}>₹{weekPending}</Text>
                    <Text style={styles.statLabel}>Week Pending</Text>
                </View>
            </View>

            {/* Today's Status Card */}
            <View style={styles.statusCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Today's Trip Status</Text>
                    <View style={[
                        styles.statusBadge,
                        todayTripCount > 0 ? styles.statusActive : styles.statusInactive
                    ]}>
                        <Text style={[
                            styles.statusBadgeText,
                            todayTripCount > 0 ? styles.statusActiveText : styles.statusInactiveText
                        ]}>
                            {todayTripCount > 0 ? 'Logged' : 'Not Logged'}
                        </Text>
                    </View>
                </View>

                {todayTripCount > 0 ? (
                    <View style={styles.tripDetails}>
                        <View style={styles.tripIconContainer}>
                            <LucideCheckCircle size={48} color={COLORS.success} />
                        </View>
                        <Text style={styles.tripTitle}>
                            {todayTripCount === 1 ? 'Trip Recorded! ' : `${todayTripCount} Trips Recorded! `}
                        </Text>
                        
                        {todayTrips.map((trip, index) => (
                            <View key={trip.id} style={styles.tripInfo}>
                                <View style={styles.tripInfoHeader}>
                                    <Text style={styles.tripInfoLabel}>
                                        {index === 0 ? ' Going' : ' Return'}
                                    </Text>
                                    <View style={[
                                        styles.miniPaymentBadge,
                                        trip.payment_status === 'paid' ? styles.paidBadge : styles.pendingBadge
                                    ]}>
                                        <Text style={[
                                            styles.miniPaymentText,
                                            trip.payment_status === 'paid' ? styles.paidText : styles.pendingText
                                        ]}>
                                            {trip.payment_status === 'paid' ? ' PAID' : ' PENDING'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.tripInfoRow}>
                                    <LucideCar size={18} color={COLORS.gray[500]} />
                                    <Text style={styles.tripInfoText}>
                                        {trip.car?.car_name || 'Car'}  {trip.car?.license_plate || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.tripInfoRow}>
                                    <LucideClock size={18} color={COLORS.gray[500]} />
                                    <Text style={styles.tripInfoText}>
                                        Scanned at {formatTime(trip.scan_timestamp)}
                                    </Text>
                                </View>
                                <View style={styles.tripInfoRow}>
                                    <LucideWallet size={18} color={COLORS.gray[500]} />
                                    <Text style={styles.tripInfoText}>
                                        Fare: ₹{trip.fare_amount || FARE_PER_TRIP}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        <View style={styles.todayTotalCard}>
                            <Text style={styles.todayTotalLabel}>Today's Total</Text>
                            <Text style={styles.todayTotalAmount}>₹{todayTotal}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.noTripContainer}>
                        <View style={styles.noTripIconContainer}>
                            <LucideXCircle size={56} color={COLORS.gray[400]} />
                        </View>
                        <Text style={styles.noTripTitle}>No Trip Logged Yet</Text>
                        <Text style={styles.noTripHint}>
                            Scan the driver's QR code to log your trip for today
                        </Text>
                        <TouchableOpacity 
                            style={styles.actionHint}
                            onPress={() => navigation.navigate('Scan')}
                        >
                            <LucideScan size={20} color={COLORS.primary} />
                            <Text style={styles.actionHintText}>Go to Scan tab</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Weekly Tracking */}
            <View style={styles.weekCard}>
                <Text style={styles.weekTitle}>This Week (Mon-Fri)</Text>
                
                {/* Day indicators */}
                <View style={styles.dayRow}>
                    {weekdays.map((day) => {
                        const isActive = tripDateSet.has(day.date);
                        return (
                            <View key={day.date} style={styles.dayItem}>
                                <Text style={[
                                    styles.dayName,
                                    day.isToday && styles.dayNameToday
                                ]}>{day.dayName}</Text>
                                <View style={[
                                    styles.dayCircle,
                                    isActive ? styles.dayCircleActive : styles.dayCircleInactive,
                                    day.isToday && !isActive && styles.dayCircleToday,
                                ]}>
                                    {isActive ? (
                                        <LucideCheckCircle size={18} color={COLORS.white} />
                                    ) : (
                                        <Text style={[
                                            styles.dayNum,
                                            day.isToday && styles.dayNumToday
                                        ]}>{day.dayNum}</Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Week summary */}
                <View style={styles.weekSummary}>
                    <View style={styles.weekSummaryItem}>
                        <Text style={styles.weekSummaryNumber}>{weekTripCount}</Text>
                        <Text style={styles.weekSummaryLabel}>Trips</Text>
                    </View>
                    <View style={styles.weekSummaryDivider} />
                    <View style={styles.weekSummaryItem}>
                        <Text style={[styles.weekSummaryNumber, { color: '#D97706' }]}>₹{weekPending}</Text>
                        <Text style={styles.weekSummaryLabel}>Pending</Text>
                    </View>
                    <View style={styles.weekSummaryDivider} />
                    <View style={styles.weekSummaryItem}>
                        <Text style={[styles.weekSummaryNumber, { color: COLORS.success }]}>₹{weekPaid}</Text>
                        <Text style={styles.weekSummaryLabel}>Paid</Text>
                    </View>
                    <View style={styles.weekSummaryDivider} />
                    <View style={styles.weekSummaryItem}>
                        <Text style={[styles.weekSummaryNumber, { color: COLORS.primary }]}>₹{weekTotal}</Text>
                        <Text style={styles.weekSummaryLabel}>Total</Text>
                    </View>
                </View>

                {isFriday() && weekPending > 0 && (
                    <View style={styles.settlementBanner}>
                        <Text style={styles.settlementText}>
                             Today is settlement day! Please pay ₹{weekPending} to your driver.
                        </Text>
                    </View>
                )}
            </View>

            {/* Tips Card */}
            <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}> Quick Tips</Text>
                <Text style={styles.tipText}> Each trip (going or coming) costs ₹{FARE_PER_TRIP}</Text>
                <Text style={styles.tipText}> Max 2 scans per day per car (going + return)</Text>
                <Text style={styles.tipText}> Friday is settlement day - pay weekly dues</Text>
                <Text style={styles.tipText}> Check your trip history for past rides</Text>
            </View>
        </ScrollView>
        </SwipeableScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background.light },
    scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xl * 2 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background.light },

    // Header
    header: { marginBottom: SPACING.xl },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcomeContainer: { flex: 1 },
    greeting: { fontSize: 16, color: COLORS.text.secondary },
    userName: { fontSize: 28, fontWeight: '700', color: COLORS.text.primary, marginTop: 2 },
    avatarContainer: { marginLeft: SPACING.md },
    avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: COLORS.primary },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 24, fontWeight: '700', color: COLORS.white },
    dateContainer: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
    dateText: { fontSize: 14, color: COLORS.text.secondary, marginLeft: SPACING.xs },

    // Stats
    statsContainer: { flexDirection: 'row', marginBottom: SPACING.lg },
    statCard: { flex: 1, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', marginHorizontal: SPACING.xs, ...SHADOWS.sm },
    statNumber: { fontSize: 24, fontWeight: '700', color: COLORS.text.primary, marginTop: SPACING.sm },
    statLabel: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },

    // Status Card
    statusCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg, ...SHADOWS.md },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
    cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
    statusBadge: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full },
    statusActive: { backgroundColor: '#D1FAE5' },
    statusInactive: { backgroundColor: '#FEE2E2' },
    statusBadgeText: { fontSize: 12, fontWeight: '600' },
    statusActiveText: { color: '#065F46' },
    statusInactiveText: { color: '#DC2626' },

    // Trip Details
    tripDetails: { alignItems: 'center' },
    tripIconContainer: { marginBottom: SPACING.sm },
    tripTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary, marginBottom: SPACING.md },
    tripInfo: { width: '100%', backgroundColor: COLORS.gray[50], borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
    tripInfoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    tripInfoLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
    tripInfoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    tripInfoText: { fontSize: 14, color: COLORS.text.primary, marginLeft: SPACING.sm },
    miniPaymentBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
    paidBadge: { backgroundColor: '#D1FAE5' },
    pendingBadge: { backgroundColor: '#FEF3C7' },
    miniPaymentText: { fontSize: 11, fontWeight: '700' },
    paidText: { color: '#065F46' },
    pendingText: { color: '#92400E' },
    todayTotalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', backgroundColor: COLORS.primary + '10', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginTop: SPACING.sm },
    todayTotalLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
    todayTotalAmount: { fontSize: 20, fontWeight: '700', color: COLORS.primary },

    // No Trip
    noTripContainer: { alignItems: 'center', paddingVertical: SPACING.lg },
    noTripIconContainer: { marginBottom: SPACING.md },
    noTripTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text.primary, marginBottom: SPACING.sm },
    noTripHint: { fontSize: 14, color: COLORS.text.secondary, textAlign: 'center', marginBottom: SPACING.lg, paddingHorizontal: SPACING.lg },
    actionHint: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '15', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full },
    actionHintText: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginLeft: SPACING.sm },

    // Week Card
    weekCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg, ...SHADOWS.sm },
    weekTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginBottom: SPACING.md },
    dayRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.lg },
    dayItem: { alignItems: 'center' },
    dayName: { fontSize: 12, color: COLORS.text.secondary, marginBottom: SPACING.xs, fontWeight: '500' },
    dayNameToday: { color: COLORS.primary, fontWeight: '700' },
    dayCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    dayCircleActive: { backgroundColor: COLORS.success },
    dayCircleInactive: { backgroundColor: COLORS.gray[100] },
    dayCircleToday: { borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
    dayNum: { fontSize: 14, fontWeight: '600', color: COLORS.text.secondary },
    dayNumToday: { color: COLORS.primary },
    weekSummary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.gray[100] },
    weekSummaryItem: { alignItems: 'center' },
    weekSummaryNumber: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
    weekSummaryLabel: { fontSize: 11, color: COLORS.text.secondary, marginTop: 2 },
    weekSummaryDivider: { width: 1, height: 28, backgroundColor: COLORS.gray[200] },
    settlementBanner: { backgroundColor: '#FEF3C7', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginTop: SPACING.md },
    settlementText: { fontSize: 13, color: '#92400E', fontWeight: '500', textAlign: 'center' },

    // Tips
    tipsCard: { backgroundColor: '#FFFBEB', borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: '#FCD34D' },
    tipsTitle: { fontSize: 16, fontWeight: '600', color: '#92400E', marginBottom: SPACING.sm },
    tipText: { fontSize: 13, color: '#78350F', marginBottom: 4, lineHeight: 20 },
});
