
import React, { useState, useEffect } from 'react';
import type { Tag } from '../types';
import { getTags, autoTagContent, addSpark, getContentFromUrl } from '../services/geminiService';
import { AutoTagIcon, ClipboardIcon } from '../components/icons';

interface AddSparkScreenProps {
  setActiveScreen: (screen: 'feed' | 'add' | 'search' | 'settings') => void;
}

const AddSparkScreen: React.FC<AddSparkScreenProps> = ({ setActiveScreen }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      const tags = await getTags();
      setAvailableTags(tags);
    };
    fetchTags();
  }, []);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const handleAutoTag = async () => {
    if (!content || isAutoTagging) return;
    setIsAutoTagging(true);
    try {
      const tagIds = await autoTagContent(content, availableTags);
      setSelectedTagIds(new Set(tagIds));
    } catch (error) {
      console.error("Auto-tagging failed:", error);
      alert("שגיאה בתיוג האוטומטי.");
    } finally {
      setIsAutoTagging(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const selectedTags = availableTags.filter(t => selectedTagIds.has(t.id));
      await addSpark({ title, content, tags: selectedTags });
      setTitle('');
      setContent('');
      setUrl('');
      setSelectedTagIds(new Set());
      alert('ספארק נוסף בהצלחה!');
      setActiveScreen('feed');
    } catch (error) {
      console.error("Failed to add spark:", error);
      alert("שגיאה בהוספת הספארק.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFetchUrl = async () => {
    if (!url || isFetchingUrl) return;
    setIsFetchingUrl(true);
    try {
      const { title: fetchedTitle, content: fetchedContent } = await getContentFromUrl(url);
      setTitle(fetchedTitle);
      setContent(fetchedContent);
    } catch(error) {
      console.error("URL Fetch failed:", error);
      alert("שגיאה בייבוא מהכתובת.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setContent(prev => prev ? `${prev}\n${text}`: text);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      alert("לא ניתן היה להדביק מהלוח.");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-100">הוסף ספארק</h1>
      
      <div className="space-y-4 mb-6">
        <label htmlFor="url" className="block text-sm font-medium text-gray-400 mb-1">ייבא מכתובת (URL)</label>
        <div className="flex gap-2">
           <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="הדבק כתובת מאמר..."
            className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleFetchUrl}
            disabled={!url || isFetchingUrl}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-5 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isFetchingUrl ? 'מייבא...' : 'ייבא'}
          </button>
        </div>
        <p className="text-xs text-center text-gray-600">הייבוא משתמש ב-AI כדי לסכם את תוכן הכתבה</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">כותרת</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <div className="relative">
          <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">תוכן</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <button type="button" onClick={handlePaste} className="absolute top-8 left-3 text-gray-400 hover:text-white" aria-label="הדבק מהלוח">
            <ClipboardIcon className="h-5 w-5"/>
          </button>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-400">תגיות</h3>
            <button
              type="button"
              onClick={handleAutoTag}
              disabled={!content || isAutoTagging}
              className="flex items-center text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <AutoTagIcon className="h-4 w-4 ml-1" />
              {isAutoTagging ? 'מתייג...' : 'תייג אוטומטית'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-800 border border-gray-700 rounded-lg">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedTagIds.has(tag.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={!title || !content || isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'מוסיף...' : 'הוסף ספארק'}
        </button>
      </form>
    </div>
  );
};

export default AddSparkScreen;
