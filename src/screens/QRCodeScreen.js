import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Pressable, Animated } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { LucideCar, LucideQrCode, LucideCalendar, LucideIndianRupee, LucidePlus } from 'lucide-react-native';
import { getTodayString, getTodayRange, generateQRHash, formatDateLong } from '../utils/dateHelpers';
import SwipeableScreen from '../components/common/SwipeableScreen';

const FARE_PER_TRIP = 31; // Fixed fare per scan from fare_settings

export default function QRCodeScreen() {
    const { user } = useAuth();
    const { colors, spacing, borderRadius, typography, isDark } = useTheme();
    const [car, setCar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [carName, setCarName] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [saving, setSaving] = useState(false);
    const [todayStats, setTodayStats] = useState({ trips: 0, earnings: 0 });
    
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

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

    if (loading) return <View style={[styles.centered, { backgroundColor: colors.surface }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

    if (!car) {
        return (
            <Animated.View style={[
                styles.addCarContainer, 
                { backgroundColor: colors.surface, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primaryContainer }]}>
                    <LucideCar size={64} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.onSurface }]}>Add Your Car</Text>
                <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>Register your car to start generating QR codes for passengers</Text>

                <TextInput
                    style={[
                        styles.input, 
                        { 
                            borderColor: colors.outline,
                            backgroundColor: colors.surfaceContainerLow,
                            color: colors.onSurface,
                            borderRadius: borderRadius.large,
                        }
                    ]}
                    placeholder="Car Name (e.g. Red Toyota)"
                    placeholderTextColor={colors.onSurfaceVariant}
                    value={carName}
                    onChangeText={setCarName}
                />
                <TextInput
                    style={[
                        styles.input, 
                        { 
                            borderColor: colors.outline,
                            backgroundColor: colors.surfaceContainerLow,
                            color: colors.onSurface,
                            borderRadius: borderRadius.large,
                        }
                    ]}
                    placeholder="License Plate (e.g. MH 12 AB 1234)"
                    placeholderTextColor={colors.onSurfaceVariant}
                    value={licensePlate}
                    onChangeText={setLicensePlate}
                    autoCapitalize="characters"
                />

                <Pressable 
                    style={({ pressed }) => [
                        styles.saveButton, 
                        { 
                            backgroundColor: colors.primary,
                            borderRadius: borderRadius.large,
                            opacity: saving ? 0.6 : pressed ? 0.8 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                        }
                    ]} 
                    onPress={handleAddCar} 
                    disabled={saving}
                >
                    <LucidePlus size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                    <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>{saving ? "Saving..." : "Save Car"}</Text>
                </Pressable>
            </Animated.View>
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
        <ScrollView 
            contentContainerStyle={[styles.container, { backgroundColor: colors.surface, padding: spacing.lg }]} 
            showsVerticalScrollIndicator={false}
        >
            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                {/* Car Info Header */}
                <View style={[styles.carHeader, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.large }]}>
                    <View style={[styles.carIconBox, { backgroundColor: colors.primaryContainer, borderRadius: borderRadius.medium }]}>
                        <LucideCar size={24} color={colors.primary} />
                    </View>
                    <View style={styles.carInfo}>
                        <Text style={[styles.carName, { color: colors.onSurface }]}>{car.car_name}</Text>
                        <Text style={[styles.licensePlate, { color: colors.onSurfaceVariant }]}>{car.license_plate}</Text>
                    </View>
                </View>

                {/* Today's Stats */}
                <View style={styles.statsContainer}>
                    <View style={[styles.statCard, { backgroundColor: colors.primaryContainer, borderRadius: borderRadius.large }]}>
                        <LucideQrCode size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.onPrimaryContainer }]}>{todayStats.trips}</Text>
                        <Text style={[styles.statLabel, { color: colors.onPrimaryContainer }]}>Scans Today</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.tertiaryContainer, borderRadius: borderRadius.large }]}>
                        <LucideIndianRupee size={20} color={colors.tertiary} />
                        <Text style={[styles.statValue, { color: colors.onTertiaryContainer }]}>₹{todayStats.earnings}</Text>
                        <Text style={[styles.statLabel, { color: colors.onTertiaryContainer }]}>Today's Earnings</Text>
                    </View>
                </View>

                {/* QR Code */}
                <View style={[styles.qrCard, { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.extraLarge }]}>
                    <View style={styles.dateHeader}>
                        <LucideCalendar size={16} color={colors.onSurfaceVariant} />
                        <Text style={[styles.dateText, { color: colors.onSurfaceVariant }]}>{formatDateLong(today)}</Text>
                    </View>
                    
                    <View style={[styles.qrContainer, { borderRadius: borderRadius.large, borderColor: colors.outlineVariant }]}>
                        <QRCode
                            value={qrData}
                            size={220}
                            backgroundColor="white"
                            color={isDark ? '#1a1a1a' : '#000000'}
                        />
                    </View>

                    <View style={[styles.fareInfo, { borderTopColor: colors.outlineVariant }]}>
                        <Text style={[styles.fareLabel, { color: colors.onSurfaceVariant }]}>Fare per scan</Text>
                        <Text style={[styles.fareAmount, { color: colors.primary }]}>₹{FARE_PER_TRIP}</Text>
                    </View>
                </View>

                {/* Instructions */}
                <View style={[styles.instructions, { backgroundColor: colors.secondaryContainer, borderRadius: borderRadius.large }]}>
                    <Text style={[styles.instructionTitle, { color: colors.onSecondaryContainer }]}>How it works</Text>
                    <Text style={[styles.instructionText, { color: colors.onSecondaryContainer }]}>• This QR code is valid for today only</Text>
                    <Text style={[styles.instructionText, { color: colors.onSecondaryContainer }]}>• Passengers can scan multiple times</Text>
                    <Text style={[styles.instructionText, { color: colors.onSecondaryContainer }]}>• Each scan adds ₹{FARE_PER_TRIP} to their total</Text>
                    <Text style={[styles.instructionText, { color: colors.onSecondaryContainer }]}>• A new QR is generated automatically each day</Text>
                </View>
            </Animated.View>
        </ScrollView>
        </SwipeableScreen>
    );
}

const styles = StyleSheet.create({
    container: { 
        flexGrow: 1, 
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
        padding: 24,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 8,
    },
    subtitle: { 
        fontSize: 14, 
        marginBottom: 24, 
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    input: { 
        borderWidth: 1, 
        padding: 16, 
        marginBottom: 12, 
        width: '100%',
        fontSize: 16,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        marginTop: 12,
        width: '100%',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    carHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    carIconBox: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    carInfo: {
        marginLeft: 12,
    },
    carName: {
        fontSize: 18,
        fontWeight: '600',
    },
    licensePlate: {
        fontSize: 14,
        marginTop: 2,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 6,
    },
    statLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    qrCard: {
        padding: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dateText: {
        marginLeft: 8,
        fontSize: 14,
    },
    qrContainer: { 
        padding: 16, 
        backgroundColor: 'white', 
        borderWidth: 2,
    },
    fareInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    fareLabel: {
        fontSize: 14,
    },
    fareAmount: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    instructions: {
        marginTop: 16,
        padding: 16,
    },
    instructionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 13,
        marginBottom: 4,
        lineHeight: 20,
    },
});
