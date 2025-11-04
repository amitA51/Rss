import React, { useMemo, useState, useEffect, useContext } from 'react';
import type { PersonalItem } from '../types';
import { DumbbellIcon, SummarizeIcon, ClipboardListIcon, TrashIcon, LinkIcon, FileIcon, BookOpenIcon, TargetIcon, StarIcon, LightbulbIcon, UserIcon, RoadmapIcon } from './icons';
import { PERSONAL_ITEM_TYPE_COLORS } from '../constants';
import { AppContext } from '../state/AppContext';
import { getIconForName } from './IconMap';

interface PersonalItemCardProps {
  item: PersonalItem;
  onSelect: (item: PersonalItem, event: React.MouseEvent) => void;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  onContextMenu: (event: React.MouseEvent, item: PersonalItem) => void;
  index: number;
  spaceColor?: string;
  onDragStart?: (event: React.DragEvent, item: PersonalItem) => void;
  isDragging?: boolean;
}

const PersonalItemCard: React.FC<PersonalItemCardProps> = ({ item, onSelect, onUpdate, onContextMenu, index, spaceColor, onDragStart, isDragging }) => {
  const { state } = useContext(AppContext);
  
  const typeColor = PERSONAL_ITEM_TYPE_COLORS[item.type];
  const accentColor = spaceColor || typeColor;

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
  
  const previewContent = useMemo(() => {
    if (item.type === 'book') return item.author;
    if (item.type === 'roadmap') return `${item.steps?.length || 0} שלבים`;
    if (!item.content) return '';
    let content = item.content.split('\n')[0];
    // For checklists, remove the markdown
    content = content.replace(/\[[x ]\]\s*/g, '');
    return content;
  }, [item.type, item.content, item.author, item.steps]);

  const cursorClass = onDragStart ? 'cursor-grab' : 'cursor-pointer';

  return (
    <div 
        className={`group themed-card p-4 shadow-md relative transition-all duration-300 ease-out border-l-4 ${cursorClass} ${isDragging ? 'dragging-item' : ''} animate-item-enter-fi`}
        style={{ animationDelay: `${index * 30}ms`, borderLeftColor: accentColor }}
        onClick={(e) => onSelect(item, e)}
        onContextMenu={(e) => onContextMenu(e, item)}
        draggable={!!onDragStart}
        onDragStart={(e) => onDragStart && onDragStart(e, item)}
    >
        <div className="flex justify-between items-start gap-4">
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                        {getIcon()}
                    </div>
                    <span className="text-sm font-semibold capitalize" style={{ color: typeColor }}>{item.type}</span>
                </div>
                <h3 className="font-semibold text-gray-100 truncate">{item.title}</h3>
                {previewContent && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{previewContent}</p>}
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