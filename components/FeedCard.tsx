import React, { useState, useEffect, useRef } from 'react';
import type { FeedItem, Tag } from '../types';
import { ReadIcon, UnreadIcon } from './icons';

interface FeedCardProps {
  item: FeedItem;
  index: number;
  onLongPress: (item: FeedItem) => void;
  onToggleRead: (id: string) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ item, index, onLongPress, onToggleRead }) => {
  const [isMounted, setIsMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { left, top, width, height } = card.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      
      const rotateX = (y / height - 0.5) * -12;
      const rotateY = (x / width - 0.5) * 12;

      const shadowX = (x / width - 0.5) * -16;
      const shadowY = (y / height - 0.5) * -16;
      
      card.style.setProperty('--rotate-x', `${rotateX}deg`);
      card.style.setProperty('--rotate-y', `${rotateY}deg`);
      card.style.setProperty('--glow-x', `${x}px`);
      card.style.setProperty('--glow-y', `${y}px`);
      card.style.setProperty('--shadow-x', `${shadowX}px`);
      card.style.setProperty('--shadow-y', `${shadowY}px`);
    };

    const handleMouseLeave = () => {
      card.style.setProperty('--rotate-x', '0deg');
      card.style.setProperty('--rotate-y', '0deg');
      card.style.setProperty('--shadow-x', `0px`);
      card.style.setProperty('--shadow-y', `0px`);
    };
    
    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
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
    if (minutes < 1) return 'ממש עכשיו';
    if (minutes < 60) return `לפני ${minutes} ד'`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `לפני ${hours} ש'`;
    
    const days = Math.floor(hours / 24);
    return `לפני ${days} י'`;
  };

  return (
    <div
      ref={cardRef}
      onContextMenu={handleContextMenu}
      className={`group relative glass-card rounded-xl p-4 shadow-lg transition-all duration-500 ease-out 
        transform-gpu [transform-style:preserve-3d] [perspective:1000px]
        ${item.is_read ? 'opacity-50 hover:opacity-100' : 'opacity-100'} 
        ${isMounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95'}`}
      style={{ 
          transition: 'box-shadow 0.3s, border-color 0.3s, transform 0.1s linear, opacity 0.5s, transform 0.5s',
          transitionDelay: `${index * 50}ms`,
          transform: 'rotateX(var(--rotate-x, 0)) rotateY(var(--rotate-y, 0))'
      }}
    >
      <div className="absolute inset-0 rounded-xl [transform:translateZ(-1px)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
           style={{ background: `radial-gradient(400px circle at var(--glow-x) var(--glow-y), var(--glow-color-blue), transparent)`}}>
      </div>
       <div className="absolute inset-0 rounded-xl" style={{ boxShadow: 'inset var(--shadow-x) var(--shadow-y) 30px rgba(0,0,0,0.5)' }}></div>

      <div className="[transform-style:preserve-3d]">
          <div className="flex justify-between items-start [transform:translateZ(20px)]">
            <div className="flex-1 pr-4">
              <h3 className="text-lg font-semibold text-gray-100 [transform:translateZ(10px)]">{item.title}</h3>
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.summary_ai || item.content}</p>
            </div>
            <button
              onClick={() => onToggleRead(item.id)}
              className="text-gray-500 hover:text-blue-400 transition-colors z-10"
              aria-label={item.is_read ? 'סמן כלא נקרא' : 'סמן כנקרא'}
            >
              {item.is_read ? <ReadIcon className="h-6 w-6" /> : <UnreadIcon className="h-6 w-6" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500 [transform:translateZ(10px)]">
             <div className="flex flex-wrap gap-2">
                {item.tags.map((tag: Tag) => (
                    <span key={tag.id} className="bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                        {tag.name}
                    </span>
                ))}
            </div>
            <span>{getRelativeTime(item.createdAt)}</span>
          </div>
      </div>
    </div>
  );
};

export default React.memo(FeedCard);