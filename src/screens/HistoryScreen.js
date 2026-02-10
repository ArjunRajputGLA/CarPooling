import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    StyleSheet, 
    ActivityIndicator, 
    TouchableOpacity, 
    Modal,
    RefreshControl,
    Image,
    ScrollView,
    TextInput,
    Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
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
    LucideFilter,
    LucideCheckCircle,
    LucideCircleDot,
    LucideTrash2,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import { getMonthRange, formatDate, formatTime, formatDateTime } from '../utils/dateHelpers';
import SwipeableScreen from '../components/common/SwipeableScreen';

const FARE_PER_TRIP = 31;

export default function HistoryScreen() {
    const { user, profile } = useAuth();
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

    useEffect(() => {
        fetchHistory();
    }, [user, filterMonth, filterYear]);

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

            // Calculate totals
            const total = (data || []).reduce((sum, trip) => sum + (parseFloat(trip.fare_amount) || FARE_PER_TRIP), 0);
            const paid = (data || []).filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (parseFloat(t.fare_amount) || 0), 0);
            const pending = total - paid;
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
        <TouchableOpacity 
            style={styles.card}
            onPress={() => handleTripPress(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={styles.dateContainer}>
                    <LucideCalendar size={16} color={COLORS.primary} />
                    <Text style={styles.cardDate}>{formatDate(item.scan_timestamp)}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    item.payment_status === 'paid' ? styles.paidBadge : styles.pendingBadge
                ]}>
                    <Text style={[
                        styles.statusText,
                        item.payment_status === 'paid' ? styles.paidText : styles.pendingText
                    ]}>
                        {item.payment_status === 'paid' ? ' PAID' : ' PENDING'}
                    </Text>
                </View>
            </View>
            <View style={styles.cardRow}>
                <View style={styles.detailRow}>
                    {profile?.role === 'passenger' ? (
                        <>
                            <LucideCar size={16} color={COLORS.gray[500]} />
                            <Text style={styles.cardDetail}>{item.car?.car_name || 'Unknown'}</Text>
                        </>
                    ) : (
                        <>
                            <LucideUser size={16} color={COLORS.gray[500]} />
                            <Text style={styles.cardDetail}>{item.passenger?.full_name || 'Unknown'}</Text>
                        </>
                    )}
                </View>
                <View style={styles.fareContainer}>
                    <Text style={styles.fareLabel}>₹</Text>
                    <Text style={styles.fareAmount}>{item.fare_amount || FARE_PER_TRIP}</Text>
                </View>
            </View>
            <View style={styles.timeRow}>
                <LucideClock size={12} color={COLORS.gray[400]} />
                <Text style={styles.cardTime}>{formatTime(item.scan_timestamp)}</Text>
            </View>
        </TouchableOpacity>
    );

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
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Trip Details</Text>
                        <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                            <LucideX size={24} color={COLORS.gray[600]} />
                        </TouchableOpacity>
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
                                                style={styles.passengerAvatar}
                                            />
                                        ) : (
                                            <View style={styles.avatarPlaceholder}>
                                                <Text style={styles.avatarText}>
                                                    {selectedTrip.passenger?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={styles.passengerName}>
                                            {selectedTrip.passenger?.full_name || 'Unknown Passenger'}
                                        </Text>
                                    </View>
                                )}

                                {/* Contact Info (Driver only) */}
                                {profile?.role === 'driver' && (
                                    <View style={styles.infoSection}>
                                        <View style={styles.infoRow}>
                                            <View style={styles.infoIconContainer}>
                                                <LucideMail size={20} color={COLORS.primary} />
                                            </View>
                                            <View style={styles.infoContent}>
                                                <Text style={styles.infoLabel}>Email</Text>
                                                <Text style={styles.infoValue}>
                                                    {selectedTrip.passenger?.email || 'Not provided'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                                            <View style={styles.infoIconContainer}>
                                                <LucidePhone size={20} color={COLORS.primary} />
                                            </View>
                                            <View style={styles.infoContent}>
                                                <Text style={styles.infoLabel}>Phone</Text>
                                                <Text style={styles.infoValue}>
                                                    {selectedTrip.passenger?.phone || 'Not provided'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Trip Info Grid */}
                                <View style={styles.tripInfoSection}>
                                    <Text style={styles.tripInfoTitle}>Trip Information</Text>
                                    <View style={styles.tripInfoGrid}>
                                        <View style={styles.tripInfoItem}>
                                            <LucideCalendar size={18} color={COLORS.gray[500]} />
                                            <Text style={styles.tripInfoLabel}>Date</Text>
                                            <Text style={styles.tripInfoValue}>
                                                {formatDate(selectedTrip.scan_timestamp)}
                                            </Text>
                                        </View>
                                        <View style={styles.tripInfoItem}>
                                            <LucideClock size={18} color={COLORS.gray[500]} />
                                            <Text style={styles.tripInfoLabel}>Time</Text>
                                            <Text style={styles.tripInfoValue}>
                                                {formatTime(selectedTrip.scan_timestamp)}
                                            </Text>
                                        </View>
                                        <View style={styles.tripInfoItem}>
                                            <LucideWallet size={18} color={COLORS.gray[500]} />
                                            <Text style={styles.tripInfoLabel}>Fare</Text>
                                            <Text style={styles.tripInfoValue}>₹{selectedTrip.fare_amount || FARE_PER_TRIP}</Text>
                                        </View>
                                        <View style={styles.tripInfoItem}>
                                            <LucideCar size={18} color={COLORS.gray[500]} />
                                            <Text style={styles.tripInfoLabel}>Car</Text>
                                            <Text style={styles.tripInfoValue}>
                                                {selectedTrip.car?.car_name || 'N/A'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Payment Status */}
                                <View style={[
                                    styles.paymentStatusCard,
                                    selectedTrip.payment_status === 'paid' ? styles.paidStatusCard : styles.pendingStatusCard
                                ]}>
                                    {selectedTrip.payment_status === 'paid' ? (
                                        <LucideCheckCircle size={24} color="#065F46" />
                                    ) : (
                                        <LucideCircleDot size={24} color="#92400E" />
                                    )}
                                    <View style={styles.paymentStatusInfo}>
                                        <Text style={[
                                            styles.paymentStatusText,
                                            selectedTrip.payment_status === 'paid' ? { color: '#065F46' } : { color: '#92400E' }
                                        ]}>
                                            {selectedTrip.payment_status === 'paid' ? 'Payment Completed' : 'Payment Pending'}
                                        </Text>
                                        {selectedTrip.payment_date && (
                                            <Text style={styles.paymentDateText}>
                                                Paid on {formatDateTime(selectedTrip.payment_date)}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Mark as Paid button (Driver only) */}
                                {profile?.role === 'driver' && selectedTrip.payment_status === 'pending' && (
                                    <TouchableOpacity
                                        style={styles.markPaidButton}
                                        onPress={() => markTripPaid(selectedTrip.id)}
                                    >
                                        <LucideCheckCircle size={20} color={COLORS.white} />
                                        <Text style={styles.markPaidText}>Mark as Paid</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Delete Trip button (Driver only) */}
                                {profile?.role === 'driver' && (
                                    <TouchableOpacity
                                        style={styles.deleteTripButton}
                                        onPress={() => deleteTrip(selectedTrip.id)}
                                    >
                                        <LucideTrash2 size={20} color={COLORS.error} />
                                        <Text style={styles.deleteTripText}>Delete Trip</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Close */}
                                <TouchableOpacity style={styles.closeModalButton} onPress={closeModal}>
                                    <Text style={styles.closeModalButtonText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    return (
        <SwipeableScreen>
        <View style={styles.container}>
            {/* Month Filter */}
            <View style={styles.filter}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
                    <Text style={styles.arrow}>{"<"}</Text>
                </TouchableOpacity>
                <Text style={styles.month}>{monthNames[filterMonth]} {filterYear}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowButton}>
                    <Text style={styles.arrow}>{">"}</Text>
                </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: COLORS.primary }]}>
                    <Text style={styles.summaryLabel}>Total</Text>
                    <Text style={styles.summaryAmount}>₹{totalFare}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: COLORS.success }]}>
                    <Text style={styles.summaryLabel}>Paid</Text>
                    <Text style={styles.summaryAmount}>₹{paidFare}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#D97706' }]}>
                    <Text style={styles.summaryLabel}>Pending</Text>
                    <Text style={styles.summaryAmount}>₹{pendingFare}</Text>
                </View>
            </View>

            {/* Search & Filter */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <LucideSearch size={18} color={COLORS.gray[400]} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={profile?.role === 'driver' ? 'Search passengers...' : 'Search cars...'}
                        placeholderTextColor={COLORS.gray[400]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <LucideX size={18} color={COLORS.gray[400]} />
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.filterRow}>
                    {['all', 'pending', 'paid'].map(status => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.filterChip,
                                statusFilter === status && styles.filterChipActive
                            ]}
                            onPress={() => setStatusFilter(status)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                statusFilter === status && styles.filterChipTextActive
                            ]}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Trip count */}
            <Text style={styles.resultsCount}>
                {filteredTrips.length} trip{filteredTrips.length !== 1 ? 's' : ''}
                {searchQuery || statusFilter !== 'all' ? ' (filtered)' : ''}
            </Text>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredTrips}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <LucideCalendar size={48} color={COLORS.gray[400]} />
                            <Text style={styles.empty}>
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
                            colors={[COLORS.primary]}
                        />
                    }
                    contentContainerStyle={filteredTrips.length === 0 ? styles.emptyListContent : styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <TripDetailModal />
        </View>
        </SwipeableScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: SPACING.lg, backgroundColor: COLORS.background.light },
    
    // Filter
    filter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md, backgroundColor: COLORS.white, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.sm },
    arrowButton: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
    arrow: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
    month: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },

    // Summary
    summaryRow: { flexDirection: 'row', marginBottom: SPACING.md, gap: SPACING.sm },
    summaryCard: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', ...SHADOWS.sm },
    summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    summaryAmount: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginTop: 2 },

    // Search
    searchContainer: { marginBottom: SPACING.sm },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, ...SHADOWS.sm, marginBottom: SPACING.sm },
    searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: 14, color: COLORS.text.primary, paddingVertical: SPACING.xs },
    filterRow: { flexDirection: 'row', gap: SPACING.sm },
    filterChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.gray[100] },
    filterChipActive: { backgroundColor: COLORS.primary },
    filterChipText: { fontSize: 13, fontWeight: '500', color: COLORS.text.secondary },
    filterChipTextActive: { color: COLORS.white },
    resultsCount: { fontSize: 12, color: COLORS.text.secondary, marginBottom: SPACING.sm },

    // Card
    card: { backgroundColor: COLORS.white, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, ...SHADOWS.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    dateContainer: { flexDirection: 'row', alignItems: 'center' },
    cardDate: { fontWeight: '600', fontSize: 14, color: COLORS.text.primary, marginLeft: SPACING.xs },
    statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full },
    paidBadge: { backgroundColor: '#DEF7EC' },
    pendingBadge: { backgroundColor: '#FEF3C7' },
    statusText: { fontSize: 11, fontWeight: '700' },
    paidText: { color: '#03543F' },
    pendingText: { color: '#92400E' },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    cardDetail: { fontSize: 14, color: COLORS.text.secondary, marginLeft: SPACING.xs },
    fareContainer: { flexDirection: 'row', alignItems: 'baseline' },
    fareLabel: { fontSize: 12, color: COLORS.text.secondary, marginRight: 2 },
    fareAmount: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
    timeRow: { flexDirection: 'row', alignItems: 'center' },
    cardTime: { color: COLORS.gray[400], fontSize: 12, marginLeft: SPACING.xs },

    // Loading / Empty
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxxl },
    empty: { textAlign: 'center', color: COLORS.gray[500], marginTop: SPACING.lg, fontSize: 14 },
    listContent: { paddingBottom: SPACING.xl },
    emptyListContent: { flexGrow: 1 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.xl, maxHeight: '85%' },
    modalScrollContent: { paddingBottom: SPACING.md },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
    modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
    closeButton: { padding: SPACING.sm },
    passengerHeader: { alignItems: 'center', marginBottom: SPACING.xl },
    passengerAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: SPACING.md },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
    avatarText: { fontSize: 32, fontWeight: '700', color: COLORS.primary },
    passengerName: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
    infoSection: { backgroundColor: COLORS.background.light, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.gray[200] },
    infoIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 12, color: COLORS.text.secondary, marginBottom: 2 },
    infoValue: { fontSize: 15, color: COLORS.text.primary, fontWeight: '500' },
    tripInfoSection: { marginBottom: SPACING.lg },
    tripInfoTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text.primary, marginBottom: SPACING.md },
    tripInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    tripInfoItem: { width: '47%', backgroundColor: COLORS.background.light, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
    tripInfoLabel: { fontSize: 11, color: COLORS.text.secondary, marginTop: SPACING.xs },
    tripInfoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary, marginTop: 2 },
    paymentStatusCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.lg },
    paidStatusCard: { backgroundColor: '#D1FAE5' },
    pendingStatusCard: { backgroundColor: '#FEF3C7' },
    paymentStatusInfo: { marginLeft: SPACING.md, flex: 1 },
    paymentStatusText: { fontSize: 16, fontWeight: '600' },
    paymentDateText: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
    markPaidButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, ...SHADOWS.md },
    markPaidText: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginLeft: SPACING.sm },
    deleteTripButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.error + '10', padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.error },
    deleteTripText: { color: COLORS.error, fontSize: 16, fontWeight: '600', marginLeft: SPACING.sm },
    closeModalButton: { backgroundColor: COLORS.gray[100], padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, alignItems: 'center' },
    closeModalButtonText: { color: COLORS.text.primary, fontSize: 16, fontWeight: '600' },
});
