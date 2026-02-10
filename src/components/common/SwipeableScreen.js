import React, { useRef, useCallback } from 'react';
import { Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;
const SWIPE_VELOCITY_THRESHOLD = 0.4;

/**
 * Wraps screen content and enables animated left/right swipe to navigate between tabs.
 * Content follows your finger, then navigates instantly on release — no blank frames.
 */
export default function SwipeableScreen({ children, style }) {
    const navigation = useNavigation();
    const translateX = useRef(new Animated.Value(0)).current;
    const isSwiping = useRef(false);

    const getNavState = useCallback(() => {
        const state = navigation.getState();
        if (!state) return null;
        return {
            currentIndex: state.index,
            routes: state.routes,
            canGoLeft: state.index > 0,
            canGoRight: state.index < state.routes.length - 1,
        };
    }, [navigation]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                if (isSwiping.current) return false;
                const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
                const hasMovedEnough = Math.abs(gestureState.dx) > 15;
                return isHorizontal && hasMovedEnough;
            },
            onMoveShouldSetPanResponderCapture: () => false,
            onPanResponderGrant: () => {
                translateX.setValue(0);
                isSwiping.current = true;
            },
            onPanResponderMove: (evt, gestureState) => {
                const navState = getNavState();
                if (!navState) return;

                let dx = gestureState.dx;

                // Rubber-band resistance at edges (can't swipe past first/last tab)
                if ((dx > 0 && !navState.canGoLeft) || (dx < 0 && !navState.canGoRight)) {
                    dx = dx * 0.12;
                }

                translateX.setValue(dx);
            },
            onPanResponderRelease: (evt, gestureState) => {
                const navState = getNavState();
                if (!navState) {
                    snapBack();
                    return;
                }

                const swipedLeft = gestureState.dx < -SWIPE_THRESHOLD ||
                    (gestureState.dx < -20 && gestureState.vx < -SWIPE_VELOCITY_THRESHOLD);
                const swipedRight = gestureState.dx > SWIPE_THRESHOLD ||
                    (gestureState.dx > 20 && gestureState.vx > SWIPE_VELOCITY_THRESHOLD);

                if (swipedLeft && navState.canGoRight) {
                    // Navigate immediately, then snap view back to center
                    navigation.navigate(navState.routes[navState.currentIndex + 1].name);
                    translateX.setValue(0);
                    isSwiping.current = false;
                } else if (swipedRight && navState.canGoLeft) {
                    navigation.navigate(navState.routes[navState.currentIndex - 1].name);
                    translateX.setValue(0);
                    isSwiping.current = false;
                } else {
                    snapBack();
                }
            },
            onPanResponderTerminate: () => {
                snapBack();
            },
        })
    ).current;

    const snapBack = () => {
        Animated.spring(translateX, {
            toValue: 0,
            tension: 170,
            friction: 18,
            useNativeDriver: true,
        }).start(() => {
            isSwiping.current = false;
        });
    };

    // Subtle opacity fade as you drag
    const opacity = translateX.interpolate({
        inputRange: [-SCREEN_WIDTH * 0.5, 0, SCREEN_WIDTH * 0.5],
        outputRange: [0.7, 1, 0.7],
        extrapolate: 'clamp',
    });

    return (
        <Animated.View
            style={[
                styles.container,
                style,
                {
                    transform: [{ translateX }],
                    opacity,
                },
            ]}
            {...panResponder.panHandlers}
        >
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
