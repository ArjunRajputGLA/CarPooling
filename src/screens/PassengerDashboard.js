import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    RefreshControl, 
    ScrollView, 
    ActivityIndicator,
    Image,
    Pressable,
    Animated,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
import SwipeableScreen from '../components/common/SwipeableScreen';
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
    const { colors, spacing, borderRadius, typography, isDark } = useTheme();
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

    // Calculate stats with proper fare handling
    const todayTripCount = todayTrips.length;
    const todayTotal = todayTrips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
    const todayPaid = todayTrips.filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
    
    const weekTripCount = weekTrips.length;
    const weekPending = weekTrips.filter(t => t.payment_status === 'pending').reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
    const weekPaid = weekTrips.filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);
    const weekTotal = weekTrips.reduce((sum, t) => sum + (parseFloat(t.fare_amount) || FARE_PER_TRIP), 0);

    // Get weekday activity
    const weekdays = getWeekdays();
    const tripDateSet = new Set(weekTrips.map(t => getDateFromTimestamp(t.scan_timestamp)));

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SwipeableScreen>
        <ScrollView
            style={[styles.container, { backgroundColor: colors.surface }]}
            contentContainerStyle={[styles.scrollContent, { padding: spacing.lg, paddingBottom: spacing.xl * 2 }]}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                />
            }
            showsVerticalScrollIndicator={false}
        >
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

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: colors.primaryContainer, borderRadius: borderRadius.large }]}>
                    <LucideScan size={24} color={colors.primary} />
                    <Text style={[styles.statNumber, { color: colors.onPrimaryContainer }]}>{todayTripCount}</Text>
                    <Text style={[styles.statLabel, { color: colors.onPrimaryContainer }]}>Today's Trips</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.tertiaryContainer, borderRadius: borderRadius.large }]}>
                    <LucideWallet size={24} color={colors.tertiary} />
                    <Text style={[styles.statNumber, { color: colors.onTertiaryContainer }]}>₹{weekPending}</Text>
                    <Text style={[styles.statLabel, { color: colors.onTertiaryContainer }]}>Week Pending</Text>
                </View>
            </View>

            {/* Today's Status Card */}
            <View style={[styles.statusCard, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.extraLarge }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Today's Trip Status</Text>
                    <View style={[
                        styles.statusBadge,
                        { borderRadius: borderRadius.full },
                        todayTripCount > 0 
                            ? { backgroundColor: colors.primaryContainer } 
                            : { backgroundColor: colors.errorContainer }
                    ]}>
                        <Text style={[
                            styles.statusBadgeText,
                            todayTripCount > 0 
                                ? { color: colors.onPrimaryContainer } 
                                : { color: colors.onErrorContainer }
                        ]}>
                            {todayTripCount > 0 ? 'Logged' : 'Not Logged'}
                        </Text>
                    </View>
                </View>

                {todayTripCount > 0 ? (
                    <View style={styles.tripDetails}>
                        <View style={styles.tripIconContainer}>
                            <LucideCheckCircle size={48} color={colors.primary} />
                        </View>
                        <Text style={[styles.tripTitle, { color: colors.onSurface }]}>
                            {todayTripCount === 1 ? 'Trip Recorded! ' : `${todayTripCount} Trips Recorded! `}
                        </Text>
                        
                        {todayTrips.map((trip, index) => (
                            <View key={trip.id} style={[styles.tripInfo, { backgroundColor: colors.surfaceContainerHighest, borderRadius: borderRadius.large }]}>
                                <View style={styles.tripInfoHeader}>
                                    <Text style={[styles.tripInfoLabel, { color: colors.onSurface }]}>
                                        {index === 0 ? ' Going' : ' Return'}
                                    </Text>
                                    <View style={[
                                        styles.miniPaymentBadge,
                                        { borderRadius: borderRadius.full },
                                        trip.payment_status === 'paid' 
                                            ? { backgroundColor: colors.primaryContainer } 
                                            : { backgroundColor: colors.tertiaryContainer }
                                    ]}>
                                        <Text style={[
                                            styles.miniPaymentText,
                                            trip.payment_status === 'paid' 
                                                ? { color: colors.onPrimaryContainer } 
                                                : { color: colors.onTertiaryContainer }
                                        ]}>
                                            {trip.payment_status === 'paid' ? ' PAID' : ' PENDING'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.tripInfoRow}>
                                    <LucideCar size={18} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.tripInfoText, { color: colors.onSurface }]}>
                                        {trip.car?.car_name || 'Car'}  {trip.car?.license_plate || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.tripInfoRow}>
                                    <LucideClock size={18} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.tripInfoText, { color: colors.onSurface }]}>
                                        Scanned at {formatTime(trip.scan_timestamp)}
                                    </Text>
                                </View>
                                <View style={styles.tripInfoRow}>
                                    <LucideWallet size={18} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.tripInfoText, { color: colors.onSurface }]}>
                                        Fare: ₹{trip.fare_amount || FARE_PER_TRIP}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        <View style={[styles.todayTotalCard, { backgroundColor: colors.primaryContainer, borderRadius: borderRadius.large }]}>
                            <Text style={[styles.todayTotalLabel, { color: colors.onPrimaryContainer }]}>Today's Total</Text>
                            <Text style={[styles.todayTotalAmount, { color: colors.onPrimaryContainer }]}>₹{todayTotal}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.noTripContainer}>
                        <View style={[styles.noTripIconContainer, { backgroundColor: colors.surfaceContainerHighest, borderRadius: borderRadius.full }]}>
                            <LucideXCircle size={56} color={colors.onSurfaceVariant} />
                        </View>
                        <Text style={[styles.noTripTitle, { color: colors.onSurface }]}>No Trip Logged Yet</Text>
                        <Text style={[styles.noTripHint, { color: colors.onSurfaceVariant }]}>
                            Scan the driver's QR code to log your trip for today
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
                            onPress={() => navigation.navigate('Scan')}
                        >
                            <LucideScan size={20} color={colors.primary} />
                            <Text style={[styles.actionHintText, { color: colors.primary }]}>Go to Scan tab</Text>
                        </Pressable>
                    </View>
                )}
            </View>

            {/* Weekly Tracking */}
            <View style={[styles.weekCard, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.extraLarge }]}>
                <Text style={[styles.weekTitle, { color: colors.onSurface }]}>This Week (Mon-Fri)</Text>
                
                {/* Day indicators */}
                <View style={styles.dayRow}>
                    {weekdays.map((day) => {
                        const isActive = tripDateSet.has(day.date);
                        return (
                            <View key={day.date} style={styles.dayItem}>
                                <Text style={[
                                    styles.dayName,
                                    { color: colors.onSurfaceVariant },
                                    day.isToday && { color: colors.primary, fontWeight: '700' }
                                ]}>{day.dayName}</Text>
                                <View style={[
                                    styles.dayCircle,
                                    isActive 
                                        ? { backgroundColor: colors.primary } 
                                        : { backgroundColor: colors.surfaceContainerHighest },
                                    day.isToday && !isActive && { 
                                        borderWidth: 2, 
                                        borderColor: colors.primary, 
                                        backgroundColor: colors.primaryContainer + '40' 
                                    },
                                ]}>
                                    {isActive ? (
                                        <LucideCheckCircle size={18} color={colors.onPrimary} />
                                    ) : (
                                        <Text style={[
                                            styles.dayNum,
                                            { color: colors.onSurfaceVariant },
                                            day.isToday && { color: colors.primary }
                                        ]}>{day.dayNum}</Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Week summary */}
                <View style={[styles.weekSummary, { borderTopColor: colors.outlineVariant }]}>
                    <View style={styles.weekSummaryItem}>
                        <Text style={[styles.weekSummaryNumber, { color: colors.onSurface }]}>{weekTripCount}</Text>
                        <Text style={[styles.weekSummaryLabel, { color: colors.onSurfaceVariant }]}>Trips</Text>
                    </View>
                    <View style={[styles.weekSummaryDivider, { backgroundColor: colors.outlineVariant }]} />
                    <View style={styles.weekSummaryItem}>
                        <Text style={[styles.weekSummaryNumber, { color: colors.tertiary }]}>₹{weekPending}</Text>
                        <Text style={[styles.weekSummaryLabel, { color: colors.onSurfaceVariant }]}>Pending</Text>
                    </View>
                    <View style={[styles.weekSummaryDivider, { backgroundColor: colors.outlineVariant }]} />
                    <View style={styles.weekSummaryItem}>
                        <Text style={[styles.weekSummaryNumber, { color: colors.primary }]}>₹{weekPaid}</Text>
                        <Text style={[styles.weekSummaryLabel, { color: colors.onSurfaceVariant }]}>Paid</Text>
                    </View>
                    <View style={[styles.weekSummaryDivider, { backgroundColor: colors.outlineVariant }]} />
                    <View style={styles.weekSummaryItem}>
                        <Text style={[styles.weekSummaryNumber, { color: colors.secondary }]}>₹{weekTotal}</Text>
                        <Text style={[styles.weekSummaryLabel, { color: colors.onSurfaceVariant }]}>Total</Text>
                    </View>
                </View>

                {isFriday() && weekPending > 0 && (
                    <View style={[styles.settlementBanner, { backgroundColor: colors.tertiaryContainer, borderRadius: borderRadius.large }]}>
                        <Text style={[styles.settlementText, { color: colors.onTertiaryContainer }]}>
                             Today is settlement day! Please pay ₹{weekPending} to your driver.
                        </Text>
                    </View>
                )}
            </View>

            {/* Tips Card */}
            <View style={[styles.tipsCard, { backgroundColor: colors.secondaryContainer, borderRadius: borderRadius.large, borderColor: colors.secondary }]}>
                <Text style={[styles.tipsTitle, { color: colors.onSecondaryContainer }]}> Quick Tips</Text>
                <Text style={[styles.tipText, { color: colors.onSecondaryContainer }]}> Each trip (going or coming) costs ₹{FARE_PER_TRIP}</Text>
                <Text style={[styles.tipText, { color: colors.onSecondaryContainer }]}> Max 2 scans per day per car (going + return)</Text>
                <Text style={[styles.tipText, { color: colors.onSecondaryContainer }]}> Friday is settlement day - pay weekly dues</Text>
                <Text style={[styles.tipText, { color: colors.onSecondaryContainer }]}> Check your trip history for past rides</Text>
            </View>
        </ScrollView>
        </SwipeableScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {},
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: { marginBottom: 24 },
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
    statsContainer: { flexDirection: 'row', marginBottom: 16, gap: 12 },
    statCard: { flex: 1, padding: 16, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    statNumber: { fontSize: 24, fontWeight: '700', marginTop: 8 },
    statLabel: { fontSize: 12, marginTop: 2 },

    // Status Card
    statusCard: { padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4 },
    statusBadgeText: { fontSize: 12, fontWeight: '600' },

    // Trip Details
    tripDetails: { alignItems: 'center' },
    tripIconContainer: { marginBottom: 8 },
    tripTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
    tripInfo: { width: '100%', padding: 12, marginBottom: 8 },
    tripInfoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    tripInfoLabel: { fontSize: 14, fontWeight: '600' },
    tripInfoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    tripInfoText: { fontSize: 14, marginLeft: 8 },
    miniPaymentBadge: { paddingHorizontal: 8, paddingVertical: 2 },
    miniPaymentText: { fontSize: 11, fontWeight: '700' },
    todayTotalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: 12, marginTop: 8 },
    todayTotalLabel: { fontSize: 14, fontWeight: '600' },
    todayTotalAmount: { fontSize: 20, fontWeight: '700' },

    // No Trip
    noTripContainer: { alignItems: 'center', paddingVertical: 16 },
    noTripIconContainer: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    noTripTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
    noTripHint: { fontSize: 14, textAlign: 'center', marginBottom: 16, paddingHorizontal: 16 },
    actionHint: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
    actionHintText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },

    // Week Card
    weekCard: { padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    weekTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
    dayRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
    dayItem: { alignItems: 'center' },
    dayName: { fontSize: 12, marginBottom: 4, fontWeight: '500' },
    dayCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    dayNum: { fontSize: 14, fontWeight: '600' },
    weekSummary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
    weekSummaryItem: { alignItems: 'center' },
    weekSummaryNumber: { fontSize: 18, fontWeight: '700' },
    weekSummaryLabel: { fontSize: 11, marginTop: 2 },
    weekSummaryDivider: { width: 1, height: 28 },
    settlementBanner: { padding: 12, marginTop: 12 },
    settlementText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },

    // Tips
    tipsCard: { padding: 16, borderWidth: 1 },
    tipsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    tipText: { fontSize: 13, marginBottom: 4, lineHeight: 20 },
});
