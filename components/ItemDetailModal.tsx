import React, { useState, useEffect } from 'react';
import type { FeedItem, Attachment } from '../types';
import { SummarizeIcon, CloseIcon, LinkIcon, FileIcon, ImageIcon, PdfIcon, DocIcon } from './icons';
import { findRelatedItems } from '../services/geminiService';

interface ItemDetailModalProps {
  item: FeedItem | null;
  allItems: FeedItem[];
  onSelectItem: (item: FeedItem) => void;
  onClose: () => void;
  onSummarize: (item: FeedItem) => void;
  isSummarizing: boolean;
}

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-purple-400" />;
    if (mimeType === 'application/pdf') return <PdfIcon className="h-5 w-5 text-red-400" />;
    if (mimeType.includes('document') || mimeType.includes('msword')) return <DocIcon className="h-5 w-5 text-blue-400" />;
    return <FileIcon className="h-5 w-5 text-gray-400" />;
};

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, allItems, onSelectItem, onClose, onSummarize, isSummarizing }) => {
  const [relatedItems, setRelatedItems] = useState<FeedItem[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (item) {
        setIsClosing(false); // Reset closing state when a new item is shown
        const fetchRelated = async () => {
            setIsLoadingRelated(true);
            setRelatedItems([]);
            try {
                const related = await findRelatedItems(item, allItems);
                setRelatedItems(related);
            } catch (error) {
                console.error("Failed to find related items:", error);
            } finally {
                setIsLoadingRelated(false);
            }
        };
        fetchRelated();
    }
  }, [item, allItems]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 400); // Wait for animation to finish
  };

  if (!item) return null;

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
          <h2 className="text-xl font-bold text-gray-100 truncate pr-4">{item.title}</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-4 overflow-y-auto flex-grow">
          {item.summary_ai && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">סיכום AI</h3>
              <p className="text-gray-300 whitespace-pre-wrap prose prose-invert prose-sm max-w-none">{item.summary_ai}</p>
            </div>
          )}
          <div className={`${item.summary_ai ? 'border-t border-[var(--border-color)] pt-6' : ''}`}>
            <h3 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">תוכן מלא</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{item.content}</p>
          </div>
          
          {item.attachments && item.attachments.length > 0 && (
            <div className="border-t border-[var(--border-color)] pt-6 mt-6">
              <h3 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider">קבצים מצורפים</h3>
              <div className="space-y-2">
                {item.attachments.map((file, index) => (
                  <a 
                    key={index} 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-3 bg-gray-800/70 hover:bg-gray-700/80 p-3 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
                  >
                    {getFileIcon(file.mimeType)}
                    <span className="text-gray-200 font-medium truncate">{file.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {(isLoadingRelated || relatedItems.length > 0) && (
             <div className="border-t border-[var(--border-color)] pt-6 mt-6">
                <h3 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider">אולי יעניין אותך גם</h3>
                {isLoadingRelated && <p className="text-gray-500">מחפש ספארקים קשורים...</p>}
                <div className="space-y-2">
                    {relatedItems.map(related => (
                        <button key={related.id} onClick={() => onSelectItem(related)} className="text-left w-full bg-gray-800/70 hover:bg-gray-700/80 p-3 rounded-lg transition-colors border border-transparent hover:border-blue-500/30">
                            <p className="font-semibold text-gray-200 truncate">{related.title}</p>
                            <p className="text-xs text-gray-400 line-clamp-1">{related.summary_ai || related.content}</p>
                        </button>
                    ))}
                </div>
             </div>
          )}
        </div>

        <footer className="p-4 border-t border-[var(--border-color)] sticky bottom-0 bg-gray-900/80 backdrop-blur-sm space-y-3">
            {item.type === 'rss' && item.link && (
                <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center bg-gray-700/80 hover:bg-gray-600/80 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-100 active:brightness-90"
                >
                    <LinkIcon className="h-5 w-5 ml-2" />
                    פתח מאמר מקורי
                </a>
            )}
            <button
                onClick={() => onSummarize(item)}
                disabled={isSummarizing || !!item.summary_ai}
                className="w-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-100 active:brightness-90 shadow-lg shadow-blue-900/30"
            >
                <SummarizeIcon className="h-5 w-5 ml-2" />
                {isSummarizing ? 'מסכם...' : item.summary_ai ? 'סוכם' : 'סכם עם AI'}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default ItemDetailModal;