import React, { useState, useEffect, useContext, useRef } from 'react';
import type { FeedItem, Attachment } from '../types';
import { SummarizeIcon, CloseIcon, LinkIcon, StarIcon, getFileIcon, TrashIcon } from './icons';
import { findRelatedItems } from '../services/geminiService';
import { AppContext } from '../state/AppContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ItemDetailModalProps {
  item: FeedItem | null;
  onSelectItem: (item: FeedItem) => void;
  onClose: () => void;
  onSummarize: (item: FeedItem) => void;
  onUpdate: (id: string, updates: Partial<FeedItem>) => void;
  onDelete: (id: string) => void;
  isSummarizing: boolean;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onSelectItem, onClose, onSummarize, onUpdate, onDelete, isSummarizing }) => {
  const { state } = useContext(AppContext);
  const [relatedItems, setRelatedItems] = useState<FeedItem[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  
  useFocusTrap(modalRef, !!item);

  useEffect(() => {
    if (item) {
        const fetchRelated = async () => {
            setIsLoadingRelated(true);
            setRelatedItems([]);
            try {
                // Pass a truncated version of allItems to avoid hitting token limits
                const recentItems = state.feedItems
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 100);
                const related = await findRelatedItems(item, recentItems);
                setRelatedItems(related);
            } catch (error) {
                console.error("Failed to find related items:", error);
            } finally {
                setIsLoadingRelated(false);
            }
        };
        fetchRelated();
    }
  }, [item, state.feedItems]);


  const handleToggleImportant = () => {
    if (item) {
        onUpdate(item.id, { isImportant: !item.isImportant });
    }
  };

  const handleDelete = () => {
      if (window.confirm(`האם למחוק את "${item?.title}"?`)) {
          onDelete(item!.id);
      }
  };


  if (!item) return null;

  const modalBgClass = state.settings.themeSettings.cardStyle === 'glass' ? 'glass-modal-bg' : 'bg-[var(--bg-secondary)]';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={onClose}>
      <div 
        ref={modalRef}
        className={`${modalBgClass} w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)]`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-detail-title"
        style={{ viewTransitionName: `feed-item-${item.id}` }}
      >
        <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 bg-transparent backdrop-blur-sm z-10 rounded-t-3xl">
          <div className="flex items-center gap-3 overflow-hidden">
            <h2 id="item-detail-title" className="text-xl font-bold text-[var(--text-primary)] truncate">{item.title}</h2>
            <button onClick={handleToggleImportant} className={`p-1 rounded-full transition-colors active:scale-95 shrink-0 ${item.isImportant ? 'text-yellow-400' : 'text-[var(--text-secondary)] hover:text-yellow-400'}`} aria-label={item.isImportant ? "הסר חשיבות" : "סמן כחשוב"}>
                <StarIcon filled={!!item.isImportant} className="h-6 w-6" />
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleDelete} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-2 rounded-full active:scale-95" aria-label="מחק פריט">
                <TrashIcon className="w-5 h-5"/>
            </button>
            <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 rounded-full active:scale-95" aria-label="סגור חלון">
                <CloseIcon className="h-6 w-6" />
            </button>
          </div>
        </header>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {item.summary_ai ? (
            <div className="prose-custom whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: item.summary_ai.replace(/\n/g, '<br />') }} />
          ) : (
            <div className="prose-custom whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: item.content.replace(/\n/g, '<br />') }} />
          )}

          {item.attachments && item.attachments.length > 0 && (
              <div className="border-t border-[var(--border-primary)] pt-6 mt-6">
                 <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-3 uppercase tracking-wider">קבצים מצורפים</h3>
                  <div className="space-y-2">
                      {item.attachments.map((file, index) => (
                          <a key={index} href={file.url} download={file.name} className="flex items-center gap-3 bg-[var(--bg-card)] hover:bg-white/5 p-3 rounded-xl transition-all border border-[var(--border-primary)] hover:border-[var(--dynamic-accent-start)]/50 active:scale-95">
                              {getFileIcon(file.mimeType)}
                              <span className="text-[var(--text-primary)] font-medium truncate">{file.name}</span>
                          </a>
                      ))}
                  </div>
              </div>
          )}

          {relatedItems.length > 0 && (
            <div className="border-t border-[var(--border-primary)] pt-6 mt-6">
              <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-3 uppercase tracking-wider">פריטים קשורים</h3>
              <div className="space-y-2">
                {relatedItems.map(related => (
                  <button key={related.id} onClick={() => onSelectItem(related)} className="w-full text-right bg-[var(--bg-card)] hover:bg-white/5 p-3 rounded-xl transition-colors border border-[var(--border-primary)] hover:border-[var(--dynamic-accent-start)]/50 active:scale-95">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{related.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{related.summary_ai || related.content}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <footer className="p-4 border-t border-[var(--border-primary)] sticky bottom-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm flex gap-2">
          {!item.summary_ai && (
            <button
              onClick={() => onSummarize(item)}
              disabled={isSummarizing}
              className="w-full flex items-center justify-center bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50"
            >
              <SummarizeIcon className="h-5 w-5 ml-2" />
              {isSummarizing ? "מסכם..." : "סכם עם AI"}
            </button>
          )}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              <LinkIcon className="h-5 w-5 ml-2" />
              פתח מקור
            </a>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ItemDetailModal;