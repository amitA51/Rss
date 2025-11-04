import React, { useState, useEffect, useContext } from 'react';
import type { PersonalItem } from '../types';
import { TrashIcon, CheckCircleIcon, PlayIcon } from './icons';
import { AppContext } from '../state/AppContext';

interface TaskItemProps {
  item: PersonalItem;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  onDelete: (id: string) => void;
  onSelect: (item: PersonalItem, event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent, item: PersonalItem) => void;
  onStartFocus: (item: PersonalItem) => void;
  index: number;
}

const CustomCheckbox: React.FC<{ checked: boolean; onToggle: () => void; title: string }> = ({ checked, onToggle, title }) => {
    const [isAnimating, setIsAnimating] = useState(false);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle();
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
    };
    
    return (
        <button
            onClick={handleToggle}
            className={`relative h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 transform active:scale-90
                ${checked ? 'bg-[var(--accent-gradient)] shadow-[0_0_12px_var(--dynamic-accent-glow)]' : 'bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)]'}
                ${isAnimating ? 'animate-check-bounce' : ''}
            `}
            aria-label={`סמן את ${title} כ${checked ? 'לא הושלם' : 'הושלם'}`}
            aria-checked={checked}
            role="checkbox"
        >
           {checked && <CheckCircleIcon className="w-8 h-8 text-white" />}
        </button>
    );
};


const TaskItem: React.FC<TaskItemProps> = ({ item, onUpdate, onDelete, onSelect, onContextMenu, onStartFocus, index }) => {
  
  const handleToggle = () => {
    if (window.navigator.vibrate) {
        window.navigator.vibrate(20);
    }
    onUpdate(item.id, { isCompleted: !item.isCompleted });
  };

  const handleToggleSubTask = (subTaskId: string) => {
    if (window.navigator.vibrate) {
        window.navigator.vibrate(10);
    }
    const newSubTasks = item.subTasks?.map(st => 
        st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    onUpdate(item.id, { subTasks: newSubTasks });
  };
  
  const handleStartFocusSession = (e: React.MouseEvent) => {
      e.stopPropagation();
      onStartFocus(item);
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.navigator.vibrate) window.navigator.vibrate(100);
    onDelete(item.id);
  };

  const completedCount = item.subTasks?.filter(st => st.isCompleted).length || 0;
  const totalCount = item.subTasks?.length || 0;

  const getPriorityColor = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'border-l-[var(--danger)]';
      case 'medium': return 'border-l-[var(--dynamic-accent-start)]';
      case 'low': return 'border-l-[var(--text-secondary)]';
      default: return 'border-l-transparent';
    }
  };

  const getRelativeDueDate = (dueDate?: string) => {
      if (!dueDate) return null;
      const due = new Date(dueDate);
      const now = new Date();
      now.setHours(0,0,0,0);
      due.setHours(23,59,59,999);
      
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;

      if (diffDays < 0) return <span className="text-[var(--danger)]">עבר הזמן</span>;
      if (diffDays === 0) return <span className="text-[var(--warning)]">היום</span>;
      if (diffDays === 1) return <span className="text-[var(--dynamic-accent-highlight)]">מחר</span>;
      return <span className="text-[var(--text-secondary)]">בעוד {diffDays} ימים</span>;
  }

  return (
    <div
      onClick={(e) => onSelect(item, e)}
      onContextMenu={(e) => onContextMenu(e, item)}
      className={`group relative themed-card p-4 flex items-start gap-4 border-l-4 transition-all duration-300 ${getPriorityColor(item.priority)} ${item.isCompleted ? 'task-completed completed-item' : ''} cursor-pointer active:scale-95 animate-item-enter`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CustomCheckbox checked={!!item.isCompleted} onToggle={handleToggle} title={item.title}/>
      
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
            <p className={`relative task-text text-[var(--text-primary)] transition-colors ${item.isCompleted ? 'text-[var(--text-secondary)]' : ''}`}>
            {item.title}
            </p>
            {totalCount > 0 && !item.isCompleted && (
                <span className="text-xs text-[var(--text-secondary)] font-mono shrink-0">
                    ({completedCount}/{totalCount})
                </span>
            )}
        </div>
        {item.dueDate && !item.isCompleted && (
            <p className="text-xs mt-1">
                {getRelativeDueDate(item.dueDate)}
            </p>
        )}
        {totalCount > 0 && !item.isCompleted && (
            <div className="mt-3 space-y-2 pr-1">
                {item.subTasks?.map(st => (
                    <div key={st.id} className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={st.isCompleted}
                            onChange={(e) => { e.stopPropagation(); handleToggleSubTask(st.id); }}
                            onClick={(e) => e.stopPropagation()} // prevent card click
                            className="h-4 w-4 rounded bg-black/30 border-gray-600 text-[var(--dynamic-accent-start)] focus:ring-[var(--dynamic-accent-start)] cursor-pointer"
                        />
                        <label className={`transition-colors ${st.isCompleted ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                            {st.title}
                        </label>
                    </div>
                ))}
            </div>
        )}
      </div>
      <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!item.isCompleted && (
           <button
              onClick={handleStartFocusSession}
              className="text-[var(--text-secondary)] hover:text-[var(--dynamic-accent-start)] transition-all transform hover:scale-110"
              aria-label="התחל סשן פוקוס"
            >
              <PlayIcon className="h-5 w-5" />
            </button>
        )}
        <button
          onClick={handleDelete}
          className="text-[var(--text-secondary)] hover:text-[var(--danger)] transition-all transform hover:scale-110"
          aria-label="מחק משימה"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default React.memo(TaskItem);