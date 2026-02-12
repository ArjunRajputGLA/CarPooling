import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Animated } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { LucideCamera, LucideImage, LucideScanLine, LucideRefreshCw, LucideCameraOff } from 'lucide-react-native';
import { getTodayRange, getTodayString, verifyQRHash, formatTime } from '../utils/dateHelpers';
import SwipeableScreen from '../components/common/SwipeableScreen';
import { M3TripSuccessDialog, M3AlreadyLoggedDialog, M3RecentlyScanDialog, M3ErrorDialog } from '../components/common';

const FARE_PER_TRIP = 31; // Fixed fare per scan from fare_settings

export default function ScanScreen({ navigation }) {
    const { user } = useAuth();
    const { colors, spacing, borderRadius } = useTheme();
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [imageToScan, setImageToScan] = useState(null);
    const webViewRef = useRef(null);
    
    // Dialog states
    const [tripSuccessDialog, setTripSuccessDialog] = useState({ 
        visible: false, 
        tripType: '', 
        scanNumber: 1, 
        fareAmount: FARE_PER_TRIP, 
        todayTotal: FARE_PER_TRIP 
    });
    const [alreadyLoggedDialog, setAlreadyLoggedDialog] = useState(false);
    const [recentlyScanDialog, setRecentlyScanDialog] = useState({ visible: false, lastScanTime: '' });
    const [errorDialog, setErrorDialog] = useState({ visible: false, message: '' });
    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    useEffect(() => {
        // Pulse animation for scan frame
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

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
                setErrorDialog({ visible: true, title: 'Permission Required', message: 'Please allow access to your photo library to scan QR codes from images.' });
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
                    setErrorDialog({ visible: true, title: 'Error', message: 'Failed to process image' });
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('Gallery error:', error);
            setErrorDialog({ visible: true, title: 'Error', message: 'Failed to open gallery' });
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
            setErrorDialog({ visible: true, title: 'QR Code Not Found', message: 'Could not detect a QR code in the selected image. Please make sure the QR code is clearly visible and centered.' });
        } else if (message.startsWith('ERROR:')) {
            setLoading(false);
            setErrorDialog({ visible: true, title: 'Scan Failed', message: 'Failed to scan QR code. Please try with a clearer image or use the camera.' });
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
                setErrorDialog({ visible: true, title: 'Expired QR Code', message: 'This QR code was generated for a different date and is no longer valid. Please ask the driver for today\'s QR code.' });
                setLoading(false);
                return;
            }

            // Verify QR hash if present (security check)
            if (hash && !verifyQRHash(carId, driverId, date, hash)) {
                setErrorDialog({ visible: true, title: 'Invalid QR Code', message: 'This QR code could not be verified. It may have been tampered with.' });
                setLoading(false);
                return;
            }

            // Prevent scanning own QR code
            if (driverId === user.id) {
                setErrorDialog({ visible: true, title: 'Cannot Scan Own Code', message: 'You cannot scan your own QR code.' });
                setLoading(false);
                return;
            }

            await logTrip({ carId, driverId, date });

        } catch (error) {
            setErrorDialog({ visible: true, title: 'Scan Error', message: error.message || 'Invalid QR Code scanned' });
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
                setRecentlyScanDialog({ visible: true, lastScanTime });
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
                setErrorDialog({
                    visible: true,
                    title: 'Daily Limit Reached',
                    message: 'You have already logged 2 trips today (going & coming). Maximum 2 scans per day per car.'
                });
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
                    setAlreadyLoggedDialog(true);
                } else {
                    throw insertError;
                }
                setLoading(false);
                return;
            }

            const tripLabel = tripCount === 0 ? 'Going' : 'Return';
            setTripSuccessDialog({
                visible: true,
                tripType: tripLabel,
                scanNumber: tripCount + 1,
                fareAmount: FARE_PER_TRIP,
                todayTotal: newTotal
            });
        } catch (error) {
            console.error('Log trip error:', error);
            let msg = 'Failed to log trip';
            if (error.message?.includes('network') || error.message?.includes('fetch')) {
                msg = 'Network error. Please check your internet connection and try again.';
            } else if (error.message) {
                msg = error.message;
            }
            setErrorDialog({ visible: true, title: 'Error', message: msg });
        } finally {
            setLoading(false);
        }
    };

    if (hasPermission === null) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.surface }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.permissionText, { color: colors.onSurfaceVariant }]}>Requesting camera permission...</Text>
            </View>
        );
    }
    
    if (hasPermission === false) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.surface }]}>
                <View style={[styles.noAccessIconContainer, { backgroundColor: colors.errorContainer }]}>
                    <LucideCameraOff size={48} color={colors.error} />
                </View>
                <Text style={[styles.noAccessTitle, { color: colors.onSurface }]}>Camera Access Required</Text>
                <Text style={[styles.noAccessText, { color: colors.onSurfaceVariant }]}>
                    Please enable camera access in your device settings to scan QR codes
                </Text>
                <Pressable 
                    style={({ pressed }) => [
                        styles.galleryOnlyButton, 
                        { 
                            backgroundColor: colors.primary,
                            borderRadius: borderRadius.large,
                            opacity: pressed ? 0.8 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                        }
                    ]} 
                    onPress={pickImageFromGallery}
                >
                    <LucideImage size={20} color={colors.onPrimary} />
                    <Text style={[styles.galleryOnlyText, { color: colors.onPrimary }]}>Choose from Gallery</Text>
                </Pressable>
                
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
                        <View style={[styles.loadingCard, { backgroundColor: colors.surfaceContainerHigh, borderRadius: borderRadius.extraLarge }]}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.loadingText, { color: colors.onSurface }]}>Scanning QR code...</Text>
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
                    <View style={[styles.loadingCard, { backgroundColor: colors.surfaceContainerHigh, borderRadius: borderRadius.extraLarge }]}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.onSurface }]}>Processing...</Text>
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
                            <Animated.View style={[styles.scanFrame, { transform: [{ scale: pulseAnim }] }]}>
                                <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
                                <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
                                <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
                                <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
                                <LucideScanLine size={200} color="rgba(255,255,255,0.3)" style={styles.scanIcon} />
                            </Animated.View>
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
                            <Pressable 
                                style={({ pressed }) => [
                                    styles.scanAgainButton, 
                                    { 
                                        backgroundColor: colors.primary,
                                        borderRadius: borderRadius.full,
                                        opacity: pressed ? 0.8 : 1,
                                        transform: [{ scale: pressed ? 0.95 : 1 }],
                                    }
                                ]} 
                                onPress={() => setScanned(false)}
                            >
                                <LucideRefreshCw size={22} color={colors.onPrimary} />
                                <Text style={[styles.scanAgainText, { color: colors.onPrimary }]}>Scan Again</Text>
                            </Pressable>
                        ) : (
                            <Pressable 
                                style={({ pressed }) => [
                                    styles.galleryButton, 
                                    { 
                                        borderRadius: borderRadius.full,
                                        opacity: pressed ? 0.8 : 1,
                                        transform: [{ scale: pressed ? 0.95 : 1 }],
                                    }
                                ]} 
                                onPress={pickImageFromGallery}
                            >
                                <LucideImage size={22} color="#FFFFFF" />
                                <Text style={styles.galleryText}>Gallery</Text>
                            </Pressable>
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

            {/* Enhanced Dialogs */}
            <M3TripSuccessDialog
                visible={tripSuccessDialog.visible}
                tripType={tripSuccessDialog.tripType}
                scanNumber={tripSuccessDialog.scanNumber}
                fareAmount={tripSuccessDialog.fareAmount}
                todayTotal={tripSuccessDialog.todayTotal}
                onDismiss={() => {
                    setTripSuccessDialog(prev => ({ ...prev, visible: false }));
                    setScanned(false);
                }}
            />

            <M3AlreadyLoggedDialog
                visible={alreadyLoggedDialog}
                onDismiss={() => {
                    setAlreadyLoggedDialog(false);
                    setScanned(false);
                }}
            />

            <M3RecentlyScanDialog
                visible={recentlyScanDialog.visible}
                lastScanTime={recentlyScanDialog.lastScanTime}
                onDismiss={() => {
                    setRecentlyScanDialog({ visible: false, lastScanTime: '' });
                    setScanned(false);
                }}
            />

            <M3ErrorDialog
                visible={errorDialog.visible}
                title={errorDialog.title || 'Error'}
                message={errorDialog.message}
                onDismiss={() => {
                    setErrorDialog({ visible: false, message: '' });
                    setScanned(false);
                }}
            />
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
        padding: 24,
    },
    permissionText: {
        marginTop: 12,
        fontSize: 16,
    },
    noAccessIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    noAccessTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    noAccessText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    galleryOnlyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    galleryOnlyText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
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
        padding: 24,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
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
        paddingTop: 24,
    },
    instructionText: {
        color: '#FFFFFF',
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
        paddingHorizontal: 24,
        paddingVertical: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    scanAgainText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    galleryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    galleryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});
