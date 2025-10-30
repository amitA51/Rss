import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FeedItem } from '../types';
import FeedCardV2 from '../components/FeedCardV2';
import ItemDetailModal from '../components/ItemDetailModal';
import SynthesisModal from '../components/SynthesisModal';
import KnowledgeGraph from '../components/KnowledgeGraph';
import SkeletonLoader from '../components/SkeletonLoader';
import ContextMenu from '../components/ContextMenu';
import { getFeedItems, summarizeItemContent, updateFeedItem, refreshAllFeeds, getAllItems, synthesizeContent, markAllAsRead, removeFeedItem } from '../services/geminiService';
import { RefreshIcon, BrainCircuitIcon, FeedIcon, VisualModeIcon, CheckCheckIcon } from '../components/icons';

type FilterType = 'all' | 'unread' | 'sparks' | 'rss';
type ViewMode = 'list' | 'graph';

interface ContextMenuState {
  x: number;
  y: number;
  item: FeedItem;
}

const FilterButton: React.FC<{
  label: string;
  filterType: FilterType;
  currentFilter: FilterType;
  setFilter: (filter: FilterType) => void;
}> = ({ label, filterType, currentFilter, setFilter }) => (
  <button
      onClick={() => setFilter(filterType)}
      className={`px-4 py-2 text-sm rounded-full transition-all shrink-0 transform hover:scale-105 active:scale-95 font-semibold ${
          currentFilter === filterType 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
  >
      {label}
  </button>
);

const FeedScreen: React.FC = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const isInitialLoad = useRef(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  
  const lastItemRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage((prevPage: number) => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  const loadItems = useCallback(async (isNewLoad = false) => {
    setIsLoading(true);
    try {
      const currentPage = isNewLoad ? 1 : page;
      const newItems = await getFeedItems(currentPage);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        if (isNewLoad) {
          setItems(newItems);
        } else {
          setItems(prevItems => [...prevItems, ...newItems]);
        }
        setHasMore(true);
      }
    } catch (error) {
      console.error("Error fetching feed items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page]);
  
  useEffect(() => {
    if (!isInitialLoad.current && page > 1) {
      loadItems();
    }
  }, [page, loadItems]);


  const handleRefresh = useCallback(async (isAutoRefresh = false) => {
    if (isRefreshing) return;

    if (!isAutoRefresh) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsRefreshing(true);
    
    try {
      await refreshAllFeeds();
      setPage(1);
      setHasMore(true);
      await loadItems(true);
      const allItemsFromDB = await getAllItems();
      setAllItems(allItemsFromDB);
    } catch (error) {
      console.error("Error refreshing feed:", error);
       if (!isAutoRefresh) {
           alert("שגיאה בעת רענון הפידים.");
       }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadItems]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleRefresh]);

  useEffect(() => {
    if (isInitialLoad.current) {
        isInitialLoad.current = false;
        handleRefresh(true);
    }
  }, [handleRefresh]);

  const handleSynthesizeUnread = async () => {
    const unreadItems = items.filter(item => !item.is_read);
    if (unreadItems.length === 0) {
        alert("אין פריטים שלא נקראו כדי לסנתז.");
        return;
    }
    setIsSynthesizing(true);
    setSynthesisResult(null); 
    try {
        const result = await synthesizeContent(unreadItems);
        setSynthesisResult(result);
    } catch(error) {
        console.error("Failed to synthesize:", error);
        alert("שגיאה בניסיון הסינתזה.");
        setSynthesisResult("שגיאה ביצירת הסינתזה.");
    }
  };

  const handleCloseSynthesisModal = () => {
    setSynthesisResult(null);
    setIsSynthesizing(false);
  };

  const handleToggleRead = useCallback(async (id: string, forceStatus?: boolean) => {
    const currentItem = items.find(item => item.id === id);
    if (!currentItem) return;

    const newReadStatus = forceStatus !== undefined ? forceStatus : !currentItem.is_read;

    setItems(prevItems => prevItems.map(item =>
      item.id === id ? { ...item, is_read: newReadStatus } : item
    ));

    try {
        await updateFeedItem(id, { is_read: newReadStatus });
    } catch (error) {
        console.error("Failed to update read status:", error);
        alert("שגיאה בעדכון הסטטוס.");
        setItems(prevItems => prevItems.map(item =>
            item.id === id ? { ...item, is_read: !newReadStatus } : item
        ));
    }
  }, [items]);

  const handleMarkAllRead = async () => {
      if (window.confirm("האם לסמן את כל הפריטים כנקראו?")) {
        const originalItems = [...items];
        setItems(items.map(i => ({...i, is_read: true})));
        try {
            await markAllAsRead();
        } catch(e) {
            alert("שגיאה בסימון הפריטים.");
            setItems(originalItems);
        }
      }
  };
  
  const handleSummarize = useCallback(async (itemToSummarize: FeedItem) => {
      if (!itemToSummarize || isSummarizing) return;
      setIsSummarizing(itemToSummarize.id);
      try {
          const summary = await summarizeItemContent(itemToSummarize.content);
          const updatedItem = await updateFeedItem(itemToSummarize.id, { summary_ai: summary });
          
          setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
          setAllItems(prevAll => prevAll.map(item => item.id === updatedItem.id ? updatedItem : item));

          if(selectedItem?.id === updatedItem.id) {
            setSelectedItem(updatedItem);
          }

      } catch (error) {
          console.error("Failed to summarize:", error);
          alert("שגיאה בעת ניסיון הסיכום.");
      } finally {
          setIsSummarizing(null);
      }
  }, [isSummarizing, selectedItem]);

  const handleContextMenu = (e: React.MouseEvent, item: FeedItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleDeleteItem = useCallback(async (id: string) => {
    const itemToDelete = items.find(item => item.id === id);
    if (!itemToDelete || itemToDelete.type !== 'spark') {
        alert("ניתן למחוק ספארקים בלבד.");
        return;
    }

    if (window.confirm("האם למחוק את הספארק?")) {
      const originalItems = [...items];
      setItems(items.filter(i => i.id !== id));
      try {
          await removeFeedItem(id);
      } catch(e) {
          alert("שגיאה במחיקת הספארק.");
          setItems(originalItems);
      }
    }
  }, [items]);
  
  const filteredItems = useMemo(() => {
    return items.filter(item => {
        if (filter === 'unread') return !item.is_read;
        if (filter === 'sparks') return item.type === 'spark';
        if (filter === 'rss') return item.type === 'rss';
        return true;
    });
  }, [items, filter]);

  return (
    <div className="pt-4">
      <header className="flex justify-between items-center mb-4 sticky top-0 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-md py-3 z-20 -mx-4 px-4 border-b border-[var(--border-color)]">
        <h1 className="text-3xl font-bold text-gray-100">פיד</h1>
        <div className="flex items-center gap-1">
            <button
                onClick={handleMarkAllRead}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                aria-label="סמן הכל כנקרא"
            >
                <CheckCheckIcon className="h-6 w-6"/>
            </button>
            <button
                onClick={handleSynthesizeUnread}
                disabled={isSynthesizing}
                className="p-2 rounded-full text-blue-400 hover:bg-gray-800 hover:text-blue-300 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                aria-label="סנתז פריטים שלא נקראו"
            >
                <BrainCircuitIcon className={`h-6 w-6 transition-transform ${isSynthesizing ? 'animate-pulse' : ''}`} />
            </button>
            <button
              onClick={() => handleRefresh(false)}
              disabled={isRefreshing || isLoading}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
              aria-label="רענן פיד"
            >
              <RefreshIcon className={`h-6 w-6 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
             <button
                onClick={() => setViewMode(viewMode === 'list' ? 'graph' : 'list')}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                aria-label={viewMode === 'list' ? 'הצג תצוגה חזותית' : 'הצג רשימה'}
            >
                {viewMode === 'list' ? <VisualModeIcon className="h-6 w-6" /> : <FeedIcon className="h-6 w-6" />}
            </button>
        </div>
      </header>
        
      {viewMode === 'list' ? (
        <>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4" style={{'scrollbarWidth': 'none'}}>
            <FilterButton label="הכל" filterType="all" currentFilter={filter} setFilter={setFilter} />
            <FilterButton label="לא נקרא" filterType="unread" currentFilter={filter} setFilter={setFilter} />
            <FilterButton label="ספארקים" filterType="sparks" currentFilter={filter} setFilter={setFilter} />
            <FilterButton label="RSS" filterType="rss" currentFilter={filter} setFilter={setFilter} />
          </div>
          
          {isLoading && items.length === 0 ? (
            <SkeletonLoader />
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item, index) => (
                <div key={item.id} ref={index === filteredItems.length - 1 ? lastItemRef : null}>
                    <FeedCardV2
                      item={item}
                      index={index}
                      onSelect={setSelectedItem}
                      onToggleRead={handleToggleRead}
                      onSummarize={handleSummarize}
                      isSummarizing={isSummarizing === item.id}
                      onContextMenu={handleContextMenu}
                    />
                </div>
              ))}
            </div>
          )}
          
          {isLoading && items.length > 0 && <p className="text-center text-gray-400 py-8">טוען...</p>}
          
          {!isLoading && filteredItems.length === 0 &&
            <div className="text-center text-gray-500 mt-16 flex flex-col items-center">
                <FeedIcon className="w-16 h-16 text-gray-700 mb-4"/>
                <p className="max-w-xs">
                    {items.length > 0 ? "אין פריטים התואמים לסינון זה." : "הפיד ריק. לחץ על כפתור הרענון כדי למשוך תוכן חדש."}
                </p>
            </div>
          }

          {!hasMore && items.length > 0 && <p className="text-center text-gray-500 mt-8">זה הכל בינתיים.</p>}
        </>
      ) : (
        <KnowledgeGraph items={allItems} onSelectItem={setSelectedItem} />
      )}
      
      <ItemDetailModal 
        item={selectedItem}
        allItems={allItems}
        onSelectItem={setSelectedItem}
        onClose={() => setSelectedItem(null)}
        onSummarize={handleSummarize}
        isSummarizing={!!isSummarizing}
      />
      <SynthesisModal
        isLoading={isSynthesizing}
        synthesisResult={synthesisResult}
        onClose={handleCloseSynthesisModal}
      />
      {contextMenu && (
          <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              item={contextMenu.item}
              onClose={() => setContextMenu(null)}
              onToggleRead={() => handleToggleRead(contextMenu.item.id)}
              onSummarize={() => handleSummarize(contextMenu.item)}
              onDelete={handleDeleteItem}
          />
      )}
    </div>
  );
};

export default FeedScreen;