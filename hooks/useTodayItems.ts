import type { PersonalItem } from '../types';

export const isHabitForToday = (item: PersonalItem): boolean => {
    if (item.type !== 'habit') return false;
    if (!item.lastCompleted) return true; // Always show if never completed
    const lastDate = new Date(item.lastCompleted);
    const today = new Date();
    // Return true if it was not completed today
    return !(lastDate.getFullYear() === today.getFullYear() &&
             lastDate.getMonth() === today.getMonth() &&
             lastDate.getDate() === today.getDate());
};
