import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import type { FeedItem } from '../types';
import type { Screen } from '../types';
import { summarizeItemContent, performAiSearch } from '../services/geminiService';
// FIX: Import reAddFeedItem for the undo functionality.
import { updateFeedItem, removeFeedItem, convertFeedItemToPersonalItem, reAddFeedItem } from '../services/dataService';
import FeedCardV2 from '../components/FeedCardV2';
import ItemDetailModal from '../components/ItemDetailModal';
import ContextMenu from '../components/ContextMenu';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { SearchIcon, SparklesIcon, SettingsIcon } from '../components/icons';
import { useDebounce } from '../hooks/useDebounce';
import { AppContext } from '../state/AppContext';
import { useContextMenu } from '../hooks/useContextMenu';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';

type FilterType = 'all' | 'spark' | 'rss';
type FilterStatus = 'all' | 'read' | 'unread';

interface SearchFilters {
    type: FilterType;
    status: FilterStatus;
}

interface SearchScreenProps {
    setActiveScreen: (screen: Screen) => void;
}

const FilterChip: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
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


export default function SearchScreen({ setActiveScreen }: SearchScreenProps) {
    const { state, dispatch } = useContext(AppContext);
    const { feedItems, settings } = state;
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu<FeedItem>();

    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 300);
    const [searchResults, setSearchResults] = useState<FeedItem[]>([]);
    const [isAiSearch, setIsAiSearch] = useState(false);
    
    const [filters, setFilters] = useState<SearchFilters>({ type: 'all', status: 'all' });
    
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);

    const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
    const [isSummarizing, setIsSummarizing] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number, onUndo?: ()=>void} | null>(null);

    const showStatus = (type: StatusMessageType, text: string, onUndo?: () => void) => {
        setStatusMessage({ type, text, id: Date.now(), onUndo });
    };

    const handleSelectItem = (item: FeedItem, event: React.MouseEvent) => {
        event.stopPropagation();
        setSelectedItem(item);
    };

    useEffect(() => {
        if (debouncedQuery.length > 1) {
            const lowerCaseQuery = debouncedQuery.toLowerCase();
            const results = feedItems.filter(item => 
                item.title.toLowerCase().includes(lowerCaseQuery) ||
                item.content.toLowerCase().includes(lowerCaseQuery)
            );
            setSearchResults(results);
            setIsAiSearch(false);
            setAiAnswer(null);
        } else {
            setSearchResults([]);
        }
    }, [debouncedQuery, feedItems]);
    
    const handleAiSearch = async () => {
        if (!query || isAiLoading) return;
        setIsAiLoading(true);
        setAiAnswer(null);
        try {
            const result = await performAiSearch(query, feedItems);
            setAiAnswer(result.answer);
            const resultItems = feedItems.filter(item => result.itemIds.includes(item.id));
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

    const handleUpdateItem = useCallback(async (id: string, updates: Partial<FeedItem>) => {
        const originalItem = feedItems.find(item => item.id === id);
        if (!originalItem) return;

        // Optimistic UI update
        dispatch({ type: 'UPDATE_FEED_ITEM', payload: { id, updates } });
        setSearchResults(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        if (selectedItem?.id === id) {
            setSelectedItem(prev => prev ? { ...prev, ...updates } : null);
        }

        try {
            await updateFeedItem(id, updates);
        } catch (error) {
            console.error("Failed to update item:", error);
            // Rollback on failure
            dispatch({ type: 'UPDATE_FEED_ITEM', payload: { id, updates: originalItem } });
            setSearchResults(prev => prev.map(item => item.id === id ? originalItem : item));
            if (selectedItem?.id === id) {
                setSelectedItem(originalItem);
            }
            showStatus('error', 'שגיאה בעדכון הפריט.');
        }
    }, [dispatch, feedItems, selectedItem]);

    const handleToggleRead = useCallback((id: string, forceStatus?: boolean) => {
        const item = feedItems.find(i => i.id === id);
        if (!item) return;
        const newStatus = forceStatus !== undefined ? forceStatus : !item.is_read;
        handleUpdateItem(id, { is_read: newStatus });
    }, [feedItems, handleUpdateItem]);

    const handleSummarize = useCallback(async (itemToSummarize: FeedItem) => {
        if (isSummarizing) return;
        setIsSummarizing(itemToSummarize.id);
        try {
            const summary = await summarizeItemContent(itemToSummarize.content);
            await handleUpdateItem(itemToSummarize.id, { summary_ai: summary });
        } catch (error) {
            console.error("Failed to summarize:", error);
            showStatus('error', 'שגיאה בסיכום הפריט.');
        } finally {
            setIsSummarizing(null);
        }
    }, [isSummarizing, handleUpdateItem]);
    
    const handleDeleteItem = useCallback(async (id: string) => {
        const itemToDelete = feedItems.find(item => item.id === id);
        if (!itemToDelete) return;

        if (window.navigator.vibrate) window.navigator.vibrate(50);
        
        await removeFeedItem(id);
        dispatch({ type: 'REMOVE_FEED_ITEM', payload: id });

        showStatus('success', 'הפריט נמחק.', async () => {
            // FIX: Added `await` to the async undo action to ensure it completes before potential subsequent actions.
            await reAddFeedItem(itemToDelete);
            dispatch({ type: 'ADD_FEED_ITEM', payload: itemToDelete });
        });
    }, [dispatch, feedItems]);
    
    const handleDeleteWithConfirmation = useCallback((id: string) => {
        const itemToDelete = feedItems.find(item => item.id === id);
        if (itemToDelete && window.confirm(`האם למחוק את "${itemToDelete.title}"?`)) {
            handleDeleteItem(id);
            setSelectedItem(null); // Close modal
        }
    }, [feedItems, handleDeleteItem]);

    const handleAddToLibrary = useCallback(async (item: FeedItem) => {
        try {
            const newPersonalItem = await convertFeedItemToPersonalItem(item);
            dispatch({ type: 'ADD_PERSONAL_ITEM', payload: newPersonalItem });
            await handleToggleRead(item.id, true); // Also mark as read
            showStatus('success', 'הפריט הוסף לספרייה');
        } catch (error) {
            console.error("Failed to add to library:", error);
            showStatus('error', 'שגיאה בהוספה לספרייה');
        }
    }, [dispatch, handleToggleRead]);

    const ResultSection: React.FC<{title: string, items: FeedItem[]}> = ({ title, items }) => {
        if (items.length === 0) return null;
        return (
            <section>
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 px-1">{title}</h2>
                <div className="space-y-3">
                    {items.map((item, index) => (
                         <FeedCardV2
                            key={item.id}
                            item={item}
                            index={index}
                            onSelect={handleSelectItem}
                            onLongPress={() => {}} // Not used in search
                            onContextMenu={handleContextMenu}
                            isInSelectionMode={false}
                            isSelected={false}
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
            <header className="mb-6 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20 border-b border-[var(--border-primary)] -mx-4 px-4">
                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-3xl font-bold themed-title">{settings.screenLabels?.search || 'חיפוש'}</h1>
                  <button 
                      onClick={() => setActiveScreen('settings')}
                      className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors"
                      aria-label="הגדרות"
                  >
                      <SettingsIcon className="w-6 h-6"/>
                  </button>
                </div>
                <div className="relative flex items-center gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-[var(--text-secondary)]" />
                        </div>
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                            placeholder="חפש או שאל את AI..."
                            className={`w-full border text-[var(--text-primary)] rounded-2xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-all ${settings.themeSettings.cardStyle === 'glass' ? 'bg-white/10 border-white/10 backdrop-blur-sm' : 'bg-[var(--bg-secondary)] border-[var(--border-primary)]'}`}
                        />
                    </div>
                    <button
                        onClick={handleAiSearch}
                        disabled={isAiLoading || query.length < 3}
                        className="p-3 bg-[var(--accent-gradient)] text-white rounded-2xl transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 hover:shadow-[0_0_15px_var(--dynamic-accent-glow)]"
                        aria-label="שאל את AI"
                    >
                       <SparklesIcon className={`h-6 w-6 ${isAiLoading ? 'animate-pulse' : ''}`}/>
                    </button>
                </div>
            </header>

            {searchResults.length > 0 && (
                <div className="flex gap-2 mb-8 flex-wrap">
                    <span className="text-sm text-[var(--text-secondary)] font-semibold self-center">סוג:</span>
                    <FilterChip label="הכל" isActive={filters.type === 'all'} onClick={() => setFilters(f => ({ ...f, type: 'all' }))} />
                    <FilterChip label="ספארקים" isActive={filters.type === 'spark'} onClick={() => setFilters(f => ({ ...f, type: 'spark' }))} />
                    <FilterChip label="RSS" isActive={filters.type === 'rss'} onClick={() => setFilters(f => ({ ...f, type: 'rss' }))} />
                    <div className="w-px h-6 bg-[var(--border-primary)] mx-2"></div>
                    <span className="text-sm text-[var(--text-secondary)] font-semibold self-center">סטטוס:</span>
                    <FilterChip label="הכל" isActive={filters.status === 'all'} onClick={() => setFilters(f => ({ ...f, status: 'all' }))} />
                    <FilterChip label="לא נקרא" isActive={filters.status === 'unread'} onClick={() => setFilters(f => ({ ...f, status: 'unread' }))} />
                    <FilterChip label="נקרא" isActive={filters.status === 'read'} onClick={() => setFilters(f => ({ ...f, status: 'read' }))} />
                </div>
            )}


            <div className="space-y-8">
                {isAiLoading && (
                    <div className="text-center text-[var(--text-secondary)] py-8 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-[var(--dynamic-accent-start)] rounded-full animate-pulse"></div>
                        AI חושב...
                    </div>
                )}
                {aiAnswer && (
                    <section className="relative themed-card p-4 animate-fade-in-up">
                         <div className="absolute -top-px -left-px -right-px h-1.5 bg-[var(--accent-gradient)] rounded-t-2xl animate-pulse"></div>
                        <h2 className="text-sm font-semibold text-[var(--accent-highlight)] uppercase tracking-wider mb-2 flex items-center gap-2"><SparklesIcon className="w-4 h-4" /> תשובת AI</h2>
                        <MarkdownRenderer content={aiAnswer} />
                    </section>
                )}

                {!isAiLoading && query && searchResults.length === 0 && (
                     <div className="text-center text-[var(--text-secondary)] mt-16 flex flex-col items-center">
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
                    <div className="text-center text-gray-500 mt-16 flex flex-col items-center">
                        <SearchIcon className="w-16 h-16 text-gray-700 mb-4"/>
                        <h2 className="text-lg font-semibold text-white">חפש בידע שלך</h2>
                        <p className="max-w-xs">הזן מונח חיפוש כדי למצוא פריטים, או שאל את AI שאלה כדי לקבל תשובה מסונתזת.</p>
                    </div>
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
            {contextMenu.isOpen && contextMenu.item && (
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
            {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
        </div>
    );
};