import React, { useMemo } from 'react';
import type { PersonalItem } from '../types';
import { DumbbellIcon, SummarizeIcon, ClipboardListIcon, TrashIcon, LinkIcon, FileIcon, BookOpenIcon } from './icons';

interface PersonalItemCardProps {
  item: PersonalItem;
  onDelete: (id: string) => void;
  onSelect: (item: PersonalItem) => void;
}

const PersonalItemCard: React.FC<PersonalItemCardProps> = ({ item, onDelete, onSelect }) => {
  const getIcon = () => {
    switch (item.type) {
      case 'workout': return <DumbbellIcon className="h-6 w-6 text-blue-400" />;
      case 'learning': return <SummarizeIcon className="h-6 w-6 text-purple-400" />;
      case 'note': return <ClipboardListIcon className="h-6 w-6 text-yellow-400" />;
      case 'link': return <LinkIcon className="h-6 w-6 text-green-400" />;
      case 'book': return <BookOpenIcon className="h-6 w-6 text-orange-400" />;
      default: return null;
    }
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

  const getStatusBadge = (status: 'to-learn' | 'learning' | 'learned' | undefined) => {
    switch (status) {
      case 'to-learn': return <span className="text-xs bg-gray-600 text-gray-200 px-2 py-0.5 rounded-full">ללמוד</span>;
      case 'learning': return <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">לומד</span>;
      case 'learned': return <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">נלמד</span>;
      default: return null;
    }
  };

  const checklistProgress = useMemo(() => {
    if (item.type !== 'note' || !item.content) return null;
    const lines = item.content.split('\n');
    const total = lines.filter(line => line.trim().startsWith('[ ]') || line.trim().startsWith('[x]')).length;
    if (total === 0) return null;
    const completed = lines.filter(line => line.trim().startsWith('[x]')).length;
    return { completed, total };
  }, [item.content, item.type]);
  
  const renderCardContent = () => {
      if (item.type === 'link') {
          return (
              <div className="flex gap-4 items-start">
                  <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 mb-2">
                          <img src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`} alt="favicon" className="h-4 w-4 rounded-full bg-gray-700" />
                          <span className="text-xs text-gray-400 truncate">{item.domain}</span>
                      </div>
                      <h3 className="font-semibold text-gray-100 truncate">{item.title}</h3>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.content}</p>
                  </div>
                   {item.imageUrl ? (
                        <img src={item.imageUrl} alt="preview" className="w-20 h-20 object-cover rounded-lg bg-gray-800" />
                   ) : (
                       <div className="w-20 h-20 flex items-center justify-center bg-gray-800 rounded-lg">
                           <FileIcon className="w-8 h-8 text-gray-600"/>
                       </div>
                   )}
              </div>
          );
      }
      
      if (item.type === 'book') {
          const progress = (item.totalPages && item.currentPage) ? (item.currentPage / item.totalPages) * 100 : 0;
          return (
             <div className="flex justify-between items-start gap-4">
                <div className="flex-shrink-0 pt-1">{getIcon()}</div>
                <div className="flex-1 overflow-hidden">
                    <h3 className="font-semibold text-gray-100 truncate">{item.title}</h3>
                    <p className="text-sm text-gray-400 mt-1 truncate">{item.author}</p>
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>התקדמות</span>
                            <span>עמ' {item.currentPage}/{item.totalPages}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div className="bg-orange-400 h-1.5 rounded-full" style={{width: `${progress}%`}}></div>
                        </div>
                    </div>
                </div>
            </div>
          );
      }

      return (
        <div className="flex justify-between items-start gap-4">
            <div className="flex-shrink-0 pt-1">{getIcon()}</div>
            <div className="flex-1 overflow-hidden">
            <h3 className="font-semibold text-gray-100 truncate">{item.title}</h3>
            <p className="text-sm text-gray-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                {item.type === 'workout' && `${item.exercises?.length || 0} תרגילים`}
                {item.type === 'learning' && (item.metadata?.source || item.content)}
                {item.type === 'note' && (item.content.split('\n')[0])}
            </p>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <div>
                {item.type === 'workout' && item.metadata?.duration && (
                    <span className="bg-gray-700/80 px-2 py-0.5 rounded-full">{item.metadata.duration} דקות</span>
                )}
                {item.type === 'learning' && getStatusBadge(item.metadata?.status)}
                {item.type === 'note' && checklistProgress && (
                    <span className="bg-gray-700/80 px-2 py-0.5 rounded-full">{checklistProgress.completed}/{checklistProgress.total} הושלמו</span>
                )}
                </div>
                <span>{getRelativeTime(item.createdAt)}</span>
            </div>
            </div>
        </div>
      );
  }

  return (
    <div 
        className="group glass-card rounded-xl p-4 shadow-md cursor-pointer relative"
        onClick={() => onSelect(item)}
    >
      {renderCardContent()}
       <button
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          className="absolute top-2 left-2 text-gray-600 hover:text-red-400 transition-all transform hover:scale-110 flex-shrink-0"
          aria-label="מחק פריט"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
    </div>
  );
};

export default PersonalItemCard;