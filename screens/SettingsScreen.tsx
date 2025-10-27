import React, { useState, useEffect, useCallback } from 'react';
import type { RssFeed, Tag } from '../types';
import { getFeeds, addFeed, removeFeed, getTags, addTag, removeTag } from '../services/geminiService';
import { TrashIcon } from '../components/icons';

const SettingsScreen: React.FC = () => {
  // RSS Feeds State
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(true);
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  
  // Tags State
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isAddingTag, setIsAddingTag] = useState(false);


  useEffect(() => {
    const loadData = async () => {
      setIsLoadingFeeds(true);
      setIsLoadingTags(true);
      try {
        const [fetchedFeeds, fetchedTags] = await Promise.all([getFeeds(), getTags()]);
        setFeeds(fetchedFeeds);
        setTags(fetchedTags);
      } catch (error) {
        console.error("Failed to load settings data:", error);
      } finally {
        setIsLoadingFeeds(false);
        setIsLoadingTags(false);
      }
    };
    loadData();
  }, []);
  
  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl || isAddingFeed) return;
    try { new URL(newFeedUrl); } catch (_) { alert("כתובת URL אינה חוקית."); return; }

    setIsAddingFeed(true);
    try {
      const newFeed = await addFeed(newFeedUrl);
      setFeeds(prevFeeds => [...prevFeeds, newFeed]);
      setNewFeedUrl('');
    } catch (error) {
      console.error("Failed to add RSS feed:", error);
      alert("שגיאה בהוספת הפיד.");
    } finally {
      setIsAddingFeed(false);
    }
  };
  
  const handleRemoveFeed = async (id: string) => {
      if (window.confirm("האם למחוק את הפיד?")) {
          try {
              await removeFeed(id);
              setFeeds(prevFeeds => prevFeeds.filter(feed => feed.id !== id));
          } catch (error) { console.error("Failed to remove RSS feed:", error); alert("שגיאה במחיקת הפיד."); }
      }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName || isAddingTag) return;
    setIsAddingTag(true);
    try {
      const newTag = await addTag(newTagName);
      setTags(prevTags => [...prevTags, newTag]);
      setNewTagName('');
    } catch (error: any) {
        console.error("Failed to add tag:", error);
        alert(error.message || "שגיאה בהוספת התגית.");
    } finally {
        setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (id: string) => {
      if (window.confirm("האם למחוק את התגית?")) {
          try {
              await removeTag(id);
              setTags(prevTags => prevTags.filter(tag => tag.id !== id));
          } catch (error) { console.error("Failed to remove tag:", error); alert("שגיאה במחיקת התגית."); }
      }
  };

  return (
    <div className="p-4 space-y-8">
      <h1 className="text-3xl font-bold text-gray-100">הגדרות</h1>
      
      {/* --- RSS Feeds Management --- */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">ניהול פידים (RSS)</h2>
        <form onSubmit={handleAddFeed} className="flex gap-2 mb-6">
          <input
            type="url"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            placeholder="הדבק כתובת URL של פיד"
            className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <button type="submit" disabled={isAddingFeed} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg disabled:bg-gray-600">
            {isAddingFeed ? '...' : 'הוסף'}
          </button>
        </form>
        <div className="space-y-3">
            {isLoadingFeeds && <p className="text-gray-400">טוען פידים...</p>}
            {!isLoadingFeeds && feeds.length === 0 && <p className="text-gray-500 text-center py-4">אין פידים.</p>}
            {feeds.map(feed => (
                <div key={feed.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                    <div>
                        <p className="font-medium text-gray-200">{feed.name}</p>
                        <p className="text-sm text-gray-500 truncate">{feed.url}</p>
                    </div>
                    <button onClick={() => handleRemoveFeed(feed.id)} className="text-gray-500 hover:text-red-400 p-2" aria-label={`מחק ${feed.name}`}>
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* --- Tags Management --- */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">ניהול תגיות</h2>
        <form onSubmit={handleAddTag} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="שם תגית חדשה"
            className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <button type="submit" disabled={isAddingTag} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg disabled:bg-gray-600">
            {isAddingTag ? '...' : 'הוסף'}
          </button>
        </form>
        <div className="space-y-3">
            {isLoadingTags && <p className="text-gray-400">טוען תגיות...</p>}
            {!isLoadingTags && tags.length === 0 && <p className="text-gray-500 text-center py-4">אין תגיות.</p>}
            {tags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                    <p className="font-medium text-gray-200">{tag.name}</p>
                    <button onClick={() => handleRemoveTag(tag.id)} className="text-gray-500 hover:text-red-400 p-2" aria-label={`מחק ${tag.name}`}>
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            ))}
        </div>
      </div>
      
      <div className="text-center">
         <p className="text-sm text-gray-600 mt-4">Spark v1.1</p>
      </div>
    </div>
  );
};

export default SettingsScreen;
