import React, { useState, useCallback, useMemo, useContext, useEffect, useRef } from 'react';
import type { FeedItem, RssFeed, Space } from '../types';
import type { Screen, FeedViewMode } from '../types';
import FeedCardV2 from '../components/FeedCardV2';
import ItemDetailModal from '../components/ItemDetailModal';
import SynthesisModal from '../components/SynthesisModal';
import SkeletonLoader from '../components/SkeletonLoader';
import ContextMenu from '../components/ContextMenu';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';
import { summarizeItemContent, synthesizeContent } from '../services/geminiService';
import * as dataService from '../services/dataService';
import { RefreshIcon, FeedIcon, CloseIcon, SettingsIcon, SparklesIcon, CheckCheckIcon, VisualModeIcon, ListIcon, BookOpenIcon, TrashIcon } from '../components/icons';
import { AppContext } from '../state/AppContext';
import { useContextMenu } from '../hooks/useContextMenu';
import KnowledgeGraph from '../components/KnowledgeGraph';
import { useHaptics } from '../hooks/useHaptics';

// --- New Batch Action Bar Component ---
const BatchActionBar: React.FC<{
  count: number;
  onCancel: () => void;
  onDelete: () => void;
  onMarkRead: () => void;
  onAddToLibrary: () => void;
}> = ({ count, onCancel, onDelete, onMarkRead, onAddToLibrary }) => {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-20 right-0 left-0 z-40 p-2 animate-slide-up-in">
      <div className="max-w-md mx-auto bg-[var(--bg-card)]/80 backdrop-blur-xl border border-[var(--border-primary)] rounded-2xl shadow-2xl p-2 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <CloseIcon className="w-6 h-6 text-white"/>
            </button>
            <span className="font-bold text-white">{count} נבחרו</span>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={onMarkRead} className="p-3 rounded-full hover:bg-white/10 transition-colors text-gray-300" title="סמן כנקרא/לא נקרא">
                <CheckCheckIcon className="w-6 h-6"/>
            </button>
            <button onClick={onAddToLibrary} className="p-3 rounded-full hover:bg-white/10 transition-colors text-gray-300" title="הוסף לספרייה">
                <BookOpenIcon className="w-6 h-6"/>
            </button>
            <button onClick={onDelete} className="p-3 rounded-full hover:bg-red-500/10 transition-colors text-red-400" title="מחק">
                <TrashIcon className="w-6 h-6"/>
            </button>
        </div>
      </div>
    </div>
  );
};


interface FeedScreenProps {
    setActiveScreen: (screen: Screen) => void;
}

const FilterButton: React.FC<{
  label: string;
  onClick: () => void;
  isActive: boolean;
}> = ({ label, onClick, isActive }) => (
  <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-full transition-all shrink-0 transform hover:scale-105 active:scale-95 font-medium ${
          isActive
          ? 'bg-[var(--accent-gradient)] text-white shadow-[0_0_15px_var(--dynamic-accent-glow)]' 
          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white'
      }`}
  >
      {label}
  </button>
);

const FeedScreen: React.FC<FeedScreenProps> = ({ setActiveScreen }) => {
  const { state, dispatch } = useContext(AppContext);
  const { feedItems, spaces, isLoading, settings } = state;
  const { feedViewMode } = settings;
  const headerRef = useRef<HTMLElement>(null);
  const { triggerHaptic } = useHaptics();
  
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all'); // Can be 'all', 'sparks', or a spaceId
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number, onUndo?: () => Promise<void> | void} | null>(null);

  // --- State for Batch Actions ---
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu<FeedItem>();

  const feedSpaces = useMemo(() => spaces.filter(s => s.type === 'feed'), [spaces]);
  
  const [rssFeeds, setRssFeeds] = useState<RssFeed[]>([]);
  useEffect(() => {
    const fetchFeeds = async () => {
        const feeds = await dataService.getFeeds();
        setRssFeeds(feeds);
    }
    fetchFeeds();
  }, []);


  // Fi Principle: Parallax Header for Immersive Depth
  useEffect(() => {
    const handleScroll = () => {
        if (headerRef.current) {
            const scrollY = window.scrollY;
            const translateY = Math.min(scrollY * 0.5, 150);
            headerRef.current.style.transform = `translateY(-${translateY}px)`;
            headerRef.current.style.opacity = `${Math.max(1 - scrollY / 200, 0)}`;
        }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
}, []);


  const showStatus = (type: StatusMessageType, text: string, onUndo?: () => Promise<void> | void) => {
    setStatusMessage({ type, text, id: Date.now(), onUndo });
  };
  
  const handleSetViewMode = (mode: FeedViewMode) => {
    dispatch({ type: 'SET_FEED_VIEW_MODE', payload: mode });
  };

  const handleSelectItem = useCallback((item: FeedItem, event?: React.MouseEvent) => {
    if (selectionMode) {
        event?.stopPropagation();
        const newIds = new Set(selectedIds);
        if (newIds.has(item.id)) {
            newIds.delete(item.id);
        } else {
            newIds.add(item.id);
        }
        setSelectedIds(newIds);
        if (newIds.size === 0) {
            setSelectionMode(false);
        }
    } else {
       event?.stopPropagation();
       setSelectedItem(item);
    }
  }, [selectionMode, selectedIds]);
  
  const handleUpdateItem = useCallback(async (id: string, updates: Partial<FeedItem>) => {
    const originalItem = feedItems.find(item => item.id === id);
    if (!originalItem) return;

    // Optimistic UI update
    dispatch({ type: 'UPDATE_FEED_ITEM', payload: { id, updates } });
    if (selectedItem?.id === id) {
        setSelectedItem(prev => prev ? { ...prev, ...updates } : null);
    }

    try {
        await dataService.updateFeedItem(id, updates);
    } catch (error) {
        console.error("Failed to update item:", error);
        // Rollback on failure
        dispatch({ type: 'UPDATE_FEED_ITEM', payload: { id, updates: originalItem } });
        if (selectedItem?.id === id) {
            setSelectedItem(originalItem);
        }
        showStatus('error', 'שגיאה בעדכון הפריט.');
    }
  }, [dispatch, selectedItem, feedItems]);

  const handleRefresh = useCallback(async (isAutoRefresh = false) => {
    if (isRefreshing) return;
    if (!isAutoRefresh) window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsRefreshing(true);
    try {
      const newItems = await dataService.refreshAllFeeds();
      
      const allItems = await dataService.getFeedItems();
      const allPersonalItems = await dataService.getPersonalItems();
      const allSpaces = await dataService.getSpaces();

      dispatch({ type: 'SET_ALL_DATA', payload: { feedItems: allItems, personalItems: allPersonalItems, spaces: allSpaces } });
      
      if (!isAutoRefresh) {
          if (newItems.length > 0) {
            showStatus('success', `נוספו ${newItems.length} פריטים חדשים.`);
          } else {
            showStatus('success', 'הפיד שלך עדכני.');
          }
      }
    } catch (error) {
      console.error("Error refreshing feed:", error);
       if (!isAutoRefresh) {
           showStatus('error', "שגיאה בעת רענון הפידים.");
       }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, dispatch]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleRefresh]);
  
  const handleToggleRead = useCallback((id: string, forceStatus?: boolean) => {
    const currentItem = feedItems.find(item => item.id === id);
    if (!currentItem) return;
    const newReadStatus = forceStatus !== undefined ? forceStatus : !currentItem.is_read;
    handleUpdateItem(id, { is_read: newReadStatus });
  }, [feedItems, handleUpdateItem]);

  const handleSummarize = useCallback(async (itemToSummarize: FeedItem) => {
      if (!itemToSummarize || isSummarizing) return;
      setIsSummarizing(itemToSummarize.id);
      try {
          const summary = await summarizeItemContent(itemToSummarize.content);
          await handleUpdateItem(itemToSummarize.id, { summary_ai: summary });
      } catch (error) {
          console.error("Failed to summarize:", error);
          showStatus("error", "שגיאה בעת ניסיון הסיכום.");
      } finally {
          setIsSummarizing(null);
      }
  }, [isSummarizing, handleUpdateItem]);
  
  const handleDeleteItem = useCallback(async (id: string) => {
    const itemToDelete = feedItems.find(item => item.id === id);
    if (!itemToDelete) return;
    
    triggerHaptic('medium');
    
    await dataService.removeFeedItem(id);
    dispatch({ type: 'REMOVE_FEED_ITEM', payload: id });

    showStatus('success', 'הפריט נמחק.', async () => {
        // This is the UNDO action
        // FIX: Added `await` to the async undo action to ensure it completes before potential subsequent actions.
        await dataService.reAddFeedItem(itemToDelete); // Re-add the item
        dispatch({ type: 'ADD_FEED_ITEM', payload: itemToDelete });
    });

  }, [feedItems, dispatch, triggerHaptic]);

  const handleDeleteWithConfirmation = useCallback((id: string) => {
    const itemToDelete = feedItems.find(item => item.id === id);
    if (itemToDelete && window.confirm(`האם למחוק את "${itemToDelete.title}"?`)) {
        handleDeleteItem(id);
        setSelectedItem(null); // Close modal
    }
  }, [feedItems, handleDeleteItem]);

  const handleAddToLibrary = useCallback((item: FeedItem) => {
    try {
        const newPersonalItemPromise = dataService.convertFeedItemToPersonalItem(item);
        newPersonalItemPromise.then(newPersonalItem => {
            dispatch({ type: 'ADD_PERSONAL_ITEM', payload: newPersonalItem });
            handleToggleRead(item.id, true);
            showStatus('success', 'הפריט הוסף לספרייה');
        });
    } catch (error) {
        console.error("Failed to add to library:", error);
        showStatus('error', 'שגיאה בהוספה לספרייה');
    }
  }, [dispatch, handleToggleRead]);

  // --- Batch Action Handlers ---
    const handleLongPress = (item: FeedItem) => {
        // Fi Principle: Holistic Feedback
        triggerHaptic('medium');
        setSelectionMode(true);
        setSelectedIds(new Set([item.id]));
    };
    
    const handleBatchCancel = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handleBatchMarkRead = () => {
        const itemsToUpdate = Array.from(selectedIds).map(id => feedItems.find(item => item.id === id)).filter(Boolean) as FeedItem[];
        // If any selected item is unread, mark all as read. Otherwise, mark all as unread.
        const shouldMarkAsRead = itemsToUpdate.some(item => !item.is_read);
        itemsToUpdate.forEach(item => handleUpdateItem(item.id, { is_read: shouldMarkAsRead }));
        handleBatchCancel();
    };
    
    const handleBatchAddToLibrary = () => {
        const itemsToAdd = Array.from(selectedIds).map(id => feedItems.find(item => item.id === id)).filter(Boolean) as FeedItem[];
        itemsToAdd.forEach(handleAddToLibrary);
        handleBatchCancel();
    };

    const handleBatchDelete = async () => {
        const itemsToDelete = Array.from(selectedIds).map(id => feedItems.find(item => item.id === id)).filter(Boolean) as FeedItem[];
        
        triggerHaptic('heavy');

        // Optimistically update the UI
        itemsToDelete.forEach(item => {
             dispatch({ type: 'REMOVE_FEED_ITEM', payload: item.id });
        });
        
        // Perform the async deletions
        try {
            await Promise.all(itemsToDelete.map(item => dataService.removeFeedItem(item.id)));
            showStatus('success', `${itemsToDelete.length} פריטים נמחקו.`);
        } catch (error) {
            console.error('Batch delete failed:', error);
            showStatus('error', 'שגיאה במחיקת הפריטים.');
            // Here you might want to add logic to revert the optimistic UI update
        }

        handleBatchCancel();
    };
  
  const filteredItems = useMemo(() => {
    let items = feedItems;
    if (filter === 'sparks') {
        items = items.filter(item => item.type === 'spark');
    } else if (filter !== 'all') {
        const feedIdsInSpace = new Set(rssFeeds.filter(f => f.spaceId === filter).map(f => f.id));
        items = items.filter(item => item.type === 'rss' && item.source && feedIdsInSpace.has(item.source));
    }
    
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [feedItems, filter, rssFeeds]);

  const handleMarkAllRead = () => {
    const unreadInFilter = filteredItems.filter(item => !item.is_read);
    if (unreadInFilter.length === 0) {
        showStatus('success', 'אין פריטים חדשים לסמן.');
        return;
    }

    unreadInFilter.forEach(item => {
        handleUpdateItem(item.id, { is_read: true });
    });
    showStatus('success', `${unreadInFilter.length} פריטים סומנו כנקראו.`);
  };

  return (
    <div className={`pt-4 ${selectionMode ? 'selection-mode' : ''}`}>
      <header ref={headerRef} className="flex justify-between items-center mb-6 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20 border-b border-[var(--border-primary)] -mx-4 px-4 transition-transform,opacity duration-300">
        <h1 className="hero-title themed-title">{settings.screenLabels?.feed || 'פיד'}</h1>
        <div className="flex items-center gap-2">
            <button
                onClick={() => handleSetViewMode(feedViewMode === 'list' ? 'visual' : 'list')}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors"
                aria-label="שנה תצוגה"
            >
              {feedViewMode === 'list' ? <VisualModeIcon className="h-6 w-6" /> : <ListIcon className="h-6 w-6" />}
            </button>
            <button
                onClick={() => handleRefresh(false)}
                disabled={isRefreshing || isLoading}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                aria-label="רענן"
            >
              <RefreshIcon className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
                onClick={handleMarkAllRead}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors"
                aria-label="סמן הכל כנקרא"
            >
                <CheckCheckIcon className="h-6 w-6" />
            </button>
             <button 
                onClick={() => setActiveScreen('settings')}
                className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors"
                aria-label="הגדרות"
            >
                <SettingsIcon className="w-6 w-6"/>
            </button>
        </div>
      </header>

      {/* Fi Principle: Wrapper for Immersive Depth Effect */}
      <div className={`transition-all duration-500 ${!!selectedItem ? 'receding-background' : ''}`}>
        {feedViewMode === 'visual' ? (
          <KnowledgeGraph items={feedItems} onSelectItem={handleSelectItem} />
        ) : (
          <>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4" style={{'scrollbarWidth': 'none'}}>
              <FilterButton label="הכל" onClick={() => setFilter('all')} isActive={filter === 'all'} />
              <FilterButton label="ספארקים" onClick={() => setFilter('sparks')} isActive={filter === 'sparks'}/>
              {feedSpaces.map(space => (
                <FilterButton key={space.id} label={space.name} onClick={() => setFilter(space.id)} isActive={filter === space.id} />
              ))}
            </div>
            
            {isLoading && feedItems.length === 0 ? (
              <SkeletonLoader />
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item, index) => (
                  <div key={item.id} className="animate-item-enter-fi" style={{ animationDelay: `${index * 50}ms` }}>
                    <FeedCardV2
                      item={item}
                      index={index}
                      onSelect={handleSelectItem}
                      onLongPress={handleLongPress}
                      onContextMenu={handleContextMenu}
                      isInSelectionMode={selectionMode}
                      isSelected={selectedIds.has(item.id)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && filteredItems.length === 0 &&
              <div className="text-center text-[var(--text-secondary)] mt-16 flex flex-col items-center">
                  <FeedIcon className="w-16 h-16 text-gray-700 mb-4"/>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                      {feedItems.length > 0 ? "אין פריטים כאן" : "הפיד שלך ריק"}
                  </h2>
                  <p className="max-w-xs text-sm mb-6">
                      {feedItems.length > 0 ? "נסה לבחור סינון אחר או לרענן את הפידים שלך." : "לחץ על כפתור הרענון כדי למשוך תוכן חדש מהמקורות שהגדרת."}
                  </p>
                   <button
                      onClick={() => handleRefresh(false)}
                      disabled={isRefreshing || isLoading}
                      className="bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-6 rounded-2xl transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50 hover:shadow-[0_0_15px_var(--dynamic-accent-glow)]"
                  >
                    <RefreshIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>רענן פידים</span>
                  </button>
              </div>
            }
          </>
        )}
      </div>
      
      <ItemDetailModal 
        item={selectedItem}
        onSelectItem={(item) => setSelectedItem(item)}
        onClose={() => setSelectedItem(null)}
        onSummarize={handleSummarize}
        onUpdate={handleUpdateItem}
        onDelete={handleDeleteWithConfirmation}
        isSummarizing={!!isSummarizing}
      />
      <SynthesisModal
        isLoading={isSynthesizing}
        synthesisResult={synthesisResult}
        onClose={() => { setIsSynthesizing(false); setSynthesisResult(null); }}
      />
      {contextMenu.isOpen && contextMenu.item && !selectionMode && (
          <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              item={contextMenu.item}
              onClose={closeContextMenu}
              onToggleRead={() => handleToggleRead(contextMenu.item!.id)}
              onSummarize={() => handleSummarize(contextMenu.item!)}
              onDelete={handleDeleteItem}
              onAddToLibrary={handleAddToLibrary}
          />
      )}
      {selectionMode && (
        <BatchActionBar 
            count={selectedIds.size}
            onCancel={handleBatchCancel}
            onMarkRead={handleBatchMarkRead}
            onAddToLibrary={handleBatchAddToLibrary}
            onDelete={handleBatchDelete}
        />
      )}
      {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
    </div>
  );
};

export default FeedScreen;