import React, { useEffect, useRef, useState } from 'react';
import type { PersonalItem } from '../types';
import { StarIcon, TrashIcon, PlayIcon, CopyIcon } from './icons';
import { useHaptics } from '../hooks/useHaptics';

interface PersonalItemContextMenuProps {
  x: number;
  y: number;
  item: PersonalItem;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onStartFocus: (item: PersonalItem) => void;
}

const PersonalItemContextMenu: React.FC<PersonalItemContextMenuProps> = ({ x, y, item, onClose, onUpdate, onDelete, onDuplicate, onStartFocus }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const { triggerHaptic } = useHaptics();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    if (menuRef.current) {
        const menuRect = menuRef.current.getBoundingClientRect();
        let newX = x;
        let newY = y;
        if (x + menuRect.width > window.innerWidth) newX = window.innerWidth - menuRect.width - 10;
        if (y + menuRect.height > window.innerHeight) newY = window.innerHeight - menuRect.height - 10;
        setPosition({ x: newX, y: newY });
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, x, y]);

  const handleAction = (action: () => void, isDestructive = false) => {
    if (isDestructive) {
        triggerHaptic('heavy');
    }
    action();
    onClose();
  };

  const canDuplicate = ['task', 'note', 'idea', 'workout', 'learning'].includes(item.type);
  const canFocus = ['task', 'goal', 'learning', 'book', 'roadmap'].includes(item.type);
  
  const menuItems = [
    {
      label: item.isImportant ? 'הסר חשיבות' : 'סמן כחשוב',
      icon: <StarIcon className="h-5 w-5" filled={!!item.isImportant} />,
      action: () => handleAction(() => onUpdate(item.id, { isImportant: !item.isImportant })),
    },
    ...(canFocus ? [{
      label: 'התחל סשן פוקוס',
      icon: <PlayIcon className="h-5 w-5" />,
      action: () => handleAction(() => onStartFocus(item)),
    }] : []),
    ...(canDuplicate ? [{
      label: 'שכפל',
      icon: <CopyIcon className="h-5 w-5" />,
      action: () => handleAction(() => onDuplicate(item.id)),
    }] : []),
    {
      label: 'מחק',
      icon: <TrashIcon className="h-5 w-5 text-red-400" />,
      action: () => handleAction(() => onDelete(item.id), true),
      isDestructive: true,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}></div>
      <div
        ref={menuRef}
        style={{ top: position.y, left: position.x }}
        className="fixed z-50 w-56 bg-[var(--bg-card)]/80 backdrop-blur-xl border border-[var(--border-primary)] rounded-lg shadow-2xl animate-fade-in-up-fast"
      >
        <style>{`
          @keyframes fade-in-up-fast {
            from { opacity: 0; transform: translateY(10px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-fade-in-up-fast { animation: fade-in-up-fast 0.2s cubic-bezier(0.215, 0.610, 0.355, 1.000) forwards; }
        `}</style>
        <div className="p-1">
          {menuItems.map((menuItem) => (
            <button
              key={menuItem.label}
              onClick={menuItem.action}
              className={`w-full flex items-center gap-3 text-right px-3 py-2 text-sm rounded-md transition-colors
                ${menuItem.isDestructive ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-200 hover:bg-white/10'}`}
            >
              {menuItem.icon}
              <span>{menuItem.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default PersonalItemContextMenu;