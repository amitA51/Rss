import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { FeedItem } from '../types';
import { getAllItems, updateFeedItem, summarizeItemContent, performAiSearch, searchFeedItems, removeFeedItem } from '../services/geminiService';
import FeedCardV2 from '../components/FeedCardV2';
import ItemDetailModal from '../components/ItemDetailModal';
import ContextMenu from '../components/ContextMenu';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { SearchIcon, SparklesIcon } from '../components/icons';

type FilterType = 'all' | 'spark' | 'rss';
type FilterStatus = 'all' | 'read' | 'unread';

interface SearchFilters {
    type: FilterType;
    status: FilterStatus;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: FeedItem;
}

const FilterChip: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-1.5 text-sm rounded-full transition-all shrink-0 transform hover:scale-105 active:scale-95 font-semibold ${
            isActive 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
            : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700'
        }`}
    >
        {label}
    </button>
);


const SearchScreen: React.FC = () => {
    const [query, setQuery] = useState('');
    const [allItems, setAllItems] = useState<FeedItem[]>([]);
    const [searchResults, setSearchResults] = useState<FeedItem[]>([]);
    const [isAiSearch, setIsAiSearch] = useState(false);
    
    const [filters, setFilters] = useState<SearchFilters>({ type: 'all', status: 'all' });
    
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);

    const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
    const [isSummarizing, setIsSummarizing] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    useEffect(() => {
        getAllItems().then(setAllItems);
    }, []);

    useEffect(() => {
        if (query.length > 1) {
            const results = searchFeedItems(query, allItems);
            setSearchResults(results);
            setIsAiSearch(false);
            setAiAnswer(null);
        } else {
            setSearchResults([]);
        }
    }, [query, allItems]);
    
    const handleAiSearch = async () => {
        if (!query || isAiLoading) return;
        setIsAiLoading(true);
        setAiAnswer(null);
        try {
            const result = await performAiSearch(query, allItems);
            setAiAnswer(result.answer);
            const resultItems = allItems.filter(item => result.itemIds.includes(item.id));
            setSearchResults(resultItems);
            setIsAiSearch(true);
        } catch(e) {
            console.error("AI Search failed", e);
            setAiAnswer("התנצלותי, נתקלתי בשגיאה בעת ביצוע החיפוש החכם.");
            setSearchResults([]);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    const filteredAndDisplayedResults = useMemo(() => {
        return searchResults.filter(item => {
            const typeMatch = filters.type === 'all' || item.type === filters.type;
            const statusMatch = filters.status === 'all' || (filters.status === 'read' ? item.is_read : !item.is_read);
            return typeMatch && statusMatch;
        });
    }, [searchResults, filters]);

    const handleToggleRead = useCallback(async (id: string) => {
        const item = allItems.find(i => i.id === id);
        if (!item) return;
        const newStatus = !item.is_read;
        const updatedItem = { ...item, is_read: newStatus };

        setAllItems(prev => prev.map(i => i.id === id ? updatedItem : i));
        setSearchResults(prev => prev.map(i => i.id === id ? updatedItem : i));
        if (selectedItem?.id === id) setSelectedItem(updatedItem);

        try {
            await updateFeedItem(id, { is_read: newStatus });
        } catch (error) {
            console.error("Failed to update read status:", error);
            setAllItems(prev => prev.map(i => i.id === id ? item : i));
            setSearchResults(prev => prev.map(i => i.id === id ? item : i));
        }
    }, [allItems, selectedItem]);

    const handleSummarize = useCallback(async (itemToSummarize: FeedItem) => {
        if (isSummarizing) return;
        setIsSummarizing(itemToSummarize.id);
        try {
            const summary = await summarizeItemContent(itemToSummarize.content);
            const updatedItem = { ...itemToSummarize, summary_ai: summary };
            
            setAllItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
            setSearchResults(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
            if (selectedItem?.id === updatedItem.id) setSelectedItem(updatedItem);

            await updateFeedItem(itemToSummarize.id, { summary_ai: summary });
        } catch (error) {
            console.error("Failed to summarize:", error);
        } finally {
            setIsSummarizing(null);
        }
    }, [isSummarizing, selectedItem]);
    
    const handleDeleteItem = useCallback(async (id: string) => {
      if (window.confirm("האם למחוק את הספארק?")) {
        setAllItems(prev => prev.filter(i => i.id !== id));
        setSearchResults(prev => prev.filter(i => i.id !== id));
        try {
            await removeFeedItem(id);
        } catch(e) {
            alert("שגיאה במחיקת הספארק. משחזר...");
            getAllItems().then(setAllItems);
        }
      }
    }, []);

    const handleContextMenu = (e: React.MouseEvent, item: FeedItem) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    };
    
    const ResultSection: React.FC<{title: string, items: FeedItem[]}> = ({ title, items }) => {
        if (items.length === 0) return null;
        return (
            <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">{title}</h2>
                <div className="space-y-4">
                    {items.map((item, index) => (
                         <FeedCardV2
                            key={item.id}
                            item={item}
                            index={index}
                            onSelect={setSelectedItem}
                            onToggleRead={handleToggleRead}
                            onSummarize={handleSummarize}
                            isSummarizing={isSummarizing === item.id}
                            onContextMenu={handleContextMenu}
                        />
                    ))}
                </div>
            </section>
        );
    };

    const sparks = useMemo(() => filteredAndDisplayedResults.filter(i => i.type === 'spark'), [filteredAndDisplayedResults]);
    const rss = useMemo(() => filteredAndDisplayedResults.filter(i => i.type === 'rss'), [filteredAndDisplayedResults]);

    return (
        <div className="pt-4 pb-4">
            <header className="mb-4 sticky top-0 bg-black/80 backdrop-blur-md py-3 z-20 -mx-4 px-4 border-b border-[var(--border-color)]">
                <h1 className="text-3xl font-bold text-gray-100">חיפוש</h1>
                <div className="relative mt-4 flex items-center gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                            placeholder="חפש או שאל את AI..."
                            className="w-full bg-gray-900/80 border border-[var(--border-color)] text-gray-200 rounded-full py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow"
                        />
                    </div>
                    <button
                        onClick={handleAiSearch}
                        disabled={isAiLoading || query.length < 3}
                        className="p-3 bg-gray-700 hover:bg-purple-600/50 text-purple-300 hover:text-white rounded-full transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700"
                        aria-label="שאל את AI"
                    >
                       <SparklesIcon className={`h-6 w-6 ${isAiLoading ? 'animate-pulse' : ''}`}/>
                    </button>
                </div>
            </header>

            <div className="flex gap-2 mb-6 flex-wrap">
                <span className="text-sm text-gray-500 font-semibold self-center">סוג:</span>
                <FilterChip label="הכל" isActive={filters.type === 'all'} onClick={() => setFilters(f => ({ ...f, type: 'all' }))} />
                <FilterChip label="ספארקים" isActive={filters.type === 'spark'} onClick={() => setFilters(f => ({ ...f, type: 'spark' }))} />
                <FilterChip label="RSS" isActive={filters.type === 'rss'} onClick={() => setFilters(f => ({ ...f, type: 'rss' }))} />
                <div className="w-px h-6 bg-gray-700 mx-2"></div>
                <span className="text-sm text-gray-500 font-semibold self-center">סטטוס:</span>
                <FilterChip label="הכל" isActive={filters.status === 'all'} onClick={() => setFilters(f => ({ ...f, status: 'all' }))} />
                <FilterChip label="לא נקרא" isActive={filters.status === 'unread'} onClick={() => setFilters(f => ({ ...f, status: 'unread' }))} />
                <FilterChip label="נקרא" isActive={filters.status === 'read'} onClick={() => setFilters(f => ({ ...f, status: 'read' }))} />
            </div>

            <div className="space-y-8">
                {isAiLoading && (
                    <div className="text-center text-gray-400 py-8 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        AI חושב...
                    </div>
                )}
                {aiAnswer && (
                    <section className="glass-card p-4 rounded-xl border-l-4 border-purple-500">
                        <h2 className="text-sm font-semibold text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-2"><SparklesIcon className="w-4 h-4" /> תשובת AI</h2>
                        <MarkdownRenderer content={aiAnswer} />
                    </section>
                )}

                {!isAiLoading && query && searchResults.length === 0 && (
                     <div className="text-center text-gray-500 mt-16 flex flex-col items-center">
                        <SearchIcon className="w-16 h-16 text-gray-700 mb-4"/>
                        <p className="max-w-xs">לא נמצאו תוצאות עבור "{query}"</p>
                    </div>
                )}
                
                {!isAiLoading && searchResults.length > 0 && (
                    <div className="space-y-6">
                        <ResultSection title="ספארקים" items={sparks} />
                        <ResultSection title="מאמרי RSS" items={rss} />
                    </div>
                )}
                
                {!query && !isAiLoading && (
                    <div className="text-center text-gray-600 mt-24 flex flex-col items-center">
                        <SearchIcon className="w-20 h-20 text-gray-700 mb-4"/>
                        <p className="text-lg">חפש בכל הידע שלך</p>
                        <p className="max-w-xs text-sm">הזן מילות מפתח או שאל שאלה מלאה את הבינה המלאכותית.</p>
                    </div>
                )}
            </div>

            <ItemDetailModal
                item={selectedItem}
                allItems={allItems}
                onSelectItem={setSelectedItem}
                onClose={() => setSelectedItem(null)}
                onSummarize={handleSummarize}
                isSummarizing={!!isSummarizing}
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

export default SearchScreen;
