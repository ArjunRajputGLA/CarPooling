# CarPooling App - Phase 3: Core Features & Bug Fixes

## Overview

This document describes all changes made during Phase 3, which focused on fixing critical data bugs, implementing fare tracking, weekly summaries, payment management, QR security, real-time updates, session management, and offline support.

---

## Root Cause Fix

**Problem**: All dashboard screens used `.eq('date', today)` to query trips — but the `trips` table has NO `date` column. It only has `scan_timestamp` (timestamptz). This caused:
- ₹0 fare displays everywhere
- "Not Logged" passenger status
- Empty history screens
- Stats all showing 0

**Fix**: Replaced all date-column queries across every screen with timestamp range queries using `getTodayRange()`, `getWeekRange()`, and `getMonthRange()` from the new `dateHelpers.js` utility.

---

## Files Created

### `src/utils/dateHelpers.js`
Centralized date utility functions:
- `getTodayRange()` — returns `{ start, end }` ISO strings for today (midnight to midnight)
- `getWeekRange()` — Monday to Sunday range
- `getMonthRange(year, month)` — full month range
- `getTodayString()` — YYYY-MM-DD format
- `formatDate()`, `formatDateLong()`, `formatTime()`, `formatDateTime()` — display formatting
- `getDayName()`, `getWeekdays()` — weekday helpers for Mon-Fri tracking
- `isToday()`, `isSameDay()`, `getDateFromTimestamp()` — comparison helpers
- `isFriday()` — settlement day check
- `generateQRHash()`, `verifyQRHash()` — QR code integrity verification

### `src/utils/networkHelper.js`
Network and offline handling utilities:
- `checkNetworkStatus()` — connectivity check
- `cacheData()`, `getCachedData()`, `clearCache()` — AsyncStorage-based caching with expiry
- `queueOfflineOperation()`, `getOfflineQueue()`, `clearOfflineQueue()` — offline operation queue
- `useNetworkData()` — React hook for network-aware data fetching with automatic cache fallback
- `useNetworkStatus()` — hook that returns current online/offline status

### `src/components/common/OfflineBanner.js`
Visual banner component for offline/stale data indication on any screen.

### `migrations/003_add_fare_settings.sql`
Database migration for:
- `fare_settings` table (configurable per-car or global fare)
- `weekly_payment_summary` view for reporting
- Performance indexes on `trips.scan_timestamp`, `passenger_id`, `car_id`, `payment_status`
- Default fare setting (₹31)

---

## Files Modified

### `src/screens/ScanScreen.js`
- **QR Security**: Validates hash from QR data using `verifyQRHash()` — rejects forged/modified QR codes
- **Date Validation**: QR codes expire daily — scans only accepted for today's date
- **Self-Scan Prevention**: Drivers cannot scan their own QR code
- **Duplicate Prevention**: 5-minute cooldown between scans of the same car
- **Max Trips/Day**: Limit of 2 trips per passenger per car per day (going + return)
- **Better Error Messages**: Specific user-friendly alerts for each failure case
- **Going/Return Labels**: First trip = "Going", second = "Return"

### `src/screens/QRCodeScreen.js`
- **Security Hash**: QR data now includes `hash: generateQRHash(carId, driverId, today)`
- **Fixed Stats Query**: Uses `getTodayRange()` instead of broken `.eq('date', today)`
- **Payment Breakdown**: Shows today's paid vs pending trips count
- **Date Display**: Uses `formatDateLong()` for consistent formatting

### `src/screens/DriverDashboard.js` (Complete Rewrite)
- **Fixed Queries**: All queries use `scan_timestamp` range via `getTodayRange()`/`getWeekRange()`
- **Weekly Summary**: Total trips, collected, and pending amounts for current week
- **Passenger Summary**: Per-passenger aggregation showing trips/pending/paid/active days
- **Mark as Paid**: Confirmation dialog before marking; sets `payment_date` timestamp
- **Mark All Paid**: Bulk-pay all pending trips for a specific passenger
- **Real-time Updates**: Supabase subscription on `trips` table filtered by `car_id`
- **Revenue Split**: Dashboard shows "Paid Today" and "Pending" separately
- **Passenger Detail Modal**: Tap any passenger to see detailed stats + "Mark All Paid" button

### `src/screens/PassengerDashboard.js` (Complete Rewrite)
- **Fixed Queries**: Uses `getTodayRange()` for correct timestamp filtering
- **Multiple Trips**: Shows all today's trips (was limited to single with `.single()`)
- **Trip Labels**: Going/Return labels with individual fare display
- **Weekly Day Indicators**: Mon-Fri circles with checkmarks for days with trips
- **Week Summary**: Total trips, pending amount, paid amount
- **Friday Settlement Banner**: Reminder shown on Fridays when pending > 0
- **Real-time Updates**: Subscription for payment status changes on `passenger_id`

### `src/screens/HistoryScreen.js` (Complete Rewrite)
- **Fixed Queries**: Uses `getMonthRange()` for `scan_timestamp` range queries
- **Search**: Filter by passenger name, car name, or license plate
- **Status Filters**: All / Pending / Paid filter chips
- **Summary Cards**: Total, Paid, Pending amounts for selected month
- **Trip Detail Modal**: Full trip info including payment dates
- **Mark as Paid**: Driver can mark trips paid directly from detail modal with confirmation
- **Results Count**: Shows filtered count

### `src/context/AuthContext.js`
- **Sign Out Confirmation**: `signOut(showConfirm)` — shows "Are you sure?" dialog (default: true)
- **Session Timeout**: 30-minute inactivity timeout with automatic logout
  - Tracks last activity via `AsyncStorage` key `@carpooling_last_activity`
  - `AppState` listener checks timeout when app returns to foreground
  - Periodic check every 60 seconds while app is active
  - Alert shown before auto-logout
- **`updateLastActivity()`**: Exposed in context — screens can call on user interaction
- **Login Activity Stamp**: Sets initial activity timestamp on successful `signIn()`

### `src/screens/profile/ProfileScreen.js`
- **Logout Fix**: Passes `signOut(false)` to avoid double confirmation dialogs
- **Delete Account**: Now actually deletes user data from database:
  - Drivers: Deletes associated trips → cars → user profile
  - Passengers: Deletes trip records → user profile
  - Shows toast → signs out after delay
  - Two-step confirmation with destructive styling

### `src/components/common/index.js`
- Added `OfflineBanner` export

---

## Constants

| Constant | Value | Location |
|----------|-------|----------|
| `FARE_PER_TRIP` | ₹31 | DriverDashboard, PassengerDashboard, ScanScreen, QRCodeScreen |
| `SESSION_TIMEOUT_MS` | 30 minutes | AuthContext.js |
| `ACTIVITY_CHECK_INTERVAL` | 60 seconds | AuthContext.js |
| `CACHE_EXPIRY_MS` | 10 minutes | networkHelper.js |
| `QR hash secret` | `carpooling_secure_2024` | dateHelpers.js |

---

## Database Schema Requirements

The `trips` table must have these columns:
- `id` (uuid, PK)
- `car_id` (uuid, FK → cars.id)
- `passenger_id` (uuid, FK → users.id)
- `scan_timestamp` (timestamptz) — **this is the primary date field**
- `fare_amount` (decimal)
- `payment_status` (text: 'pending' | 'paid')
- `payment_date` (timestamptz, nullable)
- `trip_label` (text: 'Going' | 'Return', nullable)
- `created_at` (timestamptz)

---

## How It Works

### Trip Scanning Flow
1. Driver generates QR → includes `{ carId, driverId, carName, licensePlate, date, hash }`
2. Passenger scans QR (camera or gallery image)
3. App validates: hash integrity → date match → not self-scan → not duplicate (5 min) → not over limit (2/day)
4. Trip created with `fare_amount: 31`, `payment_status: 'pending'`, `trip_label: 'Going'|'Return'`
5. Real-time subscription updates both driver and passenger dashboards instantly

### Payment Flow
1. Driver views passenger summary on dashboard
2. Taps passenger → sees pending trips
3. "Mark as Paid" (individual) or "Mark All Paid" (bulk) with confirmation
4. Updates `payment_status: 'paid'`, `payment_date: now()`
5. Real-time update reflects on passenger dashboard

### Session Management
1. On login → stores `lastActivity` timestamp
2. Every 60s → checks if `now - lastActivity > 30min` → auto-logout
3. On app resume from background → checks timeout → auto-logout if expired
4. Screens can call `updateLastActivity()` on significant user interactions
