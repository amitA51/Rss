import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FeedItem } from '../types';
import FeedCard from '../components/FeedCard';
import ItemDetailModal from '../components/ItemDetailModal';
import SynthesisModal from '../components/SynthesisModal';
import KnowledgeGraph from '../components/KnowledgeGraph';
import SkeletonLoader from '../components/SkeletonLoader';
import { getFeedItems, summarizeItemContent, updateFeedItem, refreshAllFeeds, getAllItems, synthesizeContent } from '../services/geminiService';
import { RefreshIcon, BrainCircuitIcon, FeedIcon, VisualModeIcon } from '../components/icons';

type FilterType = 'all' | 'unread' | 'sparks' | 'rss';
type ViewMode = 'list' | 'graph';

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
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const isInitialLoad = useRef(true);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  const loadItems = useCallback(async (isInitialLoad = false) => {
    if (isLoading || (!hasMore && !isInitialLoad)) return;
    setIsLoading(true);
    try {
      const current_page = isInitialLoad ? 1 : page;
      if (isInitialLoad) {
          setItems([]);
      }
      const newItems = await getFeedItems(current_page);
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prevItems => isInitialLoad ? newItems : [...prevItems, ...newItems]);
        setPage(current_page + 1);
        setHasMore(true);
      }
    } catch (error) {
      console.error("Error fetching feed items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page]);
  
  const handleRefresh = useCallback(async (isAutoRefresh = false) => {
    if (isRefreshing || isLoading) return;

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
  }, [isRefreshing, isLoading, loadItems]);


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

  const handleToggleRead = async (id: string) => {
    const originalItems = items;
    const currentItem = items.find(item => item.id === id);
    if (!currentItem) return;

    setItems(items.map(item =>
      item.id === id ? { ...item, is_read: !item.is_read } : item
    ));

    try {
        await updateFeedItem(id, { is_read: !currentItem.is_read });
    } catch (error) {
        console.error("Failed to update read status:", error);
        alert("שגיאה בעדכון הסטטוס.");
        setItems(originalItems);
    }
  };

  const handleLongPress = (item: FeedItem) => {
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };
  
  const handleSummarize = async (itemToSummarize: FeedItem) => {
      if (!itemToSummarize || isSummarizing) return;
      setIsSummarizing(true);
      try {
          const summary = await summarizeItemContent(itemToSummarize.content);
          const updatedItem = await updateFeedItem(itemToSummarize.id, { summary_ai: summary });
          
          const newItems = items.map(item => item.id === updatedItem.id ? updatedItem : item);
          setItems(newItems);
          const newAllItems = allItems.map(item => item.id === updatedItem.id ? updatedItem : item);
          setAllItems(newAllItems);

          setSelectedItem(updatedItem);

      } catch (error) {
          console.error("Failed to summarize:", error);
          alert("שגיאה בעת ניסיון הסיכום.");
      } finally {
          setIsSummarizing(false);
      }
  };
  
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
        <div className="flex items-center gap-2">
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
                <FeedCard
                  key={item.id}
                  item={item}
                  index={index}
                  onLongPress={handleLongPress}
                  onToggleRead={handleToggleRead}
                />
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
        <KnowledgeGraph items={allItems} onSelectItem={handleLongPress} />
      )}
      
      <ItemDetailModal 
        item={selectedItem}
        allItems={allItems}
        onSelectItem={setSelectedItem}
        onClose={handleCloseModal}
        onSummarize={handleSummarize}
        isSummarizing={isSummarizing}
      />
      <SynthesisModal
        isLoading={isSynthesizing}
        synthesisResult={synthesisResult}
        onClose={handleCloseSynthesisModal}
      />
    </div>
  );
};

export default FeedScreen;