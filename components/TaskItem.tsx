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
            className={`relative h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 transform active:scale-90
                ${checked ? 'bg-[var(--accent-gradient)] shadow-[0_0_12px_var(--dynamic-accent-glow)]' : 'bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)]'}
                ${isAnimating ? 'animate-check-bounce' : ''}
            `}
            aria-label={`סמן את ${title} כ${checked ? 'לא הושלם' : 'הושלם'}`}
            aria-checked={checked}
            role="checkbox"
        >
           {checked && <CheckCircleIcon className="w-9 h-9 text-white" />}
        </button>
    );
};


const TaskItem: React.FC<TaskItemProps> = ({ item, onUpdate, onDelete, onSelect, onContextMenu, onStartFocus, index }) => {
  
  const handleToggle = () => {
    if (window.navigator.vibrate) {
        window.navigator.vibrate(20);
    }
    onUpdate(item.id, { isCompleted: !item.isCompleted, lastCompleted: !item.isCompleted ? new Date().toISOString() : undefined });
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
      className={`group relative themed-card p-4 flex items-start gap-4 border-l-4 transition-all duration-300 ${getPriorityColor(item.priority)} ${item.isCompleted ? 'task-completed completed-item' : ''} cursor-pointer active:scale-97 animate-item-enter-fi`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CustomCheckbox checked={!!item.isCompleted} onToggle={handleToggle} title={item.title}/>
      
      <div className="flex-1 overflow-hidden pt-0.5">
        <div className="flex items-center gap-2">
            <p className={`relative task-text text-lg text-[var(--text-primary)] transition-colors ${item.isCompleted ? 'text-[var(--text-secondary)]' : ''}`}>
            {item.title}
            </p>
            {totalCount > 0 && !item.isCompleted && (
                <span className="text-xs text-[var(--text-secondary)] font-mono shrink-0">
                    ({completedCount}/{totalCount})
                </span>
            )}
        </div>
        {item.dueDate && !item.isCompleted && (
            <p className="text-sm mt-1">
                {getRelativeDueDate(item.dueDate)}
            </p>
        )}
      </div>

      <div className="flex flex-col items-center justify-start gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleStartFocusSession}
          className="text-[var(--text-secondary)] hover:text-[var(--accent-highlight)]"
          aria-label="התחל סשן פוקוס"
        >
          <PlayIcon className="h-5 w-5" />
        </button>
        <button
          onClick={handleDelete}
          className="text-[var(--text-secondary)] hover:text-[var(--danger)]"
          aria-label="מחק משימה"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default React.memo(TaskItem);