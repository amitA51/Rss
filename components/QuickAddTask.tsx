import React, { useState, useContext } from 'react';
import { AppContext } from '../state/AppContext';
import { addPersonalItem } from '../services/dataService';
import { AddIcon, SparklesIcon, CheckCircleIcon, FlameIcon, CalendarIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface QuickAddProps {
    onItemAdded: (message: string) => void;
}

const QuickAddAction: React.FC<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    isLoading: boolean;
    disabled: boolean;
}> = ({ label, icon, onClick, isLoading, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:hover:bg-transparent"
    >
        {isLoading ? <LoadingSpinner className="w-5 h-5" /> : icon}
        <span className="text-xs font-medium">{label}</span>
    </button>
);

const QuickAddTask: React.FC<QuickAddProps> = ({ onItemAdded }) => {
    const { dispatch } = useContext(AppContext);
    const [title, setTitle] = useState('');
    const [loadingState, setLoadingState] = useState<'task_today' | 'task_tomorrow' | 'habit' | null>(null);

    const handleAdd = async (type: 'task_today' | 'task_tomorrow' | 'habit') => {
        if (!title.trim() || loadingState) return;

        setLoadingState(type);
        try {
            if (type === 'task_today') {
                const today = new Date().toISOString().split('T')[0];
                const newItem = await addPersonalItem({
                    type: 'task',
                    title: title.trim(),
                    dueDate: today,
                    content: '', isCompleted: false, priority: 'medium',
                });
                dispatch({ type: 'ADD_PERSONAL_ITEM', payload: newItem });
                onItemAdded('משימה נוספה להיום');
            } else if (type === 'task_tomorrow') {
                 const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowDateString = tomorrow.toISOString().split('T')[0];
                const newItem = await addPersonalItem({
                    type: 'task',
                    title: title.trim(),
                    dueDate: tomorrowDateString,
                    content: '', isCompleted: false, priority: 'medium',
                });
                dispatch({ type: 'ADD_PERSONAL_ITEM', payload: newItem });
                onItemAdded('משימה נוספה למחר');
            } else if (type === 'habit') {
                const newItem = await addPersonalItem({
                    type: 'habit',
                    title: title.trim(),
                    content: '',
                    frequency: 'daily',
                });
                dispatch({ type: 'ADD_PERSONAL_ITEM', payload: newItem });
                onItemAdded('הרגל חדש נוסף');
            }
            setTitle('');
        } catch (error) {
            console.error(`Failed to add ${type}:`, error);
            onItemAdded(`שגיאה בהוספת ${type}`);
        } finally {
            setLoadingState(null);
        }
    };

    return (
        <div className="themed-card p-3">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleAdd('task_today')}}
                placeholder="מה תרצה להוסיף?"
                className="w-full bg-transparent text-white py-2 px-2 text-lg focus:outline-none placeholder:text-[var(--text-secondary)]"
            />
            <div className="flex items-center justify-around gap-2 border-t border-[var(--border-primary)] mt-2 pt-2">
                <QuickAddAction 
                    label="משימה להיום"
                    icon={<CheckCircleIcon className="w-5 h-5"/>}
                    onClick={() => handleAdd('task_today')}
                    isLoading={loadingState === 'task_today'}
                    disabled={!title.trim()}
                />
                <QuickAddAction 
                    label="משימה למחר"
                    icon={<CalendarIcon className="w-5 h-5"/>}
                    onClick={() => handleAdd('task_tomorrow')}
                    isLoading={loadingState === 'task_tomorrow'}
                    disabled={!title.trim()}
                />
                <QuickAddAction 
                    label="הרגל חדש"
                    icon={<FlameIcon className="w-5 h-5"/>}
                    onClick={() => handleAdd('habit')}
                    isLoading={loadingState === 'habit'}
                    disabled={!title.trim()}
                />
            </div>
        </div>
    );
};

export default QuickAddTask;
