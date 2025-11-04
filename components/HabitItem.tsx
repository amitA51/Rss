import React, { useState, useEffect, useContext } from 'react';
import type { PersonalItem } from '../types';
import { FlameIcon, CheckCircleIcon, TrashIcon } from './icons';
import { AppContext } from '../state/AppContext';

interface HabitItemProps {
  item: PersonalItem;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  onDelete: (id: string) => void;
  onSelect: (item: PersonalItem, event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent, item: PersonalItem) => void;
  index: number;
  isCelebrationActive?: boolean;
}

const HabitItem: React.FC<HabitItemProps> = ({ item, onUpdate, onDelete, onSelect, onContextMenu, index, isCelebrationActive }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const isCompletedToday = () => {
    if (!item.lastCompleted) return false;
    const lastDate = new Date(item.lastCompleted);
    const today = new Date();
    return lastDate.getFullYear() === today.getFullYear() &&
           lastDate.getMonth() === today.getMonth() &&
           lastDate.getDate() === today.getDate();
  };
  
  const handleComplete = () => {
    if (isCompletedToday()) return;

    if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }
    
    const today = new Date();
    const todayISO = today.toISOString();
    let newStreak = (item.streak || 0);

    if (item.lastCompleted) {
        const lastDate = new Date(item.lastCompleted);
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        
        if (lastDate.toDateString() === yesterday.toDateString()) {
            newStreak++;
        } else {
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
  };
  
  const completed = isCompletedToday();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.navigator.vibrate) window.navigator.vibrate(100);
    onDelete(item.id);
  };

  return (
    <div 
        onClick={(e) => onSelect(item, e)}
        onContextMenu={(e) => onContextMenu(e, item)}
        className={`group relative themed-card p-4 flex items-center justify-between gap-4 transition-all duration-300 ease-out ${completed ? 'bg-[var(--dynamic-accent-start)]/20 border-[var(--dynamic-accent-start)]/50 completed-habit' : ''} cursor-pointer active:scale-95 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 animate-item-enter'}`}
        style={{ animationDelay: `${index * 50}ms` }}
    >
      {isCelebrationActive && completed && (
          <>
              <div className="celebrate-sparkle" style={{ top: '20%', left: '10%', animationDelay: '0s', width: '6px', height: '6px' }}></div>
              <div className="celebrate-sparkle" style={{ top: '80%', left: '30%', animationDelay: '0.2s' }}></div>
              <div className="celebrate-sparkle" style={{ top: '50%', left: '90%', animationDelay: '0.4s', width: '10px', height: '10px' }}></div>
              <div className="celebrate-sparkle" style={{ top: '10%', left: '60%', animationDelay: '0.1s' }}></div>
          </>
      )}
      <div className="flex items-center gap-4">
          <div className="relative">
              <FlameIcon className={`w-8 h-8 shrink-0 transition-all duration-500 ${item.streak && item.streak > 0 ? 'text-[var(--dynamic-accent-start)]' : 'text-gray-600'} ${completed ? 'svg-glow' : ''}`} />
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
                {completed ? "כל הכבוד, נתראה מחר!" : item.streak && item.streak > 0 ? `רצף של ${item.streak} ימים` : "בוא נתחיל הרגל חדש!"}
            </p>
          </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); handleComplete(); }}
        disabled={completed}
        className={`relative p-3 rounded-full transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${completed ? 'bg-[var(--dynamic-accent-start)] text-white' : 'bg-[var(--bg-secondary)] hover:bg-white/10 text-[var(--text-primary)]'}`}
        aria-label={completed ? 'הושלם להיום' : 'סמן כהושלם'}
      >
        {completed && <div className="absolute inset-0 rounded-full bg-[var(--dynamic-accent-start)] animate-ping opacity-70"></div>}
        <CheckCircleIcon className="w-7 h-7" />
      </button>
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