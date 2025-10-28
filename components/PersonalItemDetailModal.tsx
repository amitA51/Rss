import React, { useState } from 'react';
import type { PersonalItem } from '../types';
import { CloseIcon, DumbbellIcon, SummarizeIcon, ClipboardListIcon, LinkIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';

interface PersonalItemDetailModalProps {
  item: PersonalItem | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
}

const PersonalItemDetailModal: React.FC<PersonalItemDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 400);
  };

  if (!item) return null;

  const handleChecklistToggle = (lineIndex: number) => {
      if (item.type !== 'note') return;
      const lines = item.content.split('\n');
      const line = lines[lineIndex];
      if (line.startsWith('[ ] ')) {
          lines[lineIndex] = line.replace('[ ] ', '[x] ');
      } else if (line.startsWith('[x] ')) {
          lines[lineIndex] = line.replace('[x] ', '[ ] ');
      }
      onUpdate(item.id, { content: lines.join('\n') });
  };
  
  const getIcon = () => {
    switch (item.type) {
      case 'workout': return <DumbbellIcon className="h-6 w-6 text-blue-400" />;
      case 'learning': return <SummarizeIcon className="h-6 w-6 text-purple-400" />;
      case 'note': return <ClipboardListIcon className="h-6 w-6 text-yellow-400" />;
      case 'link': return <LinkIcon className="h-6 w-6 text-green-400" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: 'to-learn' | 'learning' | 'learned' | undefined) => {
    switch (status) {
      case 'to-learn': return <span className="text-xs bg-gray-600 text-gray-200 px-2 py-0.5 rounded-full">ללמוד</span>;
      case 'learning': return <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">לומד</span>;
      case 'learned': return <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">נלמד</span>;
      default: return null;
    }
  };

  const renderContent = () => {
    switch (item.type) {
        case 'workout':
            return (
                <div>
                    {item.exercises && item.exercises.length > 0 && (
                        <div className="space-y-4">
                            {item.exercises.map((ex) => (
                                <div key={ex.id}>
                                    <h4 className="font-semibold text-gray-200 mb-2">{ex.name}</h4>
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-400 uppercase">
                                            <tr>
                                                <th className="py-2 px-2 w-1/3">סט</th>
                                                <th className="py-2 px-2 w-1/3 text-center">חזרות</th>
                                                <th className="py-2 px-2 w-1/3 text-center">משקל (ק"ג)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-gray-800/50 rounded-lg">
                                            {ex.sets.map((set, index) => (
                                                <tr key={index} className="border-b border-gray-700/50 last:border-b-0">
                                                    <td className="py-2 px-2 font-medium text-gray-300">{index + 1}</td>
                                                    <td className="py-2 px-2 text-center">{set.reps}</td>
                                                    <td className="py-2 px-2 text-center">{set.weight}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}
                     {item.content && <div className="mt-6 border-t border-[var(--border-color)] pt-4"><h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">הערות</h4><p className="text-gray-300 whitespace-pre-wrap">{item.content}</p></div>}
                </div>
            );
        case 'learning':
            return (
                <div className="space-y-6">
                    {item.metadata?.source && (
                        <div>
                             <h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">מקור</h4>
                             <a href={item.metadata.source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors">
                                <LinkIcon className="h-4 w-4"/>
                                <span>{item.metadata.source}</span>
                             </a>
                        </div>
                    )}
                    {item.content && (
                        <div>
                            <h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">סיכום אישי</h4>
                            <p className="text-gray-300 whitespace-pre-wrap">{item.content}</p>
                        </div>
                    )}
                    {item.metadata?.key_takeaways && item.metadata.key_takeaways.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">תובנות מרכזיות</h4>
                            <ul className="list-disc list-inside text-gray-300 space-y-1 pl-2">
                                {item.metadata.key_takeaways.map((takeaway, i) => <li key={i}>{takeaway}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            );
        case 'note':
            return (
                <div>
                  {item.content.split('\n').map((line, index) => {
                    const isTodo = line.trim().startsWith('[ ] ');
                    const isDone = line.trim().startsWith('[x] ');
                    if (isTodo || isDone) {
                        return (
                            <div key={index} className="flex items-center gap-3 my-1">
                                <input 
                                    type="checkbox" 
                                    checked={isDone}
                                    onChange={() => handleChecklistToggle(index)}
                                    className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-600 cursor-pointer"
                                />
                                <label className={`flex-1 ${isDone ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{line.substring(4)}</label>
                            </div>
                        )
                    }
                    return <p key={index} className="text-gray-300 whitespace-pre-wrap">{line}</p>
                  })}
                </div>
            );
         case 'link':
            return (
                 <div className="space-y-6">
                    {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-lg bg-gray-800" />
                    )}
                    <div>
                        <h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">סיכום AI</h4>
                        <p className="text-gray-300 whitespace-pre-wrap">{item.content}</p>
                    </div>
                </div>
            );
        default: return <p className="text-gray-300 whitespace-pre-wrap">{item.content}</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={handleClose}>
      <div 
        className={`bg-gray-900/80 backdrop-blur-xl w-full max-w-2xl max-h-[90vh] rounded-t-2xl shadow-lg flex flex-col border-t border-blue-500/30 ${isClosing ? 'animate-slide-down-out' : 'animate-slide-up'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        `}</style>
        <header className="p-4 border-b border-[var(--border-color)] flex justify-between items-center sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 overflow-hidden">
              {getIcon()}
              <h2 className="text-xl font-bold text-gray-100 truncate pr-4">{item.title}</h2>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto flex-grow">
            <div className="flex items-center gap-4 mb-6">
                {item.type === 'learning' && getStatusBadge(item.metadata?.status)}
                {item.type === 'workout' && item.metadata?.duration && (
                    <span className="text-sm bg-gray-700 text-gray-200 px-3 py-1 rounded-full">{item.metadata.duration} דקות</span>
                )}
            </div>
            {renderContent()}
        </div>
        
        {item.type === 'link' && item.url && (
            <footer className="p-4 border-t border-[var(--border-color)] sticky bottom-0 bg-gray-900/80 backdrop-blur-sm">
                 <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center bg-gray-700/80 hover:bg-gray-600/80 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-100 active:brightness-90"
                >
                    <LinkIcon className="h-5 w-5 ml-2" />
                    פתח קישור מקורי
                </a>
            </footer>
        )}
      </div>
    </div>
  );
};

export default PersonalItemDetailModal;