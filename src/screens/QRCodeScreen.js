import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { LucideCar, LucideQrCode, LucideCalendar, LucideIndianRupee } from 'lucide-react-native';
import { getTodayString, getTodayRange, generateQRHash, formatDateLong } from '../utils/dateHelpers';
import SwipeableScreen from '../components/common/SwipeableScreen';

const FARE_PER_TRIP = 31; // Fixed fare per scan from fare_settings

export default function QRCodeScreen() {
    const { user } = useAuth();
    const [car, setCar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [carName, setCarName] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [saving, setSaving] = useState(false);
    const [todayStats, setTodayStats] = useState({ trips: 0, earnings: 0 });

    useEffect(() => {
        fetchCar();
    }, [user]);

    useEffect(() => {
        if (car) {
            fetchTodayStats();
            // Refresh stats every 30 seconds
            const interval = setInterval(fetchTodayStats, 30000);
            return () => clearInterval(interval);
        }
    }, [car]);

    const fetchCar = async () => {
        try {
            const { data, error } = await supabase
                .from('cars')
                .select('*')
                .eq('driver_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching car:', error);
            } else {
                setCar(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchTodayStats = async () => {
        if (!car) return;
        
        const { start, end } = getTodayRange();

        try {
            const { data, error } = await supabase
                .from('trips')
                .select('fare_amount, payment_status')
                .eq('car_id', car.id)
                .gte('scan_timestamp', start)
                .lt('scan_timestamp', end);

            if (!error && data) {
                const totalEarnings = data.reduce((sum, trip) => sum + (trip.fare_amount || FARE_PER_TRIP), 0);
                const paidAmount = data.filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (t.fare_amount || 0), 0);
                setTodayStats({ trips: data.length, earnings: totalEarnings, paid: paidAmount });
            }
        } catch (e) {
            console.error('Error fetching stats:', e);
        }
    };

    const handleAddCar = async () => {
        if (!carName || !licensePlate) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setSaving(true);
        try {
            const qrCodeData = `${user.id}-${Date.now()}`; // Unique string for static car ID part if needed, but we use ID

            const { data, error } = await supabase
                .from('cars')
                .insert([
                    {
                        driver_id: user.id,
                        car_name: carName,
                        license_plate: licensePlate,
                        qr_code_data: qrCodeData, // Static part
                    },
                ])
                .select()
                .single();

            if (error) throw error;
            setCar(data);
        } catch (e) {
            Alert.alert('Error adding car', e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator /></View>;

    if (!car) {
        return (
            <View style={styles.addCarContainer}>
                <View style={styles.iconContainer}>
                    <LucideCar size={64} color={COLORS.primary} />
                </View>
                <Text style={styles.title}>Add Your Car</Text>
                <Text style={styles.subtitle}>Register your car to start generating QR codes for passengers</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Car Name (e.g. Red Toyota)"
                    placeholderTextColor={COLORS.gray[400]}
                    value={carName}
                    onChangeText={setCarName}
                />
                <TextInput
                    style={styles.input}
                    placeholder="License Plate (e.g. MH 12 AB 1234)"
                    placeholderTextColor={COLORS.gray[400]}
                    value={licensePlate}
                    onChangeText={setLicensePlate}
                    autoCapitalize="characters"
                />

                <TouchableOpacity 
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                    onPress={handleAddCar} 
                    disabled={saving}
                >
                    <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Car"}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Generate Daily QR Data with security hash - valid for today only
    const today = getTodayString();
    const qrHash = generateQRHash(car.id, user.id, today);
    const qrData = JSON.stringify({
        carId: car.id,
        driverId: user.id,
        date: today,
        fare: FARE_PER_TRIP,
        hash: qrHash,
    });

    return (
        <SwipeableScreen>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Car Info Header */}
            <View style={styles.carHeader}>
                <LucideCar size={24} color={COLORS.primary} />
                <View style={styles.carInfo}>
                    <Text style={styles.carName}>{car.car_name}</Text>
                    <Text style={styles.licensePlate}>{car.license_plate}</Text>
                </View>
            </View>

            {/* Today's Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <LucideQrCode size={20} color={COLORS.primary} />
                    <Text style={styles.statValue}>{todayStats.trips}</Text>
                    <Text style={styles.statLabel}>Scans Today</Text>
                </View>
                <View style={styles.statCard}>
                    <LucideIndianRupee size={20} color={COLORS.success} />
                    <Text style={[styles.statValue, { color: COLORS.success }]}>₹{todayStats.earnings}</Text>
                    <Text style={styles.statLabel}>Today's Earnings</Text>
                </View>
            </View>

            {/* QR Code */}
            <View style={styles.qrCard}>
                <View style={styles.dateHeader}>
                    <LucideCalendar size={16} color={COLORS.text.secondary} />
                    <Text style={styles.dateText}>{formatDateLong(today)}</Text>
                </View>
                
                <View style={styles.qrContainer}>
                    <QRCode
                        value={qrData}
                        size={220}
                        backgroundColor="white"
                    />
                </View>

                <View style={styles.fareInfo}>
                    <Text style={styles.fareLabel}>Fare per scan</Text>
                    <Text style={styles.fareAmount}>₹{FARE_PER_TRIP}</Text>
                </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
                <Text style={styles.instructionTitle}>How it works</Text>
                <Text style={styles.instructionText}>• This QR code is valid for today only</Text>
                <Text style={styles.instructionText}>• Passengers can scan multiple times</Text>
                <Text style={styles.instructionText}>• Each scan adds ₹{FARE_PER_TRIP} to their total</Text>
                <Text style={styles.instructionText}>• A new QR is generated automatically each day</Text>
            </View>
        </ScrollView>
        </SwipeableScreen>
    );
}

const styles = StyleSheet.create({
    container: { 
        flexGrow: 1, 
        padding: SPACING.lg,
        backgroundColor: COLORS.background.light,
    },
    centered: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    addCarContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.background.light,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: COLORS.text.primary,
        marginBottom: SPACING.sm,
    },
    subtitle: { 
        fontSize: 14, 
        color: COLORS.text.secondary, 
        marginBottom: SPACING.xl, 
        textAlign: 'center',
        paddingHorizontal: SPACING.lg,
    },
    input: { 
        borderWidth: 1, 
        borderColor: COLORS.gray[300], 
        padding: SPACING.md, 
        marginBottom: SPACING.md, 
        borderRadius: BORDER_RADIUS.lg, 
        width: '100%',
        backgroundColor: COLORS.white,
        fontSize: 16,
        color: COLORS.text.primary,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xxl,
        borderRadius: BORDER_RADIUS.lg,
        marginTop: SPACING.md,
        width: '100%',
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    carHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
    },
    carInfo: {
        marginLeft: SPACING.md,
    },
    carName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    licensePlate: {
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text.primary,
        marginTop: SPACING.xs,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    qrCard: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.md,
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    dateText: {
        marginLeft: SPACING.sm,
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    qrContainer: { 
        padding: SPACING.lg, 
        backgroundColor: 'white', 
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 2,
        borderColor: COLORS.gray[200],
    },
    fareInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: SPACING.lg,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray[200],
    },
    fareLabel: {
        fontSize: 14,
        color: COLORS.text.secondary,
    },
    fareAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    instructions: {
        marginTop: SPACING.lg,
        backgroundColor: COLORS.primary + '10',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },
    instructionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: SPACING.sm,
    },
    instructionText: {
        fontSize: 13,
        color: COLORS.text.secondary,
        marginBottom: 4,
    },
});
