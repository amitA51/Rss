import React, { useState, useEffect } from 'react';
import type { FeedItem } from '../types';
import { FlameIcon, ReadIcon, UnreadIcon, SummarizeIcon } from './icons';

interface FeedCardV2Props {
  item: FeedItem;
  index: number;
  onSelect: (item: FeedItem) => void;
  onToggleRead: (id: string) => void;
  onSummarize: (item: FeedItem) => void;
  isSummarizing: boolean;
  onContextMenu: (event: React.MouseEvent, item: FeedItem) => void;
}

const FeedCardV2: React.FC<FeedCardV2Props> = ({ item, index, onSelect, onToggleRead, onSummarize, isSummarizing, onContextMenu }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);
  
  const getFaviconUrl = (link: string | undefined) => {
    if (!link) return '';
    try {
      const url = new URL(link);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
    } catch (e) {
      return '';
    }
  };

  const CardHeader = () => (
    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
      {item.type === 'spark' ? (
        <>
          <FlameIcon className="w-4 h-4 text-orange-400" />
          <span>ספארק</span>
        </>
      ) : (
        <>
          <img src={getFaviconUrl(item.link)} alt="" className="w-4 h-4 rounded-full bg-gray-700" />
          <span className="truncate">{item.link ? new URL(item.link).hostname.replace('www.', '') : 'RSS'}</span>
        </>
      )}
    </div>
  );

  return (
    <div
      onClick={() => onSelect(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      className={`group relative glass-card rounded-xl shadow-lg transition-all duration-300 ease-out cursor-pointer overflow-hidden
        hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/10 active:scale-[0.98] active:duration-75
        ${item.is_read ? 'opacity-60 hover:opacity-100' : 'opacity-100'}
        ${isMounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <div className="p-4">
        <CardHeader />
        <h3 className="text-lg font-semibold text-gray-100 group-hover:text-blue-300 transition-colors">{item.title}</h3>
        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.summary_ai || item.content}</p>
      </div>
      
      <div className="flex items-center justify-end gap-2 px-4 pb-3 pt-1">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleRead(item.id); }}
          className="p-2 rounded-full hover:bg-blue-600/20 text-gray-400 hover:text-white transition-colors"
          aria-label={item.is_read ? 'סמן כלא נקרא' : 'סמן כנקרא'}
        >
          {item.is_read ? <ReadIcon className="h-5 w-5" /> : <UnreadIcon className="h-5 w-5" />}
        </button>
        {!item.summary_ai && (
            <button
            onClick={(e) => { e.stopPropagation(); onSummarize(item); }}
            disabled={isSummarizing}
            className="p-2 rounded-full hover:bg-blue-600/20 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            aria-label="סכם"
          >
            <SummarizeIcon className={`h-5 w-5 ${isSummarizing ? 'animate-pulse' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(FeedCardV2);