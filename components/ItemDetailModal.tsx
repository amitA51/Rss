import React, { useState, useEffect } from 'react';
import type { FeedItem } from '../types';
import { SummarizeIcon, CloseIcon, LinkIcon } from './icons';
import { findRelatedItems } from '../services/geminiService';

interface ItemDetailModalProps {
  item: FeedItem | null;
  allItems: FeedItem[];
  onSelectItem: (item: FeedItem) => void;
  onClose: () => void;
  onSummarize: (item: FeedItem) => void;
  isSummarizing: boolean;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, allItems, onSelectItem, onClose, onSummarize, isSummarizing }) => {
  const [relatedItems, setRelatedItems] = useState<FeedItem[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  useEffect(() => {
    if (item) {
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

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-t-2xl shadow-lg flex flex-col transform animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .animate-slide-up { animation: slide-up 0.3s ease-out; }
        `}</style>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-gray-100 truncate pr-4">{item.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {item.summary_ai && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">סיכום AI</h3>
              <p className="text-gray-300 whitespace-pre-wrap prose prose-invert prose-sm max-w-none">{item.summary_ai}</p>
            </div>
          )}
          <div className={`${item.summary_ai ? 'border-t border-gray-800 pt-6' : ''}`}>
            <h3 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wider">תוכן מלא</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{item.content}</p>
          </div>

          {(isLoadingRelated || relatedItems.length > 0) && (
             <div className="border-t border-gray-800 pt-6 mt-6">
                <h3 className="text-sm font-semibold text-blue-400 mb-3 uppercase tracking-wider">אולי יעניין אותך גם</h3>
                {isLoadingRelated && <p className="text-gray-500">מחפש ספארקים קשורים...</p>}
                <div className="space-y-2">
                    {relatedItems.map(related => (
                        <button key={related.id} onClick={() => onSelectItem(related)} className="text-left w-full bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition-colors">
                            <p className="font-semibold text-gray-200 truncate">{related.title}</p>
                            <p className="text-xs text-gray-400 line-clamp-1">{related.summary_ai || related.content}</p>
                        </button>
                    ))}
                </div>
             </div>
          )}
        </div>

        <footer className="p-4 border-t border-gray-800 sticky bottom-0 bg-gray-900 space-y-3">
            {item.type === 'rss' && item.link && (
                <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                    <LinkIcon className="h-5 w-5 ml-2" />
                    פתח מאמר מקורי
                </a>
            )}
            <button
                onClick={() => onSummarize(item)}
                disabled={isSummarizing || !!item.summary_ai}
                className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
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
