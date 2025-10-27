import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { FeedItem, Tag } from '../types';
import { searchFeedItems, getTags, getAllItems, synthesizeContent, summarizeItemContent, updateFeedItem } from '../services/geminiService';
import FeedCard from '../components/FeedCard';
import ItemDetailModal from '../components/ItemDetailModal';
import TagCloud from '../components/TagCloud';
import SynthesisModal from '../components/SynthesisModal';
import { SearchIcon, VisualModeIcon, BrainCircuitIcon } from '../components/icons';

type SearchMode = 'text' | 'visual';

const SearchScreen: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
        const [items, tags] = await Promise.all([getAllItems(), getTags()]);
        setAllItems(items);
        setAllTags(tags);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  const performSearch = useCallback(async (searchQuery: string) => {
      if (searchQuery.length < 1) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const searchResults = await searchFeedItems(searchQuery);
        setResults(searchResults);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    if (searchMode === 'text') {
        performSearch(debouncedQuery);
    }
  }, [debouncedQuery, performSearch, searchMode]);

  const handleTagClick = (tagName: string) => {
      setQuery(tagName);
      setSearchMode('text');
      performSearch(tagName);
  };

  const handleSynthesize = async () => {
      if (results.length === 0 || isSynthesizing) return;
      setIsSynthesizing(true);
      try {
          const synthesis = await synthesizeContent(results);
          setSynthesisResult(synthesis);
      } catch (error) {
          console.error("Synthesis failed:", error);
          alert("שגיאה ביצירת הסינתזה.");
      } finally {
          setIsSynthesizing(false);
      }
  };

  const handleLongPress = (item: FeedItem) => setSelectedItem(item);
  const handleCloseModal = () => setSelectedItem(null);
  
  const handleToggleRead = async (id: string) => {
    const originalResults = [...results];
    setResults(results.map(item => item.id === id ? {...item, is_read: !item.is_read} : item));
    try {
      await updateFeedItem(id, { is_read: !originalResults.find(i => i.id === id)?.is_read });
    } catch {
      setResults(originalResults); // Revert on failure
    }
  };
  
  const handleSummarize = async () => alert("סיכום אינו זמין מתוצאות החיפוש. פתח את הפריט מהפיד הראשי.");

  const tagsWithCounts = useMemo(() => {
      const counts = new Map<string, number>();
      allItems.forEach(item => {
          item.tags.forEach(tag => {
              counts.set(tag.id, (counts.get(tag.id) || 0) + 1);
          });
      });
      return allTags
        .map(tag => ({ tag, count: counts.get(tag.id) || 0 }))
        .filter(t => t.count > 0)
        .sort((a, b) => b.count - a.count);
  }, [allItems, allTags]);

  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-100">חיפוש</h1>
        <button
            onClick={() => setSearchMode(prev => prev === 'text' ? 'visual' : 'text')}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            aria-label="שנה מצב חיפוש"
        >
            {searchMode === 'text' ? <VisualModeIcon className="h-6 w-6" /> : <SearchIcon className="h-6 w-6" />}
        </button>
      </header>
      
      {searchMode === 'text' ? (
        <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חפש לפי תוכן או תגית..."
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-3 mb-6 focus:ring-blue-500 focus:border-blue-500"
        />
      ) : (
        <div className="mb-6">
            <TagCloud tagsWithCounts={tagsWithCounts} onTagClick={handleTagClick} />
        </div>
      )}

      {results.length > 0 && (
          <button
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg mb-6 transition-colors"
          >
              <BrainCircuitIcon className="h-5 w-5" />
              {isSynthesizing ? 'מסנתז...' : 'סנתז תוצאות'}
          </button>
      )}

      {isLoading && <p className="text-center text-gray-400">מחפש...</p>}
      {!isLoading && debouncedQuery.length > 0 && results.length === 0 && searchMode === 'text' && (
        <p className="text-center text-gray-500">לא נמצאו תוצאות.</p>
      )}

      <div className="space-y-4">
        {results.map(item => (
          <FeedCard 
            key={item.id} 
            item={item} 
            onLongPress={handleLongPress} 
            onToggleRead={handleToggleRead} 
          />
        ))}
      </div>

       <ItemDetailModal 
        item={selectedItem}
        allItems={allItems}
        onSelectItem={setSelectedItem} 
        onClose={handleCloseModal}
        onSummarize={handleSummarize}
        isSummarizing={false}
      />
      <SynthesisModal 
        synthesisResult={synthesisResult}
        onClose={() => setSynthesisResult(null)}
        isLoading={isSynthesizing}
      />
    </div>
  );
};

export default SearchScreen;
