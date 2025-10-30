import React, { useState, useEffect } from 'react';
import type { RssFeed, Tag } from '../types';
import { getFeeds, addFeed, removeFeed, getTags, addTag, removeTag } from '../services/geminiService';
import { TrashIcon, CloseIcon } from './icons';

interface ManageContentModalProps {
  onClose: () => void;
}

const SettingsSection: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
  <div className="bg-gray-800/50 rounded-xl">
    <h3 className="text-lg font-semibold text-gray-200 p-4 border-b border-gray-700/50">{title}</h3>
    <div className="p-4">{children}</div>
  </div>
);

const ManageContentModal: React.FC<ManageContentModalProps> = ({ onClose }) => {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(true);
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isClosing, setIsClosing] = useState(false);


  useEffect(() => {
    const loadData = async () => {
      setIsLoadingFeeds(true);
      setIsLoadingTags(true);
      try {
        const [fetchedFeeds, fetchedTags] = await Promise.all([getFeeds(), getTags()]);
        setFeeds(fetchedFeeds);
        setTags(fetchedTags);
      } catch (error) {
        console.error("Failed to load content data:", error);
      } finally {
        setIsLoadingFeeds(false);
        setIsLoadingTags(false);
      }
    };
    loadData();
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 400);
  };
  
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
  
  const inputStyles = "w-full bg-gray-900/80 border border-[var(--border-color)] text-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow";
  const buttonStyles = "bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg disabled:bg-gray-600 transition-transform transform active:scale-95";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={handleClose}>
      <div 
        className={`bg-gray-900/80 backdrop-blur-xl w-full max-w-2xl max-h-[90vh] rounded-t-2xl shadow-lg flex flex-col border-t border-blue-500/30 ${isClosing ? 'animate-slide-down-out' : 'animate-slide-up'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        `}</style>
        <header className="p-4 border-b border-[var(--border-color)] flex justify-between items-center sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
          <h2 className="text-xl font-bold text-gray-100">ניהול תוכן</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="p-4 overflow-y-auto space-y-6">
            <SettingsSection title="ניהול פידים (RSS)">
                <form onSubmit={handleAddFeed} className="flex gap-2 mb-6">
                    <input type="url" value={newFeedUrl} onChange={(e) => setNewFeedUrl(e.target.value)} placeholder="הדבק כתובת URL של פיד" className={inputStyles} required />
                    <button type="submit" disabled={isAddingFeed} className={buttonStyles}>
                        {isAddingFeed ? '...' : 'הוסף'}
                    </button>
                </form>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {isLoadingFeeds && <p className="text-gray-400">טוען פידים...</p>}
                    {!isLoadingFeeds && feeds.length === 0 && <p className="text-gray-500 text-center py-4">אין פידים.</p>}
                    {feeds.map(feed => (
                        <div key={feed.id} className="group flex items-center justify-between bg-gray-900/50 hover:bg-gray-700/50 p-3 rounded-lg transition-colors">
                            <div>
                                <p className="font-medium text-gray-200">{feed.name}</p>
                                <p className="text-sm text-gray-500 truncate max-w-xs sm:max-w-sm">{feed.url}</p>
                            </div>
                            <button onClick={() => handleRemoveFeed(feed.id)} className="text-gray-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 active:scale-95" aria-label={`מחק ${feed.name}`}>
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </SettingsSection>

            <SettingsSection title="ניהול תגיות">
                <form onSubmit={handleAddTag} className="flex gap-2 mb-6">
                    <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="שם תגית חדשה" className={inputStyles} required />
                    <button type="submit" disabled={isAddingTag} className={buttonStyles}>
                        {isAddingTag ? '...' : 'הוסף'}
                    </button>
                </form>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {isLoadingTags && <p className="text-gray-400">טוען תגיות...</p>}
                    {!isLoadingTags && tags.length === 0 && <p className="text-gray-500 text-center py-4">אין תגיות.</p>}
                    {tags.map(tag => (
                        <div key={tag.id} className="group flex items-center justify-between bg-gray-900/50 hover:bg-gray-700/50 p-3 rounded-lg transition-colors">
                            <p className="font-medium text-gray-200">{tag.name}</p>
                            <button onClick={() => handleRemoveTag(tag.id)} className="text-gray-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 active:scale-95" aria-label={`מחק ${tag.name}`}>
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </SettingsSection>
        </div>
      </div>
    </div>
  );
};

export default ManageContentModal;