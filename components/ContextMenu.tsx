import React, { useEffect, useRef, useState } from 'react';
import type { FeedItem } from '../types';
import { ReadIcon, UnreadIcon, SummarizeIcon, ClipboardIcon, TrashIcon, BookOpenIcon } from './icons';

interface ContextMenuProps {
  x: number;
  y: number;
  item: FeedItem;
  onClose: () => void;
  onToggleRead: () => void;
  onSummarize: () => void;
  onDelete?: (id: string) => void;
  onAddToLibrary: (item: FeedItem) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, item, onClose, onToggleRead, onSummarize, onDelete, onAddToLibrary }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

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
        if (x + menuRect.width > window.innerWidth) {
            newX = window.innerWidth - menuRect.width - 10;
        }
        if (y + menuRect.height > window.innerHeight) {
            newY = window.innerHeight - menuRect.height - 10;
        }
        setPosition({ x: newX, y: newY });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, x, y]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };
  
  const copyLink = () => {
      if (item.link) {
          navigator.clipboard.writeText(item.link);
      }
  };

  const menuItems = [
    {
      label: item.is_read ? 'סמן כלא נקרא' : 'סמן כנקרא',
      icon: item.is_read ? <UnreadIcon className="h-5 w-5" /> : <ReadIcon className="h-5 w-5" />,
      action: () => handleAction(onToggleRead),
    },
    {
      label: 'סכם עם AI',
      icon: <SummarizeIcon className="h-5 w-5" />,
      action: () => handleAction(onSummarize),
      disabled: !!item.summary_ai,
    },
    ...(item.type === 'rss' ? [{
        label: 'הוסף לספרייה',
        icon: <BookOpenIcon className="h-5 w-5"/>,
        action: () => handleAction(() => onAddToLibrary(item)),
    }] : []),
    ...(item.link ? [{
      label: 'העתק קישור',
      icon: <ClipboardIcon className="h-5 w-5" />,
      action: () => handleAction(copyLink),
    }] : []),
    ...(item.type === 'spark' && onDelete ? [{
      label: 'מחק ספארק',
      icon: <TrashIcon className="h-5 w-5 text-red-400" />,
      action: () => handleAction(() => onDelete(item.id)),
      isDestructive: true,
    }] : []),
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
            !menuItem.disabled && (
              <button
                key={menuItem.label}
                onClick={menuItem.action}
                disabled={!!menuItem.disabled}
                className={`w-full flex items-center gap-3 text-right px-3 py-2 text-sm rounded-md transition-colors
                  ${menuItem.isDestructive ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-200 hover:bg-white/10'}
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
              >
                {menuItem.icon}
                <span>{menuItem.label}</span>
              </button>
            )
          ))}
        </div>
      </div>
    </>
  );
};

export default ContextMenu;