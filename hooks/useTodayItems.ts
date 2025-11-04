import { useMemo, useContext } from 'react';
import { AppContext } from '../state/AppContext';
import type { PersonalItem } from '../types';

const isHabitForToday = (item: PersonalItem): boolean => {
    if (item.type !== 'habit') return false;
    if (!item.lastCompleted) return true; // Always show if never completed
    const lastDate = new Date(item.lastCompleted);
    const today = new Date();
    // Return true if it was not completed today
    return !(lastDate.getFullYear() === today.getFullYear() &&
             lastDate.getMonth() === today.getMonth() &&
             lastDate.getDate() === today.getDate());
};

export const useTodayItems = () => {
    const { state } = useContext(AppContext);
    const { personalItems } = state;

    const { todaysHabits, openTasks, todayItemsCount } = useMemo(() => {
        const habits = personalItems.filter(isHabitForToday);
        const tasks = personalItems.filter(item => item.type === 'task' && !item.isCompleted);
        const count = habits.length + tasks.length;
        
        // Sort tasks by creation date to allow for manual reordering
        const sortedTasks = tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { 
            todaysHabits: habits.sort((a, b) => (a.streak || 0) - (b.streak || 0)), 
            openTasks: sortedTasks, 
            todayItemsCount: count 
        };
    }, [personalItems]);

    return { todaysHabits, openTasks, todayItemsCount };
};
