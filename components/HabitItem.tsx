import React, { useState, useEffect, useContext, useCallback } from 'react';
import type { PersonalItem, SubHabit } from '../types';
import { FlameIcon, CheckCircleIcon, TrashIcon } from './icons';
import { AppContext } from '../state/AppContext';
import { useHaptics } from '../hooks/useHaptics';

interface HabitItemProps {
  item: PersonalItem;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  onDelete: (id: string) => void;
  onSelect: (item: PersonalItem, event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent, item: PersonalItem) => void;
  index: number;
}

const isDateToday = (isoDate: string | undefined) => {
    if (!isoDate) return false;
    const date = new Date(isoDate);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
};

const HabitItem: React.FC<HabitItemProps> = ({ item, onUpdate, onDelete, onSelect, onContextMenu, index }) => {
  const [justCompleted, setJustCompleted] = useState(false);
  const { triggerHaptic } = useHaptics();

  const isCompletedToday = isDateToday(item.lastCompleted);

  const handleUncomplete = useCallback(() => {
    const lastHistory = item.completionHistory?.slice(0, -1) || [];
    const newLastCompleted = lastHistory.length > 0 ? lastHistory[lastHistory.length - 1].date : undefined;
    
    // Decrement streak only if it was positive.
    const newStreak = (item.streak || 0) > 0 ? (item.streak || 0) - 1 : 0;

    onUpdate(item.id, { 
        lastCompleted: newLastCompleted,
        streak: newStreak,
        completionHistory: lastHistory,
    });
  }, [item.id, item.completionHistory, item.streak, onUpdate]);

  const handleComplete = useCallback((isAuto: boolean = false) => {
    if (!isAuto) triggerHaptic('medium');
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 800);
    
    const today = new Date();
    const todayISO = today.toISOString();
    let newStreak = (item.streak || 0);

    if (item.lastCompleted) {
        const lastDate = new Date(item.lastCompleted);
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        
        if (lastDate.toDateString() === yesterday.toDateString()) {
            newStreak++;
        } else if (lastDate.toDateString() !== today.toDateString()) {
             newStreak = 1;
        }
    } else {
        newStreak = 1;
    }
    
    const newHistory = [...(item.completionHistory || []), { date: todayISO }];
    
    onUpdate(item.id, { 
        lastCompleted: todayISO, 
        streak: newStreak,
        completionHistory: newHistory,
    });
  }, [item.id, item.streak, item.lastCompleted, item.completionHistory, onUpdate, triggerHaptic]);


  // Auto-complete main habit when all sub-habits are done
  useEffect(() => {
    const hasSubHabits = item.subHabits && item.subHabits.length > 0;
    if (!hasSubHabits) return;

    const allSubHabitsCompleted = item.subHabits.every(sh => isDateToday(item.lastCompletedSubHabits?.[sh.id]));
    
    if (allSubHabitsCompleted && !isCompletedToday) {
      handleComplete(true); // Auto-complete
    } else if (!allSubHabitsCompleted && isCompletedToday) {
      // If a sub-habit was unchecked, un-complete the main habit
      handleUncomplete();
    }

  }, [item.subHabits, item.lastCompletedSubHabits, isCompletedToday, handleComplete, handleUncomplete]);


  const handleToggleSubHabit = (subHabitId: string) => {
    triggerHaptic('light');
    const newLastCompletedSubHabits = {...(item.lastCompletedSubHabits || {})};
    if (isDateToday(newLastCompletedSubHabits[subHabitId])) {
        delete newLastCompletedSubHabits[subHabitId];
    } else {
        newLastCompletedSubHabits[subHabitId] = new Date().toISOString();
    }
    onUpdate(item.id, { lastCompletedSubHabits: newLastCompletedSubHabits });
  };


  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('heavy');
    onDelete(item.id);
  }, [item.id, onDelete, triggerHaptic]);

  const hasSubHabits = item.subHabits && item.subHabits.length > 0;


  return (
    <div 
        onClick={(e) => onSelect(item, e)}
        onContextMenu={(e) => onContextMenu(e, item)}
        className={`group relative themed-card p-4 transition-all duration-300 ease-[var(--fi-cubic-bezier)] ${isCompletedToday ? 'bg-[var(--dynamic-accent-start)]/20 border-[var(--dynamic-accent-start)]/50 completed-habit' : ''} cursor-pointer active:scale-97 animate-item-enter-fi`}
        style={{ animationDelay: `${index * 50}ms` }}
    >
      {justCompleted && Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="celebrate-sparkle" style={{
            top: `${Math.random() * 80 + 10}%`,
            left: `${Math.random() * 80 + 10}%`,
            animationDelay: `${Math.random() * 0.2}s`,
            width: `${Math.random() * 6 + 6}px`,
            height: `${Math.random() * 6 + 6}px`,
        }}></div>
      ))}
      <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
              <div className="relative">
                  <FlameIcon className={`w-10 h-10 shrink-0 transition-all duration-500 ${item.streak && item.streak > 0 ? 'text-[var(--dynamic-accent-start)] svg-glow' : 'text-gray-600'}`} />
                  {item.streak && item.streak > 0 ? (
                      <span className="absolute -top-1 -right-2 text-xs font-bold bg-[var(--dynamic-accent-start)] text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-[var(--bg-card)]"
                        style={{boxShadow: '0 0 8px var(--dynamic-accent-glow)'}}
                      >
                          <span key={item.streak} className="animate-bump-up">{item.streak}</span>
                      </span>
                  ) : null}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                    {isCompletedToday ? "כל הכבוד, נתראה מחר!" : item.streak && item.streak > 0 ? `רצף של ${item.streak} ימים` : "בוא נתחיל הרגל חדש!"}
                </p>
              </div>
          </div>
          {!hasSubHabits && (
            <button
                onClick={(e) => { e.stopPropagation(); handleComplete(); }}
                disabled={isCompletedToday}
                className={`relative w-14 h-14 flex items-center justify-center rounded-full transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${isCompletedToday ? 'bg-[var(--dynamic-accent-start)] text-white' : 'bg-[var(--bg-secondary)] hover:bg-white/10 text-[var(--text-primary)]'}`}
                aria-label={isCompletedToday ? 'הושלם להיום' : 'סמן כהושלם'}
            >
                {isCompletedToday && <div className="absolute inset-0 rounded-full bg-[var(--dynamic-accent-start)] animate-ping opacity-70"></div>}
                <CheckCircleIcon className="w-8 h-8" />
            </button>
          )}
      </div>
      
      {hasSubHabits && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            {item.subHabits?.map(sh => {
                const isSubCompleted = isDateToday(item.lastCompletedSubHabits?.[sh.id]);
                return (
                    <div key={sh.id} onClick={(e) => { e.stopPropagation(); handleToggleSubHabit(sh.id); }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                        <input type="checkbox" readOnly checked={isSubCompleted} className="h-5 w-5 rounded bg-black/30 border-gray-600 text-[var(--dynamic-accent-start)] focus:ring-[var(--dynamic-accent-start)] cursor-pointer" />
                        <span className={`flex-1 ${isSubCompleted ? 'line-through text-gray-500' : 'text-gray-200'}`}>{sh.title}</span>
                    </div>
                )
            })}
        </div>
      )}

      <button
          onClick={handleDelete}
          className="absolute top-2 left-2 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-all transform hover:scale-110 flex-shrink-0 opacity-0 group-hover:opacity-100"
          aria-label="מחק הרגל"
        >
          <TrashIcon className="h-5 h-5" />
        </button>
    </div>
  );
};

export default React.memo(HabitItem);