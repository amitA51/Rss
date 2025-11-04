// services/notificationsService.ts

/**
 * Checks if Notifications are supported by the browser.
 * @returns {boolean} True if supported, false otherwise.
 */
export const isSupported = (): boolean => {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Requests permission from the user to show notifications.
 * @returns {Promise<NotificationPermission>} The permission result ('granted', 'denied', or 'default').
 */
export const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported()) {
        console.warn('Notifications not supported in this browser.');
        return 'denied';
    }
    const permission = await window.Notification.requestPermission();
    return permission;
};

/**
 * Shows a test notification to the user if permission has been granted.
 */
export const showTestNotification = (): void => {
    if (!isSupported()) {
        alert('הדפדפן אינו תומך בהתראות.');
        return;
    }
    if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('Spark - התראה לדוגמה', {
                body: 'ההתראות פועלות!',
                icon: '/images/resized-image.png',
                badge: '/images/resized-image.png',
                // FIX: Removed the 'vibrate' property as it is not a recognized property in the NotificationOptions type definition, causing a compile error.
                tag: 'spark-test-notification'
            });
        });
    } else if (Notification.permission === 'denied') {
        alert('התראות נחסמו. יש לאפשר אותן בהגדרות הדפדפן.');
    } else {
        requestPermission().then(permission => {
            if (permission === 'granted') {
                showTestNotification();
            }
        });
    }
};

/**
 * Updates the app icon badge with a given count. Clears it if count is 0.
 * @param {number} count The number to display on the badge.
 */
export const updateAppBadge = (count: number): void => {
    if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
        if (count > 0) {
            (navigator as any).setAppBadge(count).catch((error: Error) => {
                console.error('Failed to set app badge:', error);
            });
        } else {
            (navigator as any).clearAppBadge().catch((error: Error) => {
                console.error('Failed to clear app badge:', error);
            });
        }
    } else {
        console.log('App Badging API is not supported in this browser.');
    }
}

/**
 * Registers for periodic background sync to check for new feed items.
 */
export const registerPeriodicSync = async (): Promise<void> => {
    const registration = (window as any).swRegistration;
    if (!registration || !('periodicSync' in registration)) {
        console.warn('Periodic Background Sync is not supported.');
        return;
    }

    try {
        await (registration as any).periodicSync.register('feed-sync', {
            minInterval: 12 * 60 * 60 * 1000, // 12 hours
        });
        console.log('Periodic sync registered successfully.');
    } catch (error) {
        console.error('Periodic sync registration failed:', error);
    }
};

/**
 * Unregisters from periodic background sync.
 */
export const unregisterPeriodicSync = async (): Promise<void> => {
     const registration = (window as any).swRegistration;
    if (!registration || !('periodicSync' in registration)) {
        return;
    }
    try {
        await (registration as any).periodicSync.unregister('feed-sync');
        console.log('Periodic sync unregistered.');
    } catch (error) {
        console.error('Periodic sync unregistration failed:', error);
    }
};