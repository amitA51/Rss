import { LOCAL_STORAGE_KEYS as LS } from '../constants';
import { defaultFeedItems, defaultPersonalItems, defaultRssFeeds, defaultTags, defaultTemplates, defaultSpaces, defaultMentors } from './mockData';
import type { FeedItem, PersonalItem, RssFeed, Tag, AppData, ExportData, Template, WatchlistItem, Space, Mentor } from '../types';
import { loadSettings, saveSettings } from './settingsService';
import { fetchAndParseFeed } from './rssService';
import { fetchNewsForTicker, findTicker } from './financialsService';
import { generateMentorContent } from './geminiService';

// --- IndexedDB Wrapper (Principle 1: Offline First) ---
const DB_NAME = 'SparkDB';
const DB_VERSION = 2; // Incremented version to add new stores if needed
const OBJECT_STORES = Object.values(LS);

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening IndexedDB.');
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            OBJECT_STORES.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    // keyPath is 'id' for collections, undefined for single-doc stores
                    const hasIdKey = storeName !== LS.SETTINGS;
                    const keyPathOption = hasIdKey ? { keyPath: 'id' } : {};
                    db.createObjectStore(storeName, keyPathOption);
                }
            });
        };

        request.onsuccess = () => {
            resolve(request.result);
        };
    });
    return dbPromise;
};

const getStore = async (storeName: string, mode: IDBTransactionMode) => {
    const db = await initDB();
    return db.transaction(storeName, mode).objectStore(storeName);
};

const dbGetAll = async <T>(storeName: string): Promise<T[]> => {
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        // FIX: Cast the result of the IDBRequest to the expected generic type T[].
        // The result from IndexedDB is `unknown[]` and needs to be cast to prevent type errors.
        request.onsuccess = () => resolve((request.result as T[]) || []);
    });
};

const dbGet = async <T>(storeName: string, key: IDBValidKey): Promise<T | undefined> => {
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
        const request: IDBRequest<T> = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

const dbPut = async <T>(storeName: string, item: T): Promise<void> => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(item);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

const dbDelete = async (storeName: string, key: IDBValidKey): Promise<void> => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

const dbClear = async (storeName: string): Promise<void> => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

const initializeDefaultData = async <T>(storeName: string, defaultData: T[]): Promise<T[]> => {
    const data = await dbGetAll<T>(storeName);
    if (data.length === 0 && defaultData.length > 0) {
        const store = await getStore(storeName, 'readwrite');
        const transaction = store.transaction;
        
        // Queue all put operations within the same transaction
        defaultData.forEach(item => store.put(item));

        // Wait for the transaction to complete to ensure all data is written
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve(defaultData);
            transaction.onerror = () => reject(transaction.error);
        });
    }
    return data;
};

// --- Utility Functions ---

const safeDateSort = (a: { createdAt: string }, b: { createdAt: string }): number => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (isNaN(dateB)) return -1;
    if (isNaN(dateA)) return 1;
    return dateB - dateA;
};


// --- Feed Item CRUD ---
export const getFeedItems = async (): Promise<FeedItem[]> => {
  const items = await initializeDefaultData(LS.FEED_ITEMS, defaultFeedItems);
  return items.sort(safeDateSort);
};

export const reAddFeedItem = (item: FeedItem): Promise<void> => dbPut(LS.FEED_ITEMS, item);

export const updateFeedItem = async (id: string, updates: Partial<FeedItem>): Promise<FeedItem> => {
    const itemToUpdate = await dbGet<FeedItem>(LS.FEED_ITEMS, id);
    if (!itemToUpdate) throw new Error("Item not found");
    const updatedItem = { ...itemToUpdate, ...updates };
    await dbPut(LS.FEED_ITEMS, updatedItem);
    return updatedItem;
};

export const removeFeedItem = (id: string): Promise<void> => dbDelete(LS.FEED_ITEMS, id);

export const addSpark = async (sparkData: Omit<FeedItem, 'id' | 'createdAt' | 'type' | 'is_read' | 'is_spark'>): Promise<FeedItem> => {
    const newSpark: FeedItem = {
        id: `spark-${Date.now()}`,
        type: 'spark',
        is_read: false,
        is_spark: true,
        createdAt: new Date().toISOString(),
        ...sparkData,
    };
    await dbPut(LS.FEED_ITEMS, newSpark);
    return newSpark;
};

// --- Personal Item CRUD ---
export const getPersonalItems = async (): Promise<PersonalItem[]> => {
  const items = await initializeDefaultData(LS.PERSONAL_ITEMS, defaultPersonalItems);
  return items.sort(safeDateSort);
};

export const reAddPersonalItem = (item: PersonalItem): Promise<void> => dbPut(LS.PERSONAL_ITEMS, item);

export const getPersonalItemsByProjectId = async (projectId: string): Promise<PersonalItem[]> => {
    const items = await getPersonalItems();
    return items.filter(item => item.projectId === projectId).sort(safeDateSort);
};

export const addPersonalItem = async (itemData: Omit<PersonalItem, 'id' | 'createdAt'>): Promise<PersonalItem> => {
    const newItem: PersonalItem = {
        id: `p-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...itemData,
    };
    await dbPut(LS.PERSONAL_ITEMS, newItem);
    return newItem;
};

export const updatePersonalItem = async (id: string, updates: Partial<PersonalItem>): Promise<PersonalItem> => {
    const itemToUpdate = await dbGet<PersonalItem>(LS.PERSONAL_ITEMS, id);
    if (!itemToUpdate) throw new Error("Item not found");
    const updatedItem = { ...itemToUpdate, ...updates };
    await dbPut(LS.PERSONAL_ITEMS, updatedItem);
    return updatedItem;
};

export const removePersonalItem = (id: string): Promise<void> => dbDelete(LS.PERSONAL_ITEMS, id);

export const duplicatePersonalItem = async (id: string): Promise<PersonalItem> => {
    const originalItem = await dbGet<PersonalItem>(LS.PERSONAL_ITEMS, id);
    if (!originalItem) throw new Error("Item not found");
    const duplicatedItem: PersonalItem = {
        ...JSON.parse(JSON.stringify(originalItem)),
        id: `p-${Date.now()}`,
        createdAt: new Date().toISOString(),
        title: `${originalItem.title} (העתק)`,
        isCompleted: originalItem.type === 'task' ? false : undefined,
    };
    await dbPut(LS.PERSONAL_ITEMS, duplicatedItem);
    return duplicatedItem;
};

export const logFocusSession = async (itemId: string, durationInMinutes: number): Promise<PersonalItem> => {
    const itemToUpdate = await dbGet<PersonalItem>(LS.PERSONAL_ITEMS, itemId);
    if (!itemToUpdate) throw new Error("Item not found");
    const newSession = { date: new Date().toISOString(), duration: durationInMinutes };
    const updatedItem = { ...itemToUpdate, focusSessions: [...(itemToUpdate.focusSessions || []), newSession] };
    await dbPut(LS.PERSONAL_ITEMS, updatedItem);
    return updatedItem;
};

export const rollOverIncompleteTasks = async (): Promise<{ id: string, updates: Partial<PersonalItem> }[]> => {
    const items = await getPersonalItems();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = new Date().toISOString().split('T')[0];
    const updates: { id: string, updates: Partial<PersonalItem> }[] = [];
    const itemsToUpdate: PersonalItem[] = [];

    items.forEach(item => {
        if (item.type === 'task' && !item.isCompleted && item.dueDate) {
            const [year, month, day] = item.dueDate.split('-').map(Number);
            const due = new Date(year, month - 1, day);
            due.setHours(23, 59, 59, 999);
            if (due < today) {
                updates.push({ id: item.id, updates: { dueDate: todayISO } });
                itemsToUpdate.push({ ...item, dueDate: todayISO });
            }
        }
    });

    if (itemsToUpdate.length > 0) {
        await Promise.all(itemsToUpdate.map(item => dbPut(LS.PERSONAL_ITEMS, item)));
    }
    return updates;
};

// --- Tags, Feeds, Spaces, and Templates Management ---
export const getTags = (): Promise<Tag[]> => initializeDefaultData(LS.TAGS, defaultTags);
export const getFeeds = (): Promise<RssFeed[]> => initializeDefaultData(LS.RSS_FEEDS, defaultRssFeeds);
export const getTemplates = (): Promise<Template[]> => initializeDefaultData(LS.TEMPLATES, defaultTemplates);

export const addTemplate = async (templateData: Omit<Template, 'id'>): Promise<Template> => {
    const newTemplate: Template = {
        id: `template-${Date.now()}`,
        ...templateData,
    };
    await dbPut(LS.TEMPLATES, newTemplate);
    return newTemplate;
};

export const getSpaces = async (): Promise<Space[]> => {
    const spaces = await initializeDefaultData(LS.SPACES, defaultSpaces);
    return spaces.sort((a, b) => a.order - b.order);
};

export const reAddSpace = (item: Space): Promise<void> => dbPut(LS.SPACES, item);


export const addFeed = async (url: string, spaceId?: string): Promise<RssFeed> => {
    const feeds = await getFeeds();
    if (feeds.some(feed => feed.url === url)) throw new Error("פיד עם כתובת זו כבר קיים.");
    const parsedFeed = await fetchAndParseFeed(url);
    const newFeed: RssFeed = { id: `rss-${Date.now()}`, url, name: parsedFeed.title, spaceId };
    await dbPut(LS.RSS_FEEDS, newFeed);
    return newFeed;
};

export const reAddFeed = (item: RssFeed): Promise<void> => dbPut(LS.RSS_FEEDS, item);

export const removeFeed = (id: string): Promise<void> => dbDelete(LS.RSS_FEEDS, id);
export const updateFeed = async (id: string, updates: Partial<RssFeed>): Promise<void> => {
    const feedToUpdate = await dbGet<RssFeed>(LS.RSS_FEEDS, id);
    if (feedToUpdate) await dbPut(LS.RSS_FEEDS, { ...feedToUpdate, ...updates });
};

export const addSpace = async (spaceData: Omit<Space, 'id'>): Promise<Space> => {
    const newSpace: Space = { id: `space-${Date.now()}`, ...spaceData };
    await dbPut(LS.SPACES, newSpace);
    return newSpace;
};

export const updateSpace = async (id: string, updates: Partial<Space>): Promise<Space> => {
    const spaceToUpdate = await dbGet<Space>(LS.SPACES, id);
    if (!spaceToUpdate) throw new Error("Space not found");
    const updatedSpace = { ...spaceToUpdate, ...updates };
    await dbPut(LS.SPACES, updatedSpace);
    return updatedSpace;
};

export const removeSpace = async (id: string): Promise<void> => {
    await dbDelete(LS.SPACES, id);
    
    // Update personal items associated with the space
    const personalItems = await getPersonalItems();
    const personalItemsToUpdate = personalItems
        .filter(item => item.spaceId === id)
        .map(item => ({ ...item, spaceId: undefined }));
    
    if (personalItemsToUpdate.length > 0) {
        await Promise.all(personalItemsToUpdate.map(item => dbPut(LS.PERSONAL_ITEMS, item)));
    }

    // Update feeds associated with the space
    const feeds = await getFeeds();
    const feedsToUpdate = feeds
        .filter(feed => feed.spaceId === id)
        .map(feed => ({ ...feed, spaceId: undefined }));

    if (feedsToUpdate.length > 0) {
        await Promise.all(feedsToUpdate.map(feed => dbPut(LS.RSS_FEEDS, feed)));
    }
};

// --- Watchlist Management ---
const defaultWatchlist: WatchlistItem[] = [
    { id: 'bitcoin', name: 'Bitcoin', ticker: 'BTC', type: 'crypto' },
    { id: 'tsla', name: 'TSLA', ticker: 'TSLA', type: 'stock' },
];
export const getWatchlist = (): Promise<WatchlistItem[]> => initializeDefaultData(LS.WATCHLIST, defaultWatchlist);

export const addToWatchlist = async (ticker: string): Promise<WatchlistItem> => {
    const watchlist = await getWatchlist();
    const upperTicker = ticker.toUpperCase();
    if (watchlist.some(item => item.ticker === upperTicker)) throw new Error(`${upperTicker} is already in the watchlist.`);
    const assetInfo = await findTicker(upperTicker);
    if (!assetInfo) throw new Error(`Could not find information for ticker ${upperTicker}.`);
    const newItem: WatchlistItem = { id: assetInfo.id, name: assetInfo.name, ticker: upperTicker, type: assetInfo.type };
    await dbPut(LS.WATCHLIST, newItem);
    return newItem;
};

export const removeFromWatchlist = (ticker: string): Promise<void> => dbDelete(LS.WATCHLIST, ticker);

// --- Mentor Content ---
export const getCustomMentors = (): Promise<Mentor[]> => initializeDefaultData(LS.CUSTOM_MENTORS, []);
export const reAddCustomMentor = (item: Mentor): Promise<void> => dbPut(LS.CUSTOM_MENTORS, item);

export const getMentors = async (): Promise<Mentor[]> => {
    const customMentors = await getCustomMentors();
    return [...defaultMentors, ...customMentors];
};

export const addCustomMentor = async (name: string): Promise<Mentor> => {
    const allMentors = await getMentors();
    if (allMentors.some(m => m.name.toLowerCase() === name.toLowerCase())) throw new Error("מנטור בשם זה כבר קיים.");
    const quotes = await generateMentorContent(name);
    if (!quotes || quotes.length === 0) throw new Error("לא הצלחתי ליצור תוכן עבור המנטור הזה.");
    const newMentor: Mentor = { id: `custom-${Date.now()}`, name, description: 'מנטור מותאם אישית', isCustom: true, quotes };
    await dbPut(LS.CUSTOM_MENTORS, newMentor);
    return newMentor;
};

export const removeCustomMentor = async (id: string): Promise<void> => {
    await dbDelete(LS.CUSTOM_MENTORS, id);
    const settings = loadSettings();
    if (settings.enabledMentorIds.includes(id)) {
        saveSettings({ ...settings, enabledMentorIds: settings.enabledMentorIds.filter(mentorId => mentorId !== id) });
    }
};

export const refreshMentorContent = async (id: string): Promise<Mentor> => {
    const mentorToUpdate = await dbGet<Mentor>(LS.CUSTOM_MENTORS, id);
    if (!mentorToUpdate) throw new Error("Mentor not found.");
    const newQuotes = await generateMentorContent(mentorToUpdate.name);
    const updatedMentor = { ...mentorToUpdate, quotes: newQuotes };
    await dbPut(LS.CUSTOM_MENTORS, updatedMentor);
    return updatedMentor;
};

const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};

export const syncMentorFeeds = async (): Promise<FeedItem[]> => {
    const settings = loadSettings();
    if (!settings.enabledMentorIds || settings.enabledMentorIds.length === 0) return [];
    
    const today = new Date().toDateString();
    const [allFeedItems, allMentors] = await Promise.all([getFeedItems(), getMentors()]);
    const newMentorItems: FeedItem[] = [];
    const dayOfYear = getDayOfYear();

    for (const mentorId of settings.enabledMentorIds) {
        const mentor = allMentors.find(m => m.id === mentorId);
        if (!mentor || !mentor.quotes || mentor.quotes.length === 0) continue;
        const alreadyExists = allFeedItems.some(item => 
            item.type === 'mentor' && item.source === `mentor:${mentorId}` && new Date(item.createdAt).toDateString() === today);
        if (!alreadyExists) {
            const quote = mentor.quotes[dayOfYear % mentor.quotes.length];
            newMentorItems.push({
                id: `mentor-item-${mentorId}-${today}`, type: 'mentor', title: `תובנה מאת ${mentor.name}`,
                content: quote, is_read: false, is_spark: false, tags: [], createdAt: new Date().toISOString(), source: `mentor:${mentorId}`,
            });
        }
    }
    return newMentorItems;
};

// --- Bulk Operations ---
export const refreshAllFeeds = async (): Promise<FeedItem[]> => {
    const allItems = await getFeedItems();
    const existingLinks = new Set(allItems.map(item => item.link).filter(Boolean));
    let newItems: FeedItem[] = [];

    const newMentorItems = await syncMentorFeeds();
    newItems.push(...newMentorItems.filter(item => !existingLinks.has(item.link!)));

    const allRssFeeds = await getFeeds();
    const rssResults = await Promise.allSettled(allRssFeeds.map(feed => fetchAndParseFeed(feed.url)));
    
    rssResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            result.value.items.forEach(parsedItem => {
                if (parsedItem.link && !existingLinks.has(parsedItem.link)) {
                    newItems.push({
                        id: `rss-item-${Date.now()}-${Math.random()}`, type: 'rss', title: parsedItem.title, link: parsedItem.link,
                        content: parsedItem.content, is_read: false, is_spark: false, tags: [],
                        createdAt: new Date(parsedItem.pubDate).toISOString(), source: allRssFeeds[index].id,
                    });
                    existingLinks.add(parsedItem.link!);
                }
            });
        }
    });

    const watchlist = await getWatchlist();
    const newsResults = await Promise.allSettled(watchlist.map(item => fetchNewsForTicker(item.ticker, item.type)));

    newsResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            result.value.forEach(newsItem => {
                 if (newsItem.url && !existingLinks.has(newsItem.url)) {
                    newItems.push({
                        id: `news-item-${newsItem.id}`, type: 'news', title: newsItem.headline, link: newsItem.url,
                        content: newsItem.summary, source: watchlist[index].ticker, is_read: false, is_spark: false, tags: [],
                        createdAt: new Date(newsItem.datetime * 1000).toISOString(),
                    });
                    existingLinks.add(newsItem.url);
                 }
            });
        }
    });

    if (newItems.length > 0) {
        await Promise.all(newItems.map(item => dbPut(LS.FEED_ITEMS, item)));
    }
    return newItems;
};

export const convertFeedItemToPersonalItem = async (feedItem: FeedItem): Promise<PersonalItem> => {
    const newLearningItem: Omit<PersonalItem, 'id' | 'createdAt'> = {
        type: 'learning', title: feedItem.title, content: feedItem.summary_ai || feedItem.content,
        metadata: { status: 'to-learn', source: feedItem.link }
    };
    return addPersonalItem(newLearningItem);
};

export const wipeAllData = async (): Promise<void> => {
    await Promise.all(OBJECT_STORES.map(storeName => dbClear(storeName)));
    localStorage.removeItem(LS.SETTINGS);
};

// --- Data Import/Export ---
export const exportAllData = async (): Promise<string> => {
    const settings = loadSettings();
    const [tags, rssFeeds, feedItems, personalItems, templates, watchlist, spaces, customMentors] = await Promise.all([
        getTags(), getFeeds(), getFeedItems(), getPersonalItems(), getTemplates(), getWatchlist(), getSpaces(), getCustomMentors()
    ]);
    const data: AppData = { tags, rssFeeds, feedItems, personalItems, templates, watchlist, spaces, customMentors };
    const exportObject: ExportData = { settings, data, exportDate: new Date().toISOString(), version: 3 };
    return JSON.stringify(exportObject, null, 2);
};

export const importAllData = async (jsonData: string): Promise<void> => {
    const parsedData = JSON.parse(jsonData);
    if (typeof parsedData !== 'object' || !parsedData.version || parsedData.version > 3) {
        throw new Error("Invalid or unsupported file format.");
    }
    const data: AppData = parsedData.data;
    await wipeAllData(); // Clear existing data without reloading
    
    saveSettings(parsedData.settings);

    const promises = [
        ...data.tags.map((item: Tag) => dbPut(LS.TAGS, item)),
        ...data.rssFeeds.map((item: RssFeed) => dbPut(LS.RSS_FEEDS, item)),
        ...data.feedItems.map((item: FeedItem) => dbPut(LS.FEED_ITEMS, item)),
        ...data.personalItems.map((item: PersonalItem) => dbPut(LS.PERSONAL_ITEMS, item)),
        ...data.templates.map((item: Template) => dbPut(LS.TEMPLATES, item)),
        ...data.watchlist.map((item: WatchlistItem) => dbPut(LS.WATCHLIST, item)),
        ...data.spaces.map((item: Space) => dbPut(LS.SPACES, item)),
    ];

    if (data.customMentors) {
        promises.push(...data.customMentors.map((item: Mentor) => dbPut(LS.CUSTOM_MENTORS, item)));
    }

    await Promise.all(promises);
};