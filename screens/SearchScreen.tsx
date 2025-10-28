import React, { useState, useEffect } from 'react';
import type { FeedItem, Tag } from '../types';
import { searchFeedItems, getAllItems, updateFeedItem, summarizeItemContent, getTags } from '../services/geminiService';
import FeedCard from '../components/FeedCard';
import ItemDetailModal from '../components/ItemDetailModal';
import TagCloud from '../components/TagCloud';
import { SearchIcon } from '../components/icons';

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const SearchScreen: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FeedItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [tags, setTags] = useState<Tag[]>([]);

    const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
    const [allItems, setAllItems] = useState<FeedItem[]>([]);
    const [isSummarizing, setIsSummarizing] = useState(false);
    
    const debouncedQuery = useDebounce(query, 500);

    useEffect(() => {
        const loadAllData = async () => {
            const [items, fetchedTags] = await Promise.all([getAllItems(), getTags()]);
            setAllItems(items);
            setTags(fetchedTags);
        };
        loadAllData();
    }, []);

    useEffect(() => {
        if (debouncedQuery) {
            setIsLoading(true);
            setHasSearched(true);
            searchFeedItems(debouncedQuery).then(items => {
                setResults(items);
                setIsLoading(false);
            });
        } else {
            setResults([]);
            setIsLoading(false);
            // setHasSearched(false); // Uncomment if you want the tag cloud to reappear when query is cleared
        }
    }, [debouncedQuery]);

    const handleLongPress = (item: FeedItem) => setSelectedItem(item);
    const handleCloseModal = () => setSelectedItem(null);

    const handleToggleRead = async (id: string) => {
        const originalResults = results;
        const currentItem = allItems.find(item => item.id === id);
        if (!currentItem) return;
        
        const updatedStatus = !currentItem.is_read;

        setResults(results.map(item =>
            item.id === id ? { ...item, is_read: updatedStatus } : item
        ));
        
        setAllItems(allItems.map(item =>
            item.id === id ? { ...item, is_read: updatedStatus } : item
        ));

        try {
            await updateFeedItem(id, { is_read: updatedStatus });
        } catch (error) {
            console.error("Failed to update read status:", error);
            setResults(originalResults);
             setAllItems(allItems.map(item =>
                item.id === id ? { ...item, is_read: currentItem.is_read } : item
            ));
        }
    };

    const handleSummarize = async (itemToSummarize: FeedItem) => {
      if (!itemToSummarize || isSummarizing) return;
      setIsSummarizing(true);
      try {
          const summary = await summarizeItemContent(itemToSummarize.content);
          const updatedItem = await updateFeedItem(itemToSummarize.id, { summary_ai: summary });
          
          setResults(results.map(item => item.id === updatedItem.id ? updatedItem : item));
          setAllItems(allItems.map(item => item.id === updatedItem.id ? updatedItem : item));
          setSelectedItem(updatedItem);

      } catch (error) {
          console.error("Failed to summarize:", error);
          alert("שגיאה בעת ניסיון הסיכום.");
      } finally {
          setIsSummarizing(false);
      }
    };
    
    const handleTagClick = (tagName: string) => {
        setQuery(tagName);
    };

    return (
        <div className="pt-4 pb-4">
            <header className="mb-4 sticky top-0 bg-black/80 backdrop-blur-md py-3 z-20 -mx-4 px-4 border-b border-[var(--border-color)]">
                <h1 className="text-3xl font-bold text-gray-100">חיפוש</h1>
                <div className="relative mt-4">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="חפש בספארקים, מאמרים, תגיות..."
                        className="w-full bg-gray-900/80 border border-[var(--border-color)] text-gray-200 rounded-full p-3 pr-11 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow"
                    />
                </div>
            </header>

            <div className="space-y-4">
                {isLoading ? (
                    <p className="text-center text-gray-400 py-8">מחפש...</p>
                ) : debouncedQuery && results.length === 0 ? (
                    <div className="text-center text-gray-500 mt-16 flex flex-col items-center">
                        <SearchIcon className="w-16 h-16 text-gray-700 mb-4"/>
                        <p className="max-w-xs">לא נמצאו תוצאות עבור "{query}"</p>
                    </div>
                ) : !debouncedQuery ? (
                    <div className="text-center text-gray-500 mt-8 flex flex-col items-center">
                         <h2 className="text-lg font-semibold text-gray-300 mb-4">גלה לפי תגית</h2>
                         <TagCloud items={allItems} tags={tags} onTagClick={handleTagClick} />
                    </div>
                ) : (
                    results.map((item, index) => (
                        <FeedCard
                            key={item.id}
                            item={item}
                            index={index}
                            onLongPress={handleLongPress}
                            onToggleRead={handleToggleRead}
                        />
                    ))
                )}
            </div>
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

export default SearchScreen;
