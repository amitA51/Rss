import React, { useState, useMemo, DragEvent, useCallback } from 'react';
import type { PersonalItem, PersonalItemType, AddableType } from '../types';
import { PERSONAL_ITEM_TYPE_COLORS } from '../constants';
import { getIconForName } from './IconMap';

type CalendarViewMode = 'month' | 'week';

interface CalendarViewProps {
  items: PersonalItem[];
  onSelectItem: (item: PersonalItem) => void;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  onQuickAdd: (type: AddableType, date: string) => void;
}

const CalendarItem: React.FC<{ item: PersonalItem, onSelect: () => void }> = ({ item, onSelect }) => {
    const color = PERSONAL_ITEM_TYPE_COLORS[item.type];
    const Icon = item.icon ? getIconForName(item.icon) : null;
    return (
        <button
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(item));
                e.dataTransfer.effectAllowed = 'move';
            }}
            onClick={onSelect}
            className="w-full text-right text-xs p-1 rounded transition-colors flex items-center gap-1"
            style={{ backgroundColor: `${color}33` }}
        >
            {Icon && <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />}
            <p className="truncate" style={{ color }}>{item.title}</p>
        </button>
    );
};

const CalendarView: React.FC<CalendarViewProps> = ({ items, onSelectItem, onUpdate, onQuickAdd }) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, PersonalItem[]>();
    items.forEach(item => {
      const dateStr = item.dueDate || item.metadata?.targetDate;
      if (dateStr) {
        // Normalize date to avoid timezone issues
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day).toDateString();
        if (!map.has(date)) map.set(date, []);
        map.get(date)?.push(item);
      }
    });
    return map;
  }, [items]);

  const handleDrop = (e: DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    try {
        const item = JSON.parse(e.dataTransfer.getData('application/json')) as PersonalItem;
        if (item) {
            const newDate = targetDate.toISOString().split('T')[0];
            const updates: Partial<PersonalItem> = {};
            if (item.type === 'task') updates.dueDate = newDate;
            if (item.type === 'goal') updates.metadata = { ...item.metadata, targetDate: newDate };
            onUpdate(item.id, updates);
        }
    } catch(err) {
        console.error("Failed to handle drop:", err);
    }
  };

  const changeDate = (delta: number) => {
      const newDate = new Date(currentDate);
      if(viewMode === 'month') newDate.setMonth(currentDate.getMonth() + delta);
      else newDate.setDate(currentDate.getDate() + (delta * 7));
      setCurrentDate(newDate);
  };
  
  const toISODateString = (date: Date) => {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    return (
        <div className="grid grid-cols-7">
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <div key={d} className="text-center font-semibold text-sm text-[var(--text-secondary)] py-2">{d}</div>)}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const dateString = date.toDateString();
                const itemsForDay = itemsByDate.get(dateString) || [];
                const isToday = new Date().toDateString() === dateString;
                
                return (
                    <div
                        key={day}
                        onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateString); }}
                        onDragLeave={() => setDragOverDate(null)}
                        onDrop={(e) => handleDrop(e, date)}
                        onClick={() => onQuickAdd('task', toISODateString(date))}
                        className={`h-28 sm:h-32 border-t border-[var(--border-primary)] p-1.5 overflow-hidden transition-colors duration-300 ${dragOverDate === dateString ? 'calendar-day-drag-over' : ''}`}
                    >
                        <span className={`text-sm ${isToday ? 'font-bold text-white bg-[var(--dynamic-accent-start)] rounded-full w-6 h-6 flex items-center justify-center' : 'text-[var(--text-secondary)]'}`}>{day}</span>
                        <div className="space-y-1 mt-1 overflow-y-auto max-h-[75%]">
                            {itemsForDay.map(item => <CalendarItem key={item.id} item={item} onSelect={() => onSelectItem(item)} />)}
                        </div>
                    </div>
                )
            })}
        </div>
    );
  };

  const renderWeekView = () => {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const weekDays = Array.from({length: 7}).map((_, i) => {
          const day = new Date(startOfWeek);
          day.setDate(startOfWeek.getDate() + i);
          return day;
      });
      return (
           <div className="grid grid-cols-7">
            {weekDays.map(day => (
                <div key={day.toISOString()} className="text-center font-semibold text-sm text-[var(--text-secondary)] py-2 border-b border-[var(--border-primary)]">
                   <div>{['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'][day.getDay()]}</div>
                   <div className={`mt-1 text-lg ${new Date().toDateString() === day.toDateString() ? 'text-white' : ''}`}>{day.getDate()}</div>
                </div>
            ))}
            {weekDays.map(day => {
                const dateString = day.toDateString();
                const itemsForDay = itemsByDate.get(dateString) || [];
                return (
                     <div key={dateString}
                        onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateString); }}
                        onDragLeave={() => setDragOverDate(null)}
                        onDrop={(e) => handleDrop(e, day)}
                        onClick={() => onQuickAdd('task', toISODateString(day))}
                        className={`h-[60vh] border-r border-[var(--border-primary)] p-1.5 overflow-hidden transition-colors duration-300 ${dragOverDate === dateString ? 'calendar-day-drag-over' : ''}`}
                    >
                        <div className="space-y-1 mt-1 overflow-y-auto h-full">
                            {itemsForDay.map(item => <CalendarItem key={item.id} item={item} onSelect={() => onSelectItem(item)} />)}
                        </div>
                    </div>
                )
            })}
           </div>
      )
  };

  return (
    <div className="themed-card p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-full hover:bg-white/10">&lt;</button>
        <h2 className="text-xl font-bold">{currentDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => changeDate(1)} className="p-2 rounded-full hover:bg-white/10">&gt;</button>
      </div>
      
      <div className="flex justify-center mb-4">
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-full">
              <button onClick={() => setViewMode('month')} className={`px-4 py-1 text-sm rounded-full ${viewMode === 'month' ? 'bg-white/90 text-black' : 'text-gray-400'}`}>חודש</button>
              <button onClick={() => setViewMode('week')} className={`px-4 py-1 text-sm rounded-full ${viewMode === 'week' ? 'bg-white/90 text-black' : 'text-gray-400'}`}>שבוע</button>
          </div>
      </div>

      {viewMode === 'month' ? renderMonthView() : renderWeekView()}
    </div>
  );
};

export default CalendarView;