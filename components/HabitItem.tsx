import React from 'react';
import type { PersonalItem } from '../types';
import { FlameIcon, CheckCircleIcon, TrashIcon } from './icons';

interface HabitItemProps {
  item: PersonalItem;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  onDelete: (id: string) => void;
  onSelect: (item: PersonalItem) => void;
}

const HabitItem: React.FC<HabitItemProps> = ({ item, onUpdate, onDelete, onSelect }) => {

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
    
    const today = new Date();
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
    
    onUpdate(item.id, { lastCompleted: today.toISOString(), streak: newStreak });
  };
  
  const completed = isCompletedToday();

  return (
    <div 
        onClick={() => onSelect(item)}
        className={`group relative glass-card rounded-lg p-4 flex items-center justify-between gap-4 transition-all ${completed ? 'bg-green-500/10 border-green-500/30' : ''} cursor-pointer`}
    >
      <div className="flex items-center gap-4">
          <div className="relative">
              <FlameIcon className={`w-8 h-8 shrink-0 transition-colors ${item.streak && item.streak > 0 ? 'text-orange-400' : 'text-gray-600'}`} />
              {item.streak && item.streak > 0 ? (
                  <span className="absolute -top-1 -right-2 text-xs font-bold bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-gray-900">
                      {item.streak}
                  </span>
              ) : null}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-lg font-semibold text-gray-100">{item.title}</p>
            <p className="text-sm text-gray-400">
                {completed ? "כל הכבוד, נתראה מחר!" : item.streak && item.streak > 0 ? `רצף של ${item.streak} ימים` : "בוא נתחיל הרגל חדש!"}
            </p>
          </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); handleComplete(); }}
        disabled={completed}
        className={`p-3 rounded-full transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${completed ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        aria-label={completed ? 'הושלם להיום' : 'סמן כהושלם'}
      >
        <CheckCircleIcon className="w-7 h-7" />
      </button>
      <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="absolute top-2 left-2 text-gray-600 hover:text-red-400 transition-all transform hover:scale-110 flex-shrink-0"
          aria-label="מחק הרגל"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
    </div>
  );
};

export default HabitItem;