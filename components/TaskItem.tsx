import React from 'react';
import type { PersonalItem } from '../types';
import { TrashIcon } from './icons';

interface TaskItemProps {
  item: PersonalItem;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  onDelete: (id: string) => void;
  onSelect: (item: PersonalItem) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ item, onUpdate, onDelete, onSelect }) => {
  const handleToggle = () => {
    onUpdate(item.id, { isCompleted: !item.isCompleted });
  };

  const getPriorityColor = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'border-red-500/80';
      case 'medium': return 'border-yellow-500/80';
      case 'low': return 'border-blue-500/80';
      default: return 'border-transparent';
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

      if (diffDays < 0) return <span className="text-red-400">עבר הזמן</span>;
      if (diffDays === 0) return <span className="text-yellow-400">היום</span>;
      if (diffDays === 1) return <span className="text-blue-300">מחר</span>;
      return <span className="text-gray-400">בעוד {diffDays} ימים</span>;
  }

  return (
    <>
    <style>{`
      .task-text::after {
        content: '';
        position: absolute;
        top: 50%;
        right: 0;
        height: 1.5px;
        background-color: currentColor;
        width: 0;
        transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .task-completed .task-text::after {
        width: 100%;
      }
    `}</style>
    <div
      onClick={() => onSelect(item)}
      className={`group relative glass-card rounded-lg p-3 flex items-center gap-3 border-l-4 transition-all duration-300 ${getPriorityColor(item.priority)} ${item.isCompleted ? 'opacity-50 hover:opacity-80 filter grayscale-[50%] task-completed' : 'opacity-100'} cursor-pointer`}
    >
      <input
        type="checkbox"
        checked={!!item.isCompleted}
        onClick={(e) => e.stopPropagation()}
        onChange={handleToggle}
        className="h-6 w-6 rounded-full bg-gray-700/60 border-gray-600 text-blue-500 focus:ring-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer shrink-0"
        aria-label={`סמן את ${item.title} כהושלם`}
      />
      <div className="flex-1 overflow-hidden">
        <p className={`relative task-text text-gray-200 transition-colors ${item.isCompleted ? 'text-gray-500' : ''}`}>
          {item.title}
        </p>
        {item.dueDate && !item.isCompleted && (
            <p className="text-xs mt-1">
                {getRelativeDueDate(item.dueDate)}
            </p>
        )}
      </div>
       <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="text-gray-600 hover:text-red-400 transition-all transform hover:scale-110 flex-shrink-0 opacity-0 group-hover:opacity-100"
          aria-label="מחק משימה"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
    </div>
    </>
  );
};

export default TaskItem;