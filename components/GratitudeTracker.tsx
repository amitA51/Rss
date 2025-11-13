import React, { useState, useEffect, useContext } from 'react';
import { addPersonalItem } from '../services/dataService';
import { AppContext } from '../state/AppContext';
import type { PersonalItem } from '../types';
import { SparklesIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow";
const buttonStyles = "mt-4 w-full bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 hover:shadow-[0_0_15px_var(--dynamic-accent-glow)] flex items-center justify-center h-12";

const GratitudeTracker: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    
    const [todayGratitude, setTodayGratitude] = useState<PersonalItem | null>(null);
    const [inputs, setInputs] = useState(['', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const today = new Date().toDateString();
        const found = state.personalItems.find(item => 
            item.type === 'gratitude' && new Date(item.createdAt).toDateString() === today
        );
        setTodayGratitude(found || null);
    }, [state.personalItems]);

    const handleSave = async () => {
        if (inputs.some(i => i.trim() === '')) {
            alert("אנא מלא את כל שלושת הדברים שאתה מודה עליהם.");
            return;
        }
        setIsSubmitting(true);
        if (window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }
        const newItem = await addPersonalItem({
            type: 'gratitude',
            title: `הכרת תודה - ${new Date().toLocaleDateString('he-IL')}`,
            content: inputs.join('\n'),
        });
        dispatch({ type: 'ADD_PERSONAL_ITEM', payload: newItem });
        setIsSubmitting(false);
    };

    if (todayGratitude) {
        const gratitudes = todayGratitude.content.split('\n');
        return (
            <section className="themed-card p-4 bg-gradient-to-br from-[var(--bg-card)] to-[#2a221c]">
                <h2 className="text-lg font-bold text-[var(--dynamic-accent-highlight)] mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5"/>
                    אני מודה על...
                </h2>
                <ul className="list-disc list-inside text-[var(--text-primary)] space-y-1 pl-2">
                    {gratitudes.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
            </section>
        );
    }
    
    return (
        <section className="themed-card p-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">על מה אני מודה היום?</h2>
            <div className="space-y-2">
                {inputs.map((val, i) => (
                    <input 
                        key={i}
                        type="text"
                        value={val}
                        onChange={e => {
                            const newInputs = [...inputs];
                            newInputs[i] = e.target.value;
                            setInputs(newInputs);
                        }}
                        className={inputStyles}
                        placeholder={`דבר #${i + 1}...`}
                    />
                ))}
            </div>
            <button onClick={handleSave} disabled={isSubmitting || inputs.some(i => !i.trim())} className={buttonStyles}>
                {isSubmitting ? <LoadingSpinner /> : 'שמור הכרת תודה'}
            </button>
        </section>
    );
};

export default GratitudeTracker;
