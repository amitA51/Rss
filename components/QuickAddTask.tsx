import React, { useState, useContext } from 'react';
import { AppContext } from '../state/AppContext';
import { addPersonalItem } from '../services/dataService';
import { parseNaturalLanguageTask } from '../services/geminiService';
import { AddIcon, SparklesIcon } from './icons';

interface QuickAddTaskProps {
    onTaskAdded: () => void;
}

const QuickAddTask: React.FC<QuickAddTaskProps> = ({ onTaskAdded }) => {
    const { dispatch } = useContext(AppContext);
    const [title, setTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const parsedData = await parseNaturalLanguageTask(title.trim());

            // FIX: Await the async data service call to get the created item.
            const newItem = await addPersonalItem({
                type: 'task',
                title: parsedData.title,
                dueDate: parsedData.dueDate || undefined,
                content: '',
                isCompleted: false,
                priority: 'medium',
            });
            dispatch({ type: 'ADD_PERSONAL_ITEM', payload: newItem });
            setTitle('');
            onTaskAdded();
        } catch (error) {
            console.error("Failed to add smart task, falling back.", error);
            // Fallback to simple add
            // FIX: Await the async data service call to get the created item.
            const newItem = await addPersonalItem({
                type: 'task',
                title: title.trim(),
                content: '',
                isCompleted: false,
                priority: 'medium',
            });
            dispatch({ type: 'ADD_PERSONAL_ITEM', payload: newItem });
            setTitle('');
            onTaskAdded();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[var(--bg-card)] p-2 rounded-xl border border-[var(--border-primary)] shadow-lg">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="הוסף משימה (נסה: 'לשלם חשבונות מחר')..."
                className="flex-1 bg-transparent text-white py-2 px-3 focus:outline-none"
            />
            <button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="bg-[var(--accent-gradient)] text-white rounded-full p-2.5 disabled:opacity-50 transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center w-10 h-10"
                aria-label="הוסף משימה"
            >
                {isSubmitting ? <SparklesIcon className="h-5 w-5 animate-pulse" /> : <AddIcon className="h-5 w-5" />}
            </button>
        </form>
    );
};

export default QuickAddTask;