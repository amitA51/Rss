import React, { useState } from 'react';
import type { PersonalItem } from '../types';
import { CloseIcon, DumbbellIcon, SummarizeIcon, ClipboardListIcon, LinkIcon, CheckCircleIcon, FlameIcon, TargetIcon, BookOpenIcon, TrashIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';

interface PersonalItemDetailModalProps {
  item: PersonalItem | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
}

const PersonalItemDetailModal: React.FC<PersonalItemDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [currentPageInput, setCurrentPageInput] = useState(item?.currentPage?.toString() || '');
  const [newQuote, setNewQuote] = useState('');

  React.useEffect(() => {
    if (item) {
        setCurrentPageInput(item.currentPage?.toString() || '0');
    }
  }, [item]);


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

  const handleUpdateCurrentPage = () => {
      const page = parseInt(currentPageInput, 10);
      if (!isNaN(page) && item) {
          onUpdate(item.id, { currentPage: page });
      }
  };
  
  const handleAddQuote = () => {
      if (newQuote.trim() && item) {
          const updatedQuotes = [...(item.quotes || []), newQuote.trim()];
          onUpdate(item.id, { quotes: updatedQuotes });
          setNewQuote('');
      }
  };

  const handleRemoveQuote = (index: number) => {
      if(item) {
        const updatedQuotes = item.quotes?.filter((_, i) => i !== index) || [];
        onUpdate(item.id, { quotes: updatedQuotes });
      }
  };
  
  const getIcon = () => {
    switch (item.type) {
      case 'workout': return <DumbbellIcon className="h-6 w-6 text-blue-400" />;
      case 'learning': return <SummarizeIcon className="h-6 w-6 text-purple-400" />;
      case 'note': return <ClipboardListIcon className="h-6 w-6 text-yellow-400" />;
      case 'link': return <LinkIcon className="h-6 w-6 text-green-400" />;
      case 'task': return <CheckCircleIcon className="h-6 w-6 text-indigo-400" />;
      case 'habit': return <FlameIcon className="h-6 w-6 text-orange-400" />;
      case 'goal': return <TargetIcon className="h-6 w-6 text-red-400" />;
      case 'journal': return <BookOpenIcon className="h-6 w-6 text-teal-400" />;
      case 'book': return <BookOpenIcon className="h-6 w-6 text-orange-400" />;
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
        case 'book':
            const progress = (item.totalPages && item.currentPage) ? Math.round((item.currentPage / item.totalPages) * 100) : 0;
            return (
                 <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">התקדמות</h4>
                         <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                            <div className="bg-orange-400 h-2.5 rounded-full" style={{width: `${progress}%`}}></div>
                        </div>
                        <div className="flex items-center gap-2">
                           <input type="number" value={currentPageInput} onChange={e => setCurrentPageInput(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-md p-2 w-24 text-center"/>
                           <span className="text-gray-400">/ {item.totalPages} עמודים</span>
                           <button onClick={handleUpdateCurrentPage} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold">עדכן</button>
                        </div>
                    </div>
                     {item.content && (
                        <div>
                            <h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">תקציר / הערות</h4>
                            <p className="text-gray-300 whitespace-pre-wrap">{item.content}</p>
                        </div>
                     )}
                     <div>
                        <h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">ציטוטים</h4>
                        <div className="space-y-2">
                            {item.quotes && item.quotes.map((quote, index) => (
                                <div key={index} className="group flex items-start gap-2 bg-gray-800/50 p-3 rounded-md">
                                    <p className="flex-1 text-gray-300 italic">"{quote}"</p>
                                    <button onClick={() => handleRemoveQuote(index)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                             <div className="flex items-center gap-2 pt-2">
                                <textarea value={newQuote} onChange={e => setNewQuote(e.target.value)} placeholder="הוסף ציטוט חדש..." rows={2} className="flex-1 bg-gray-800 border border-gray-700 rounded-md p-2"/>
                                <button onClick={handleAddQuote} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold self-stretch">הוסף</button>
                            </div>
                        </div>
                     </div>
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
                        <h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">סיכום</h4>
                        <p className="text-gray-300 whitespace-pre-wrap">{item.content}</p>
                    </div>
                </div>
            );
        case 'task':
            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className={`px-3 py-1 text-sm rounded-full ${item.isCompleted ? 'bg-green-600' : 'bg-gray-600'} text-white`}>{item.isCompleted ? 'הושלם' : 'לביצוע'}</span>
                        <span className={`capitalize px-3 py-1 text-sm rounded-full bg-gray-700 text-gray-200`}>עדיפות: {item.priority === 'low' ? 'נמוכה' : item.priority === 'medium' ? 'בינונית' : 'גבוהה'}</span>
                         {item.dueDate && <span className="px-3 py-1 text-sm rounded-full bg-gray-700 text-gray-200">תאריך יעד: {new Date(item.dueDate).toLocaleDateString('he-IL')}</span>}
                    </div>
                    {item.content && <div className="mt-6 border-t border-[var(--border-color)] pt-4"><h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">הערות</h4><p className="text-gray-300 whitespace-pre-wrap">{item.content}</p></div>}
                </div>
            );
        case 'habit':
             return (
                <div className="space-y-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="px-3 py-1 text-sm rounded-full bg-gray-700 text-gray-200">רצף נוכחי: {item.streak || 0} ימים</span>
                        <span className="px-3 py-1 text-sm rounded-full bg-gray-700 text-gray-200">תדירות: {item.frequency === 'daily' ? 'יומי' : 'שבועי'}</span>
                    </div>
                    {item.lastCompleted && <p className="text-gray-300"><strong>הושלם לאחרונה:</strong> {new Date(item.lastCompleted).toLocaleString('he-IL')}</p>}
                    {item.content && <div className="mt-6 border-t border-[var(--border-color)] pt-4"><h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">תיאור</h4><p className="text-gray-300 whitespace-pre-wrap">{item.content}</p></div>}
                </div>
            );
        case 'goal':
             return (
                 <div className="space-y-4">
                     {item.metadata?.targetDate && <p className="text-gray-300"><strong>תאריך יעד:</strong> {new Date(item.metadata.targetDate).toLocaleDateString('he-IL')}</p>}
                     {item.content && <MarkdownRenderer content={item.content} />}
                 </div>
             );
        case 'journal':
            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        {item.metadata?.mood && <p className="capitalize px-3 py-1 text-sm rounded-full bg-gray-700 text-gray-200"><strong>מצב רוח:</strong> {item.metadata.mood}</p>}
                    </div>
                    <div className="prose-custom whitespace-pre-wrap border-t border-[var(--border-color)] pt-4 mt-4">
                        <MarkdownRenderer content={item.content} />
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
              <div className="flex flex-col overflow-hidden">
                <h2 className="text-xl font-bold text-gray-100 truncate">{item.title}</h2>
                {item.type === 'book' && <p className="text-sm text-gray-400 truncate">{item.author}</p>}
              </div>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-4 overflow-y-auto flex-grow">
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