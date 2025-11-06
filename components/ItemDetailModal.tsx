import React, { useState, useEffect, useContext, useRef } from 'react';
import type { FeedItem, Attachment } from '../types';
import { SummarizeIcon, CloseIcon, LinkIcon, StarIcon, getFileIcon } from './icons';
import { findRelatedItems } from '../services/geminiService';
import { AppContext } from '../state/AppContext';

interface ItemDetailModalProps {
  item: FeedItem | null;
  onSelectItem: (item: FeedItem) => void;
  onClose: () => void;
  onSummarize: (item: FeedItem) => void;
  onUpdate: (id: string, updates: Partial<FeedItem>) => void;
  isSummarizing: boolean;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onSelectItem, onClose, onSummarize, onUpdate, isSummarizing }) => {
  const { state } = useContext(AppContext);
  const [relatedItems, setRelatedItems] = useState<FeedItem[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (item) {
        setIsClosing(false);
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

  // --- Accessibility: Focus Trap ---
  useEffect(() => {
    if (item && modalRef.current) {
      triggerRef.current = document.activeElement as HTMLElement;
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      firstElement?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };

      const modal = modalRef.current;
      modal.addEventListener('keydown', handleKeyDown);
      return () => {
        modal.removeEventListener('keydown', handleKeyDown);
        triggerRef.current?.focus();
      };
    }
  }, [item]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 400); // Wait for animation to finish
  };
  
  const handleToggleImportant = () => {
    if (item) {
        onUpdate(item.id, { isImportant: !item.isImportant });
    }
  };


  if (!item) return null;

  const modalBgClass = state.settings.themeSettings.cardStyle === 'glass' ? 'glass-modal-bg' : 'bg-[var(--bg-secondary)]';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={handleClose}>
      <div 
        ref={modalRef}
        className={`${modalBgClass} w-full max-w-2xl max-h-[90vh] rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] ${isClosing ? 'animate-slide-down-out' : 'animate-modal-expand-in'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-detail-title"
      >
        <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 bg-transparent backdrop-blur-sm z-10">
          <h2 id="item-detail-title" className="text-xl font-bold text-[var(--text-primary)] truncate pr-4">{item.title}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleToggleImportant} className={`p-1 rounded-full transition-colors active:scale-95 ${item.isImportant ? 'text-yellow-400' : 'text-[var(--text-secondary)] hover:text-yellow-400'}`}>
                <StarIcon filled={!!item.isImportant} className="h-6 w-6" />
            </button>
            <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 rounded-full active:scale-95">
                <CloseIcon className="h-6 w-6" />
            </button>
          </div>
        </header>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {item.summary_ai && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">סיכום AI</h3>
              <p className="text-[var(--text-primary)] whitespace-pre-wrap prose prose-invert prose-sm max-w-none">{item.summary_ai}</p>
            </div>
          )}
          <div className={`${item.summary_ai ? 'border-t border-[var(--border-primary)] pt-6' : ''}`}>
            <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">תוכן מלא</h3>
            <p className="text-[var(--text-primary)] whitespace-pre-wrap">{item.content}</p>
          </div>
          
          {item.attachments && item.attachments.length > 0 && (
            <div className="border-t border-[var(--border-primary)] pt-6 mt-6">
              <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-3 uppercase tracking-wider">קבצים מצורפים</h3>
              <div className="space-y-2">
                {item.attachments.map((file, index) => (
                  <a 
                    key={index} 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-3 bg-[var(--bg-card)] hover:bg-white/5 p-3 rounded-xl transition-all border border-[var(--border-primary)] hover:border-[var(--dynamic-accent-start)]/50 active:scale-95"
                  >
                    {getFileIcon(file.mimeType)}
                    <span className="text-[var(--text-primary)] font-medium truncate">{file.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {(isLoadingRelated || relatedItems.length > 0) && (
             <div className="border-t border-[var(--border-primary)] pt-6 mt-6">
                <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-3 uppercase tracking-wider">אולי יעניין אותך גם</h3>
                {isLoadingRelated && <p className="text-[var(--text-secondary)]">מחפש ספארקים קשורים...</p>}
                <div className="space-y-2">
                    {relatedItems.map(related => (
                        <button key={related.id} onClick={() => onSelectItem(related)} className="text-left w-full bg-[var(--bg-card)] hover:bg-white/5 p-3 rounded-xl transition-all border border-[var(--border-primary)] hover:border-[var(--dynamic-accent-start)]/50 active:scale-95">
                            <p className="font-semibold text-[var(--text-primary)] truncate">{related.title}</p>
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{related.summary_ai || related.content}</p>
                        </button>
                    ))}
                </div>
             </div>
          )}
        </div>

        <footer className="p-4 border-t border-[var(--border-primary)] sticky bottom-0 bg-transparent backdrop-blur-sm space-y-3">
            <button
                onClick={() => onSummarize(item)}
                disabled={isSummarizing || !!item.summary_ai}
                className="w-full flex items-center justify-center bg-[var(--accent-gradient)] hover:brightness-110 disabled:bg-gray-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-[var(--dynamic-accent-start)]/30"
            >
                <SummarizeIcon className="h-5 w-5 ml-2" />
                {isSummarizing ? 'מסכם...' : item.summary_ai ? 'סוכם' : 'סכם עם AI'}
            </button>
            {item.type === 'rss' && item.link && (
                <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center bg-[var(--bg-card)] hover:bg-white/5 text-white font-bold py-3 px-4 rounded-xl transition-all transform active:scale-95 border border-[var(--border-primary)]"
                >
                    <LinkIcon className="h-5 w-5 ml-2" />
                    פתח מאמר מקורי
                </a>
            )}
        </footer>
      </div>
    </div>
  );
};

export default ItemDetailModal;