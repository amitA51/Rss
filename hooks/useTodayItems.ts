import { useMemo, useContext } from 'react';
import { AppContext } from '../state/AppContext';
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

export const useTodayItems = () => {
    const { state } = useContext(AppContext);
    const { personalItems } = state;

    const { todaysHabits, openTasks, todayItemsCount } = useMemo(() => {
        const habits = personalItems.filter(isHabitForToday);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to the beginning of today for comparison

        const tasks = personalItems.filter(item => {
            if (item.type !== 'task' || item.isCompleted) {
                return false;
            }
            if (!item.dueDate) {
                return true; // Always show tasks without a due date
            }
            
            // Parse 'YYYY-MM-DD' string into a Date object in a way that avoids timezone issues.
            const parts = item.dueDate.split('-').map(Number);
            // new Date(year, monthIndex, day)
            const dueDate = new Date(parts[0], parts[1] - 1, parts[2]);
            
            return dueDate <= today; // Show if due date is today or in the past (overdue).
        });

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