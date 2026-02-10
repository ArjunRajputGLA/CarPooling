import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LucideCamera, LucideImage, LucideScanLine, LucideRefreshCw } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { getTodayRange, getTodayString, verifyQRHash, formatTime } from '../utils/dateHelpers';
import SwipeableScreen from '../components/common/SwipeableScreen';

const FARE_PER_TRIP = 31; // Fixed fare per scan from fare_settings

export default function ScanScreen({ navigation }) {
    const { user } = useAuth();
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [imageToScan, setImageToScan] = useState(null);
    const webViewRef = useRef(null);

    useEffect(() => {
        const getPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };
        getPermissions();
    }, []);

    const handleBarCodeScanned = async ({ type, data }) => {
        setScanned(true);
        await processQRData(data);
    };

    const pickImageFromGallery = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to your photo library to scan QR codes from images.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                setLoading(true);
                const imageUri = result.assets[0].uri;
                
                try {
                    // Resize and get base64
                    const manipResult = await ImageManipulator.manipulateAsync(
                        imageUri,
                        [{ resize: { width: 400, height: 400 } }],
                        { base64: true, format: ImageManipulator.SaveFormat.PNG }
                    );
                    
                    // Set image to trigger WebView QR scanning
                    setImageToScan(manipResult.base64);
                } catch (error) {
                    console.error('Image manipulation error:', error);
                    Alert.alert('Error', 'Failed to process image');
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Gallery error:', error);
            Alert.alert('Error', 'Failed to open gallery');
            setLoading(false);
        }
    };

    const handleWebViewMessage = async (event) => {
        const message = event.nativeEvent.data;
        setImageToScan(null);
        
        if (message.startsWith('QR_DATA:')) {
            const qrData = message.replace('QR_DATA:', '');
            setScanned(true);
            await processQRData(qrData);
        } else if (message === 'QR_NOT_FOUND') {
            setLoading(false);
            Alert.alert(
                'QR Code Not Found',
                'Could not detect a QR code in the selected image. Please make sure the QR code is clearly visible and centered.',
                [{ text: 'OK' }]
            );
        } else if (message.startsWith('ERROR:')) {
            setLoading(false);
            Alert.alert(
                'Scan Failed',
                'Failed to scan QR code. Please try with a clearer image or use the camera.',
                [{ text: 'OK' }]
            );
        }
    };

    // HTML page that uses jsQR to decode QR from image
    const getQRScannerHTML = (base64Image) => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
        </head>
        <body style="margin:0;padding:0;background:#000;">
            <canvas id="canvas" style="display:none;"></canvas>
            <script>
                (function() {
                    try {
                        const img = new Image();
                        img.onload = function() {
                            const canvas = document.getElementById('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0);
                            
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: "attemptBoth",
                            });
                            
                            if (code) {
                                window.ReactNativeWebView.postMessage('QR_DATA:' + code.data);
                            } else {
                                window.ReactNativeWebView.postMessage('QR_NOT_FOUND');
                            }
                        };
                        img.onerror = function(e) {
                            window.ReactNativeWebView.postMessage('ERROR:Image load failed');
                        };
                        img.src = 'data:image/png;base64,${base64Image}';
                    } catch(e) {
                        window.ReactNativeWebView.postMessage('ERROR:' + e.message);
                    }
                })();
            </script>
        </body>
        </html>
    `;

    const processQRData = async (data) => {
        try {
            setLoading(true);
            // Parse QR Data
            let parsedData;
            try {
                parsedData = JSON.parse(data);
            } catch (e) {
                throw new Error('QR code is not a valid CarPooling code');
            }
            const { carId, driverId, date, hash } = parsedData;

            if (!carId || !driverId || !date) {
                throw new Error('Invalid QR Code format - missing required fields');
            }

            // Verify QR code date
            const today = getTodayString();
            if (date !== today) {
                Alert.alert(
                    'Expired QR Code',
                    'This QR code was generated for a different date and is no longer valid. Please ask the driver for today\'s QR code.',
                    [{ text: 'OK', onPress: () => setScanned(false) }]
                );
                setLoading(false);
                return;
            }

            // Verify QR hash if present (security check)
            if (hash && !verifyQRHash(carId, driverId, date, hash)) {
                Alert.alert(
                    'Invalid QR Code',
                    'This QR code could not be verified. It may have been tampered with.',
                    [{ text: 'OK', onPress: () => setScanned(false) }]
                );
                setLoading(false);
                return;
            }

            // Prevent scanning own QR code
            if (driverId === user.id) {
                Alert.alert(
                    'Cannot Scan Own Code',
                    'You cannot scan your own QR code.',
                    [{ text: 'OK', onPress: () => setScanned(false) }]
                );
                setLoading(false);
                return;
            }

            await logTrip({ carId, driverId, date });

        } catch (error) {
            Alert.alert(
                'Scan Error',
                error.message || 'Invalid QR Code scanned',
                [{ text: 'Scan Again', onPress: () => setScanned(false) }]
            );
            setLoading(false);
        }
    };

    const logTrip = async ({ carId, driverId, date }) => {
        try {
            const { start: todayStart, end: todayEnd } = getTodayRange();

            // Check for duplicate scan (same passenger, same car, within last 5 minutes)
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { data: recentTrips, error: recentError } = await supabase
                .from('trips')
                .select('id, scan_timestamp')
                .eq('passenger_id', user.id)
                .eq('car_id', carId)
                .gte('scan_timestamp', fiveMinAgo);

            if (!recentError && recentTrips && recentTrips.length > 0) {
                const lastScanTime = formatTime(recentTrips[0].scan_timestamp);
                Alert.alert(
                    'Duplicate Scan',
                    `You already scanned this QR code at ${lastScanTime}. Please wait at least 5 minutes between scans.`,
                    [{ text: 'OK', onPress: () => setScanned(false) }]
                );
                setLoading(false);
                return;
            }

            // Get existing trips for today to calculate cumulative fare
            const { data: existingTrips, error: checkError } = await supabase
                .from('trips')
                .select('id, fare_amount, scan_timestamp')
                .eq('passenger_id', user.id)
                .eq('car_id', carId)
                .gte('scan_timestamp', todayStart)
                .lt('scan_timestamp', todayEnd);

            if (checkError) throw checkError;

            const tripCount = existingTrips?.length || 0;

            // Limit to max 2 trips per day per car (going + coming)
            if (tripCount >= 2) {
                Alert.alert(
                    'Daily Limit Reached',
                    'You have already logged 2 trips today (going & coming). Maximum 2 scans per day per car.',
                    [{ text: 'OK', onPress: () => setScanned(false) }]
                );
                setLoading(false);
                return;
            }

            const previousTotal = existingTrips?.reduce((sum, trip) => sum + (trip.fare_amount || 0), 0) || 0;
            const newTotal = previousTotal + FARE_PER_TRIP;

            // Insert new trip
            const { error: insertError } = await supabase
                .from('trips')
                .insert({
                    passenger_id: user.id,
                    car_id: carId,
                    fare_amount: FARE_PER_TRIP,
                    payment_status: 'pending'
                });

            if (insertError) {
                if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
                    Alert.alert(
                        'Already Logged',
                        'This trip has already been recorded.',
                        [{ text: 'OK', onPress: () => setScanned(false) }]
                    );
                } else {
                    throw insertError;
                }
                setLoading(false);
                return;
            }

            const tripLabel = tripCount === 0 ? 'Going' : 'Return';
            Alert.alert(
                'Trip Logged! 🎉',
                `${tripLabel} trip recorded (Scan #${tripCount + 1})\n\nThis scan: ₹${FARE_PER_TRIP}\nToday's Total: ₹${newTotal}`,
                [{ text: 'OK', onPress: () => setScanned(false) }]
            );
        } catch (error) {
            console.error('Log trip error:', error);
            let msg = 'Failed to log trip';
            if (error.message?.includes('network') || error.message?.includes('fetch')) {
                msg = 'Network error. Please check your internet connection and try again.';
            } else if (error.message) {
                msg = error.message;
            }
            Alert.alert('Error', msg, [{ text: 'OK', onPress: () => setScanned(false) }]);
        } finally {
            setLoading(false);
        }
    };

    if (hasPermission === null) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.permissionText}>Requesting camera permission...</Text>
            </View>
        );
    }
    
    if (hasPermission === false) {
        return (
            <View style={styles.centered}>
                <LucideCamera size={64} color={COLORS.gray[400]} />
                <Text style={styles.noAccessTitle}>Camera Access Required</Text>
                <Text style={styles.noAccessText}>
                    Please enable camera access in your device settings to scan QR codes
                </Text>
                <TouchableOpacity style={styles.galleryOnlyButton} onPress={pickImageFromGallery}>
                    <LucideImage size={20} color={COLORS.white} />
                    <Text style={styles.galleryOnlyText}>Choose from Gallery</Text>
                </TouchableOpacity>
                
                {/* Hidden WebView for QR scanning */}
                {imageToScan && (
                    <WebView
                        ref={webViewRef}
                        style={{ width: 1, height: 1, opacity: 0 }}
                        originWhitelist={['*']}
                        source={{ html: getQRScannerHTML(imageToScan) }}
                        onMessage={handleWebViewMessage}
                        javaScriptEnabled={true}
                    />
                )}
                
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingCard}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingText}>Scanning QR code...</Text>
                        </View>
                    </View>
                )}
            </View>
        );
    }

    return (
        <SwipeableScreen>
        <View style={styles.container}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Processing...</Text>
                    </View>
                </View>
            ) : (
                <>
                    <CameraView
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    
                    {/* Scan Frame Overlay */}
                    <View style={styles.overlay}>
                        <View style={styles.overlayTop} />
                        <View style={styles.overlayMiddle}>
                            <View style={styles.overlaySide} />
                            <View style={styles.scanFrame}>
                                <View style={[styles.corner, styles.topLeft]} />
                                <View style={[styles.corner, styles.topRight]} />
                                <View style={[styles.corner, styles.bottomLeft]} />
                                <View style={[styles.corner, styles.bottomRight]} />
                                <LucideScanLine size={200} color="rgba(255,255,255,0.3)" style={styles.scanIcon} />
                            </View>
                            <View style={styles.overlaySide} />
                        </View>
                        <View style={styles.overlayBottom}>
                            <Text style={styles.instructionText}>
                                Position the QR code within the frame
                            </Text>
                        </View>
                    </View>

                    {/* Bottom Controls */}
                    <View style={styles.controls}>
                        {scanned ? (
                            <TouchableOpacity 
                                style={styles.scanAgainButton} 
                                onPress={() => setScanned(false)}
                                activeOpacity={0.8}
                            >
                                <LucideRefreshCw size={22} color={COLORS.white} />
                                <Text style={styles.scanAgainText}>Scan Again</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity 
                                style={styles.galleryButton} 
                                onPress={pickImageFromGallery}
                                activeOpacity={0.8}
                            >
                                <LucideImage size={22} color={COLORS.white} />
                                <Text style={styles.galleryText}>Gallery</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </>
            )}
            
            {/* Hidden WebView for QR scanning from gallery */}
            {imageToScan && (
                <WebView
                    ref={webViewRef}
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                    originWhitelist={['*']}
                    source={{ html: getQRScannerHTML(imageToScan) }}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled={true}
                />
            )}
        </View>
        </SwipeableScreen>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#000',
    },
    centered: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: COLORS.background.light,
        padding: SPACING.xl,
    },
    permissionText: {
        marginTop: SPACING.md,
        fontSize: 16,
        color: COLORS.text.secondary,
    },
    noAccessTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text.primary,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    noAccessText: {
        fontSize: 14,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    galleryOnlyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },
    galleryOnlyText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: SPACING.sm,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingCard: {
        backgroundColor: COLORS.white,
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
        alignItems: 'center',
        ...SHADOWS.lg,
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: 16,
        color: COLORS.text.primary,
        fontWeight: '500',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    overlayTop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayMiddle: {
        flexDirection: 'row',
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    scanFrame: {
        width: 280,
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: COLORS.primary,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: 12,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: 12,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: 12,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: 12,
    },
    scanIcon: {
        opacity: 0.5,
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        paddingTop: SPACING.xl,
    },
    instructionText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    controls: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    scanAgainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        ...SHADOWS.md,
    },
    scanAgainText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: SPACING.sm,
    },
    galleryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    galleryText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: SPACING.sm,
    },
});
