import React, { useMemo, useState, useEffect, useContext, useRef, useCallback } from 'react';
import type { PersonalItem } from '../types';
import { DumbbellIcon, SummarizeIcon, ClipboardListIcon, TrashIcon, LinkIcon, FileIcon, BookOpenIcon, TargetIcon, StarIcon, LightbulbIcon, UserIcon, RoadmapIcon, CheckCircleIcon } from './icons';
import { PERSONAL_ITEM_TYPE_COLORS } from '../constants';
import { AppContext } from '../state/AppContext';
import { getIconForName } from './IconMap';

interface PersonalItemCardProps {
  item: PersonalItem;
  onSelect: (item: PersonalItem, event: React.MouseEvent | React.KeyboardEvent) => void;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  onDelete: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, item: PersonalItem) => void;
  index: number;
  spaceColor?: string;
  onDragStart?: (event: React.DragEvent, item: PersonalItem) => void;
  onDragEnter?: (event: React.DragEvent, item: PersonalItem) => void;
  onDragEnd?: (event: React.DragEvent) => void;
  isDragging?: boolean;
  onLongPress: (item: PersonalItem) => void;
  isInSelectionMode: boolean;
  isSelected: boolean;
  searchQuery?: string;
}

const PersonalItemCard: React.FC<PersonalItemCardProps> = ({ 
    item, onSelect, onUpdate, onDelete, onContextMenu, index, spaceColor, 
    onDragStart, onDragEnter, onDragEnd, isDragging, onLongPress, 
    isInSelectionMode, isSelected, searchQuery 
}) => {
  const { state } = useContext(AppContext);
  const longPressTimerRef = useRef<any>(null);
  const wasLongPressedRef = useRef(false);
  
  const typeColor = PERSONAL_ITEM_TYPE_COLORS[item.type];
  const accentColor = spaceColor || typeColor;
  
  const handlePointerDown = useCallback(() => {
    wasLongPressedRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      if (!isInSelectionMode) { // Only trigger long press if not already in selection mode
          onLongPress(item);
          wasLongPressedRef.current = true;
      }
    }, 500);
  }, [item, onLongPress, isInSelectionMode]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (wasLongPressedRef.current) {
        e.preventDefault();
        return;
    }
    onSelect(item, e);
  }, [onSelect, item]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  const getIcon = () => {
    const iconClass = "h-5 w-5";
    if (item.icon) {
      const Icon = getIconForName(item.icon);
      return <Icon className={iconClass} />;
    }
    switch (item.type) {
      case 'workout': return <DumbbellIcon className={iconClass} />;
      case 'learning': return <SummarizeIcon className={iconClass} />;
      case 'note': return <ClipboardListIcon className={iconClass} />;
      case 'link': return <LinkIcon className={iconClass} />;
      case 'book': return <BookOpenIcon className={iconClass} />;
      case 'goal': return <TargetIcon className={iconClass} />;
      case 'idea': return <LightbulbIcon className={iconClass} />;
      case 'journal': return <UserIcon className={iconClass} />;
      case 'roadmap': return <RoadmapIcon className={iconClass} />;
      default: return null;
    }
  };
  
  const handleToggleImportant = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(item.id, { isImportant: !item.isImportant });
  };
  
  // Function to escape special characters for use in a regular expression
  const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  };

  const highlightMatches = (text: string, query: string) => {
    if (!query || !text) return text;
    // FIX: Escape the user's query to prevent invalid regular expression errors
    // when searching for characters like '(', '+', etc.
    const escapedQuery = escapeRegExp(query);
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded-sm">{part}</mark>
                ) : (
                    part
                )
            )}
        </>
    );
  };

  const previewContent = useMemo(() => {
    if (item.type === 'book') return item.author;
    // FIX: Changed `item.steps` to `item.phases` to align with the new data model for roadmaps.
    if (item.type === 'roadmap') return `${item.phases?.length || 0} שלבים`;
    if (!item.content) return '';
    let content = item.content.split('\n')[0];
    content = content.replace(/\[[x ]\]\s*/g, '');
    return content;
  }, [item.type, item.content, item.author, item.phases]);

  const cursorClass = onDragStart ? 'cursor-grab' : 'cursor-pointer';

  return (
    <div 
        className={`group themed-card p-4 relative transition-all duration-300 ease-out border-l-4 ${cursorClass} ${isDragging ? 'dragging-item' : ''} ${isSelected ? 'selected' : ''}`}
        style={{ animationDelay: `${index * 30}ms`, borderLeftColor: accentColor }}
        onClick={handleClick}
        onContextMenu={(e) => {
            e.preventDefault();
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
            if (isInSelectionMode) {
                onSelect(item, e);
            } else {
                onContextMenu(e, item);
            }
        }}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        draggable={!!onDragStart}
        onDragStart={(e) => onDragStart && onDragStart(e, item)}
        onDragEnter={(e) => onDragEnter && onDragEnter(e, item)}
        onDragEnd={(e) => onDragEnd && onDragEnd(e)}
        onDragOver={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(item, e);
            }
        }}
        aria-label={`פתח פרטים עבור ${item.title}`}
    >
        {isInSelectionMode && (
          <div className={`absolute top-4 left-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--dynamic-accent-start)] border-[var(--dynamic-accent-start)]' : 'border-gray-500 bg-black/20'}`}>
              {isSelected && <CheckCircleIcon className="w-7 h-7 text-white" />}
          </div>
       )}

        <button 
            onClick={handleDelete}
            className="absolute top-2 left-2 text-gray-600 hover:text-red-400 transition-all transform hover:scale-110 flex-shrink-0 opacity-0 group-hover:opacity-100 z-10"
            aria-label={`מחק ${item.title}`}
        >
            <TrashIcon className="w-5 h-5"/>
        </button>

        <div className={`flex justify-between items-start gap-4 transition-opacity ${isInSelectionMode ? 'opacity-80' : ''}`}>
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                        {getIcon()}
                    </div>
                    <span className="text-sm font-semibold capitalize" style={{ color: accentColor }}>{item.type}</span>
                </div>
                <h3 className="font-semibold text-gray-100 truncate">{highlightMatches(item.title, searchQuery || '')}</h3>
                {previewContent && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{highlightMatches(previewContent, searchQuery || '')}</p>}
            </div>
            {item.imageUrl && item.type === 'link' ? (
                <img src={item.imageUrl} alt="preview" className="w-16 h-16 object-cover rounded-lg bg-[var(--bg-secondary)]" />
            ) : item.type === 'link' ? (
                <div className="w-16 h-16 flex items-center justify-center bg-[var(--bg-secondary)] rounded-lg">
                    <FileIcon className="w-8 h-8 text-gray-600"/>
                </div>
            ) : null}
        </div>
    </div>
  );
};

export default React.memo(PersonalItemCard);