import { useEffect, useContext, useRef } from 'react';
import { AppContext } from '../state/AppContext';
import { isHabitForToday } from './useTodayItems';

export const useHabitReminders = () => {
    const { state } = useContext(AppContext);
    const { personalItems, settings } = state;
    const scheduledTimeouts = useRef<number[]>([]);

    useEffect(() => {
        // Clear any previously scheduled timeouts
        scheduledTimeouts.current.forEach(clearTimeout);
        scheduledTimeouts.current = [];

        if (Notification.permission !== 'granted' || !settings.enableHabitReminders) {
            return;
        }

        const habitsWithReminders = personalItems.filter(
            item =>
                item.type === 'habit' &&
                item.reminderEnabled &&
                item.reminderTime &&
                isHabitForToday(item)
        );

        if (habitsWithReminders.length === 0) {
            return;
        }
        
        const now = new Date();

        habitsWithReminders.forEach(habit => {
            const [hours, minutes] = habit.reminderTime!.split(':').map(Number);
            const reminderDate = new Date();
            reminderDate.setHours(hours, minutes, 0, 0);

            const delay = reminderDate.getTime() - now.getTime();

            if (delay > 0) {
                const timeoutId = window.setTimeout(() => {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(`תזכורת: ${habit.title}`, {
                            body: 'אל תשכח להשלים את ההרגל שלך להיום!',
                            icon: '/images/spark192.png',
                            badge: '/images/spark192.png',
                            tag: `habit-reminder-${habit.id}`
                        });
                    });
                }, delay);
                scheduledTimeouts.current.push(timeoutId);
            }
        });

        // Cleanup function
        return () => {
            scheduledTimeouts.current.forEach(clearTimeout);
        };
    }, [personalItems, settings.enableHabitReminders]);
};
