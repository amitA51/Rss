import { LOCAL_STORAGE_KEYS as LS } from '../constants';
import { defaultFeedItems, defaultPersonalItems, defaultRssFeeds, defaultTags, defaultTemplates, defaultSpaces, defaultMentors } from './mockData';
import type { FeedItem, PersonalItem, RssFeed, Tag, AppData, ExportData, Template, WatchlistItem, Space, Mentor, AiFeedSettings } from '../types';
import { loadSettings, saveSettings } from './settingsService';
import { fetchAndParseFeed } from './rssService';
import { fetchNewsForTicker, findTicker } from './financialsService';
import { generateMentorContent, generateAiFeedItems } from './geminiService';

// --- IndexedDB Wrapper (Principle 1: Offline First) ---
const DB_NAME = 'SparkDB';
const DB_VERSION = 3; // Incremented version to add auth token store
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
                    // keyPath is 'id' for collections, 'service' for auth tokens
                    const keyPath = storeName === LS.AUTH_TOKENS ? 'service' : 'id';
                    db.createObjectStore(storeName, { keyPath });
                }
            });
             if (event.oldVersion < 3) {
                if (!db.objectStoreNames.contains(LS.AUTH_TOKENS)) {
                    db.createObjectStore(LS.AUTH_TOKENS, { keyPath: 'service' });
                }
            }
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
        const request: IDBRequest<T[]> = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            resolve(request.result || []);
        };
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
        
        defaultData.forEach(item => store.put(item));

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

// --- Auth Token Management ---
export const saveToken = (service: string, token: any): Promise<void> => dbPut(LS.AUTH_TOKENS, { service, ...token });
export const getToken = (service: string): Promise<any> => dbGet(LS.AUTH_TOKENS, service);
export const removeToken = (service: string): Promise<void> => dbDelete(LS.AUTH_TOKENS, service);


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
        order: Date.now(),
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

export const cleanupCompletedTasks = async (): Promise<string[]> => {
    const allItems = await getPersonalItems();
    const now = new Date();
    const deletedIds: string[] = [];

    const tasksToDelete = allItems.filter(item => {
        if (item.type !== 'task' || !item.isCompleted || !item.autoDeleteAfter || item.autoDeleteAfter <= 0) {
            return false;
        }
        if (!item.lastCompleted) {
            return false;
        }

        const completedDate = new Date(item.lastCompleted);
        const timeDiff = now.getTime() - completedDate.getTime();
        const daysDiff = timeDiff / (1000 * 3600 * 24);

        return daysDiff > item.autoDeleteAfter;
    });

    if (tasksToDelete.length > 0) {
        const deletePromises = tasksToDelete.map(item => {
            deletedIds.push(item.id);
            return dbDelete(LS.PERSONAL_ITEMS, item.id);
        });
        await Promise.all(deletePromises);
    }

    return deletedIds;
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
    
    const personalItems = await getPersonalItems();
    const personalItemsToUpdate = personalItems
        .filter(item => item.spaceId === id)
        .map(item => ({ ...item, spaceId: undefined }));
    
    if (personalItemsToUpdate.length > 0) {
        await Promise.all(personalItemsToUpdate.map(item => dbPut(LS.PERSONAL_ITEMS, item)));
    }

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
    const assetInfo = await findTicker(ticker);
    if (!assetInfo) throw new Error(`Could not find information for ticker: ${upperTicker}`);

    const newWatchlistItem: WatchlistItem = {
        id: assetInfo.id,
        name: assetInfo.name,
        ticker: upperTicker,
        type: assetInfo.type,
    };
    await dbPut(LS.WATCHLIST, newWatchlistItem);
    return newWatchlistItem;
};

export const removeFromWatchlist = async (ticker: string): Promise<void> => {
    const watchlist = await getWatchlist();
    const itemToRemove = watchlist.find(item => item.ticker === ticker);
    if (!itemToRemove) return;
    await dbDelete(LS.WATCHLIST, itemToRemove.id);
};

// --- Data Transformation & Refresh ---
export const convertFeedItemToPersonalItem = async (item: FeedItem): Promise<PersonalItem> => {
    const newItemData: Omit<PersonalItem, 'id' | 'createdAt'> = {
        type: 'learning',
        title: item.title,
        content: item.summary_ai || item.content,
        url: item.link,
        domain: item.link ? new URL(item.link).hostname : undefined,
        metadata: {
            source: `Feed: ${item.source || 'Unknown'}`,
        }
    };
    const newPersonalItem = await addPersonalItem(newItemData);
    return newPersonalItem;
};

const generateFeedItemId = (feedItem: { guid: string; link?: string; title: string }): string => {
    const content = feedItem.guid || feedItem.link || feedItem.title;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return `feed-${Math.abs(hash).toString(16)}`;
};

export const refreshAllFeeds = async (): Promise<FeedItem[]> => {
    const settings = loadSettings();
    const allFeeds = await getFeeds();
    const existingItems = await getFeedItems();
    const existingItemIds = new Set(existingItems.map(item => item.id));
    let newItems: FeedItem[] = [];

    // 1. Generate AI Feed Items if enabled
    if (settings.aiFeedSettings.isEnabled && settings.aiFeedSettings.itemsPerRefresh > 0) {
        try {
            const existingTitles = existingItems.map(item => item.title);
            const generatedData = await generateAiFeedItems(settings.aiFeedSettings, existingTitles);
            
            const aiItems: FeedItem[] = generatedData.map((itemData, index) => ({
                id: `ai-${Date.now()}-${index}`,
                type: 'spark',
                title: itemData.title,
                content: itemData.summary_he,
                summary_ai: itemData.summary_he,
                insights: itemData.insights,
                topics: itemData.topics,
                tags: itemData.tags.map(t => ({ id: t, name: t })),
                level: itemData.level,
                estimated_read_time_min: itemData.estimated_read_time_min,
                digest: itemData.digest,
                is_read: false,
                is_spark: true,
                createdAt: new Date().toISOString(),
                source: "AI_GENERATED",
                source_trust_score: 95,
            }));

            newItems.push(...aiItems);
            aiItems.forEach(item => existingItemIds.add(item.id));

        } catch (error) {
            console.error("Failed to generate AI feed items:", error);
        }
    }


    // 2. Refresh RSS Feeds
    for (const feed of allFeeds) {
        try {
            const parsedFeed = await fetchAndParseFeed(feed.url);
            for (const item of parsedFeed.items.slice(0, 10)) {
                const newItemId = generateFeedItemId(item);
                if (!existingItemIds.has(newItemId)) {
                    newItems.push({
                        id: newItemId,
                        type: 'rss',
                        title: item.title,
                        link: item.link,
                        content: item.content,
                        is_read: false,
                        is_spark: false,
                        tags: [],
                        createdAt: new Date(item.pubDate).toISOString(),
                        source: feed.id,
                    });
                    existingItemIds.add(newItemId);
                }
            }
        } catch (error) {
            console.error(`Failed to refresh feed ${feed.name}:`, error);
        }
    }

    // 3. Refresh Mentor Feeds
    const allMentors = await getMentors();
    const enabledMentors = allMentors.filter(m => settings.enabledMentorIds.includes(m.id));
    for (const mentor of enabledMentors) {
        if (mentor.quotes && mentor.quotes.length > 0) {
            const today = new Date().toDateString();
            const hasPostedToday = existingItems.some(item =>
                item.source === `mentor:${mentor.id}` && new Date(item.createdAt).toDateString() === today
            );
            if (!hasPostedToday) {
                const quote = mentor.quotes[new Date().getDate() % mentor.quotes.length];
                const newItem: FeedItem = {
                    id: `mentor-${mentor.id}-${new Date().toISOString().split('T')[0]}`,
                    type: 'mentor',
                    title: `ציטוט מאת ${mentor.name}`,
                    content: quote,
                    is_read: false, is_spark: false, tags: [],
                    createdAt: new Date().toISOString(),
                    source: `mentor:${mentor.id}`,
                };
                if (!existingItemIds.has(newItem.id)) newItems.push(newItem);
            }
        }
    }

    // 4. Refresh Financial News
    const watchlist = await getWatchlist();
    for (const item of watchlist) {
        try {
            const newsItems = await fetchNewsForTicker(item.ticker, item.type);
            for (const news of newsItems) {
                const newItemId = `news-${news.id}`;
                if (!existingItemIds.has(newItemId)) {
                    newItems.push({
                        id: newItemId,
                        type: 'news',
                        title: news.headline,
                        link: news.url,
                        content: news.summary,
                        is_read: false, is_spark: false,
                        tags: [{id: item.ticker, name: item.ticker}],
                        createdAt: new Date(news.datetime * 1000).toISOString(),
                        source: item.ticker,
                    });
                     existingItemIds.add(newItemId);
                }
            }
        } catch (error) {
            console.error(`Failed to fetch news for ${item.ticker}:`, error);
        }
    }

    if (newItems.length > 0) {
        await Promise.all(newItems.map(item => dbPut(LS.FEED_ITEMS, item)));
    }

    return newItems;
};

// --- Mentor Management ---
export const getMentors = async (): Promise<Mentor[]> => {
    const customMentors = await initializeDefaultData<Mentor>(LS.CUSTOM_MENTORS, []);
    return [...defaultMentors, ...customMentors];
};

export const addCustomMentor = async (name: string): Promise<Mentor> => {
    const quotes = await generateMentorContent(name);
    if (quotes.length === 0) throw new Error("Could not generate content for this mentor.");
    const newMentor: Mentor = {
        id: `custom-${Date.now()}`,
        name,
        description: 'Custom AI-powered mentor',
        isCustom: true,
        quotes,
    };
    await dbPut(LS.CUSTOM_MENTORS, newMentor);
    return newMentor;
};

export const reAddCustomMentor = (mentor: Mentor): Promise<void> => dbPut(LS.CUSTOM_MENTORS, mentor);

export const refreshMentorContent = async (mentorId: string): Promise<Mentor> => {
    const mentors = await getMentors();
    const mentor = mentors.find(m => m.id === mentorId);
    if (!mentor || !mentor.isCustom) throw new Error("Mentor not found or not a custom mentor.");
    const newQuotes = await generateMentorContent(mentor.name);
    if (newQuotes.length === 0) throw new Error("Could not refresh content.");
    const updatedMentor = { ...mentor, quotes: newQuotes };
    await dbPut(LS.CUSTOM_MENTORS, updatedMentor);
    return updatedMentor;
};

export const removeCustomMentor = async (mentorId: string): Promise<void> => {
    await dbDelete(LS.CUSTOM_MENTORS, mentorId);
    const settings = loadSettings();
    const newEnabledMentorIds = settings.enabledMentorIds.filter(id => id !== mentorId);
    saveSettings({ ...settings, enabledMentorIds: newEnabledMentorIds });
};

// --- Data Management (Export/Import/Wipe) ---
export const exportAllData = async (): Promise<string> => {
    const data: AppData = {
        tags: await dbGetAll(LS.TAGS),
        rssFeeds: await dbGetAll(LS.RSS_FEEDS),
        feedItems: await dbGetAll(LS.FEED_ITEMS),
        personalItems: await dbGetAll(LS.PERSONAL_ITEMS),
        templates: await dbGetAll(LS.TEMPLATES),
        watchlist: await dbGetAll(LS.WATCHLIST),
        spaces: await dbGetAll(LS.SPACES),
        customMentors: await dbGetAll(LS.CUSTOM_MENTORS),
    };
    const exportData: ExportData = {
        settings: loadSettings(),
        data: data,
        exportDate: new Date().toISOString(),
        version: DB_VERSION,
    };
    return JSON.stringify(exportData, null, 2);
};

export const importAllData = async (jsonData: string): Promise<void> => {
    const importData: ExportData = JSON.parse(jsonData);
    if (importData.version > DB_VERSION) {
        throw new Error("Import file is from a newer version of the app.");
    }
    
    await wipeAllData(false);

    saveSettings(importData.settings);

    const data = importData.data;
    const storesToImport = [
      { name: LS.TAGS, data: data.tags },
      { name: LS.RSS_FEEDS, data: data.rssFeeds },
      { name: LS.FEED_ITEMS, data: data.feedItems },
      { name: LS.PERSONAL_ITEMS, data: data.personalItems },
      { name: LS.TEMPLATES, data: data.templates },
      { name: LS.WATCHLIST, data: data.watchlist },
      { name: LS.SPACES, data: data.spaces },
      { name: LS.CUSTOM_MENTORS, data: data.customMentors },
    ];

    for (const storeInfo of storesToImport) {
        if (storeInfo.data && storeInfo.data.length > 0) {
            await Promise.all(storeInfo.data.map(item => dbPut(storeInfo.name, item)));
        }
    }
};

export const wipeAllData = async (resetSettings = true): Promise<void> => {
    await Promise.all(OBJECT_STORES.map(storeName => {
        if (storeName !== LS.AUTH_TOKENS) {
            return dbClear(storeName);
        }
        return Promise.resolve();
    }));
    if (resetSettings) {
        localStorage.removeItem(LS.SETTINGS);
    }
};