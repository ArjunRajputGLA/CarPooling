// Date helper utilities for CarPooling application

/**
 * Get today's date range as ISO strings for Supabase queries
 */
export const getTodayRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
};

/**
 * Get the current week's date range (Monday to Sunday)
 */
export const getWeekRange = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 7);
    return {
        start: monday.toISOString(),
        end: sunday.toISOString(),
        monday,
        sunday: new Date(sunday.getTime() - 1), // For display
    };
};

/**
 * Get the date range for a specific month
 */
export const getMonthRange = (year, month) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
};

/**
 * Get today's date string YYYY-MM-DD
 */
export const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
};

/**
 * Format date for display: DD MMM YYYY
 */
export const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

/**
 * Format date for display: Weekday, DD MMM YYYY
 */
export const formatDateLong = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

/**
 * Format time: HH:MM AM/PM
 */
export const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

/**
 * Format date + time: DD MMM YYYY, HH:MM AM/PM
 */
export const formatDateTime = (dateStr) => {
    return `${formatDate(dateStr)}, ${formatTime(dateStr)}`;
};

/**
 * Get day name from date
 */
export const getDayName = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

/**
 * Get the weekday names (Mon-Fri) for the current week
 */
export const getWeekdays = (date = new Date()) => {
    const { monday } = getWeekRange(date);
    const days = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        days.push({
            date: d.toISOString().split('T')[0],
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNum: d.getDate(),
            isToday: d.toDateString() === new Date().toDateString(),
        });
    }
    return days;
};

/**
 * Check if a timestamp falls on today
 */
export const isToday = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (d1, d2) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.toDateString() === date2.toDateString();
};

/**
 * Get the date string from a timestamp
 */
export const getDateFromTimestamp = (timestamp) => {
    return new Date(timestamp).toISOString().split('T')[0];
};

/**
 * Check if it's Friday (settlement day)
 */
export const isFriday = () => {
    return new Date().getDay() === 5;
};

/**
 * Simple hash for QR verification (no crypto dependency needed)
 * Uses a basic but sufficient approach for QR code integrity
 */
export const generateQRHash = (carId, driverId, date) => {
    const secret = 'carpooling_secure_2024';
    const str = `${carId}:${driverId}:${date}:${secret}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
};

/**
 * Verify QR hash
 */
export const verifyQRHash = (carId, driverId, date, hash) => {
    return generateQRHash(carId, driverId, date) === hash;
};
