import React, { useState, useEffect, useRef, useContext } from 'react';
import type { FeedItem } from '../types';
import { SparklesIcon, FeedIcon, CheckCircleIcon, BrainCircuitIcon } from './icons';
import { getTagColor } from './icons';
import { AppContext } from '../state/AppContext';

interface FeedCardV2Props {
  item: FeedItem;
  index: number;
  onSelect: (item: FeedItem, event: React.MouseEvent | React.KeyboardEvent) => void;
  onLongPress: (item: FeedItem) => void;
  onContextMenu: (event: React.MouseEvent, item: FeedItem) => void;
  isInSelectionMode: boolean;
  isSelected: boolean;
}

const getFaviconUrl = (link: string) => {
    try {
        const url = new URL(link);
        return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
    } catch (e) {
        return ''; // return empty string for invalid URLs
    }
};


const FeedCardV2: React.FC<FeedCardV2Props> = ({ item, index, onSelect, onLongPress, onContextMenu, isInSelectionMode, isSelected }) => {
  const { state } = useContext(AppContext);
  const { cardStyle } = state.settings.themeSettings;
  
  const cardRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isInSelectionMode) {
      e.preventDefault();
      return;
    }
    onContextMenu(e, item);
  }

  useEffect(() => {
    const card = cardRef.current;
    if (!card || cardStyle !== 'glass') return;

    const handleMouseMove = (e: MouseEvent) => {
      const { left, top } = card.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    };

    card.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (card) {
        card.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [cardStyle]);

  const contentSnippet = item.summary_ai || item.content.split('\n')[0];
  
  let sourceText: string;
  let icon: React.ReactNode;
  
  if (item.type === 'rss' && item.link) {
    sourceText = new URL(item.link).hostname.replace('www.', '');
    icon = <FeedIcon className="w-5 h-5" />;
  } else if (item.type === 'spark') {
    sourceText = 'ספארק אישי';
    icon = <SparklesIcon className="w-5 h-5" />;
  } else if (item.type === 'mentor') {
    sourceText = item.title.replace('ציטוט מאת ', '').replace('סרטון מומלץ: ', '');
    icon = <BrainCircuitIcon className="w-5 h-5" />;
  } else {
    sourceText = 'מקור לא ידוע';
    icon = <FeedIcon className="w-5 h-5" />;
  }
  
  const faviconUrl = item.type === 'rss' && item.link ? getFaviconUrl(item.link) : null;

  return (
    <div
      ref={cardRef}
      onClick={(e) => onSelect(item, e)}
      onContextMenu={(e) => { e.preventDefault(); isInSelectionMode ? onSelect(item, e) : onContextMenu(e, item); }}
      className={`group relative themed-card p-4 transition-all duration-300 ease-[var(--fi-cubic-bezier)] cursor-pointer
        ${item.is_read && !isInSelectionMode ? 'opacity-60 hover:opacity-90' : ''}
        ${isSelected ? 'selected' : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(item, e);
          }
      }}
      aria-label={`פתח פריט: ${item.title}`}
    >
      {cardStyle === 'glass' && (
        <div 
          className="absolute inset-0 rounded-[23px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
          style={{
            background: `radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), var(--dynamic-accent-glow), transparent)`
          }}
        ></div>
      )}
      
       {isInSelectionMode && (
          <div className={`absolute top-4 left-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--dynamic-accent-start)] border-[var(--dynamic-accent-start)]' : 'border-gray-500 bg-black/20'}`}>
              {isSelected && <CheckCircleIcon className="w-7 h-7 text-white" />}
          </div>
       )}

      <div className={`flex items-start gap-4 relative transition-opacity ${isInSelectionMode ? 'opacity-80' : ''}`}>
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--dynamic-accent-highlight)] mt-1">
          {icon}
        </div>
        <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center">
                 <h3 className="text-lg font-semibold text-[var(--text-primary)] transition-colors truncate group-hover:text-[var(--dynamic-accent-highlight)] pr-2">{item.title}</h3>
                 {!item.is_read && !isInSelectionMode && <div className="w-2.5 h-2.5 bg-[var(--dynamic-accent-start)] rounded-full shrink-0 animate-pulse"></div>}
            </div>
            <p className="text-xs text-[var(--text-secondary)]/80 truncate flex items-center gap-1.5">
                {faviconUrl && <img src={faviconUrl} alt="favicon" className="w-4 h-4 rounded-full bg-white/10" />}
                <span>{sourceText}</span>
            </p>
            {contentSnippet && (
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-2">
                    {contentSnippet}
                </p>
            )}
            {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.tags.map((tag) => {
                        const colors = getTagColor(tag.name);
                        return (
                            <span 
                                key={tag.id} 
                                className="text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: colors.backgroundColor, color: colors.textColor }}
                            >
                                {tag.name}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(FeedCardV2);