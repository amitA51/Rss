import React, { useState, useEffect } from 'react';
import type { FeedItem, Tag } from '../types';
import { ReadIcon, UnreadIcon } from './icons';

interface FeedCardProps {
  item: FeedItem;
  onLongPress: (item: FeedItem) => void;
  onToggleRead: (id: string) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ item, onLongPress, onToggleRead }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Set mounted to true after a short delay to trigger the animation
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }
    onLongPress(item);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `לפני ${minutes} ד'`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `לפני ${hours} ש'`;
    
    const days = Math.floor(hours / 24);
    return `לפני ${days} י'`;
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className={`bg-gray-900 border border-gray-800 rounded-lg p-4 mb-4 shadow-md transform transition-[opacity,transform] duration-500 ease-in-out 
        ${item.is_read ? 'opacity-50' : 'opacity-100'} 
        ${isMounted ? 'translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-4">
          <h3 className="text-lg font-semibold text-gray-100">{item.title}</h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.summary_ai || item.content}</p>
        </div>
        <button
          onClick={() => onToggleRead(item.id)}
          className="text-gray-500 hover:text-blue-400 transition-colors"
          aria-label={item.is_read ? 'סמן כלא נקרא' : 'סמן כנקרא'}
        >
          {item.is_read ? <ReadIcon className="h-6 w-6" /> : <UnreadIcon className="h-6 w-6" />}
        </button>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
         <div className="flex flex-wrap gap-2">
            {item.tags.map((tag: Tag) => (
                <span key={tag.id} className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                    {tag.name}
                </span>
            ))}
        </div>
        <span>{getRelativeTime(item.createdAt)}</span>
      </div>
    </div>
  );
};

export default FeedCard;
