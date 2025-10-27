import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FeedItem } from '../types';
import FeedCard from '../components/FeedCard';
import ItemDetailModal from '../components/ItemDetailModal';
import { getFeedItems, summarizeItemContent, updateFeedItem, refreshAllFeeds, getAllItems } from '../services/geminiService';
import { RefreshIcon } from '../components/icons';

type FilterType = 'all' | 'unread' | 'sparks' | 'rss';

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
  
  const loadItems = useCallback(async (isInitialLoad = false) => {
    if (isLoading || (!hasMore && !isInitialLoad)) return;
    setIsLoading(true);
    try {
      const current_page = isInitialLoad ? 1 : page;
      // Reset items before loading new ones on a refresh/initial load
      if (isInitialLoad) {
          setItems([]);
      }
      const newItems = await getFeedItems(current_page);
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prevItems => isInitialLoad ? newItems : [...prevItems, ...newItems]);
        setPage(current_page + 1);
        setHasMore(true); // Assume there might be more after a refresh
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
      const newItemsCount = await refreshAllFeeds();
      if (!isAutoRefresh && newItemsCount > 0) {
        alert(`${newItemsCount} פריטים חדשים נוספו לפיד!`);
      }
      setPage(1); // Reset page count
      setHasMore(true);
      await loadItems(true); // Force reload from source
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
        handleRefresh(true); // Auto-refresh on first load
    }
  }, [handleRefresh]);

  const handleToggleRead = async (id: string) => {
    const originalItems = items;
    const currentItem = items.find(item => item.id === id);
    if (!currentItem) return;

    // Optimistic UI update
    setItems(items.map(item =>
      item.id === id ? { ...item, is_read: !item.is_read } : item
    ));

    // Persist change
    try {
        await updateFeedItem(id, { is_read: !currentItem.is_read });
    } catch (error) {
        console.error("Failed to update read status:", error);
        alert("שגיאה בעדכון הסטטוס.");
        setItems(originalItems); // Revert on failure
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
        return true; // 'all'
    });
  }, [items, filter]);

  const FilterButton: React.FC<{
    label: string;
    filterType: FilterType;
  }> = ({ label, filterType }) => (
    <button
        onClick={() => setFilter(filterType)}
        className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors shrink-0 ${
            filter === filterType 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
    >
        {label}
    </button>
  );

  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-4 sticky top-0 bg-black py-2 z-10">
        <h1 className="text-3xl font-bold text-gray-100">פיד</h1>
        <button
          onClick={() => handleRefresh(false)}
          disabled={isRefreshing || isLoading}
          className="p-2 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
          aria-label="רענן פיד"
        >
          <RefreshIcon className={`h-6 w-6 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <FilterButton label="הכל" filterType="all" />
        <FilterButton label="לא נקרא" filterType="unread" />
        <FilterButton label="ספארקים" filterType="sparks" />
        <FilterButton label="RSS" filterType="rss" />
      </div>
      
      {filteredItems.map(item => (
        <FeedCard
          key={item.id}
          item={item}
          onLongPress={handleLongPress}
          onToggleRead={handleToggleRead}
        />
      ))}
      
      {isLoading && <p className="text-center text-gray-400">טוען...</p>}
      
      {!isLoading && filteredItems.length === 0 &&
        <p className="text-center text-gray-500 mt-8">
            {items.length > 0 ? "אין פריטים התואמים לסינון זה." : "הפיד ריק. לחץ על כפתור הרענון כדי למשוך תוכן חדש."}
        </p>
      }

      {!hasMore && items.length > 0 && <p className="text-center text-gray-500 mt-4">זה הכל בינתיים.</p>}
      
      <ItemDetailModal 
        item={selectedItem}
        allItems={allItems}
        onSelectItem={setSelectedItem}
        onClose={handleCloseModal}
        onSummarize={handleSummarize}
        isSummarizing={isSummarizing}
      />
    </div>
  );
};

export default FeedScreen;
