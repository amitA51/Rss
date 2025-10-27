import type { FeedItem, Tag, RssFeed } from '../types';

// --- LocalStorage Persistence ---
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        if (item) return JSON.parse(item);
    } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
    }
    // If we return defaultValue, we should also save it to initialize storage
    saveToStorage(key, defaultValue);
    return defaultValue;
};

const saveToStorage = <T>(key: string, value: T): void => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
    }
};


// --- Default Data ---
const defaultTags: Tag[] = [
  { id: '1', name: 'טכנולוגיה' },
  { id: '2', name: 'פרודוקטיביות' },
  { id: '3', name: 'AI' },
  { id: '4', name: 'עיצוב' },
  { id: '5', name: 'פיננסים' },
  { id: '6', name: 'אישי' },
  { id: '7', name: 'סייבר' },
  { id: '8', name: 'פסיכולוגיה' },
];

const defaultRssFeeds: RssFeed[] = [
  { id: 'rss1', name: 'כלכליסט - שוק ההון', url: 'https://www.calcalist.co.il/rss/calcalist,0,0,14,00.xml' },
  { id: 'rss2', name: 'Dark Reading', url: 'https://www.darkreading.com/rss_simple.asp' },
  { id: 'rss3', name: 'Psychology Today', url: 'https://www.psychologytoday.com/intl/en/front/feed' },
];

// Initial items now only contain sparks, RSS items will be fetched live.
const defaultFeedItems: FeedItem[] = [
  {
    id: 'b2',
    type: 'spark',
    title: 'רעיון לאפליקציה: ניהול משימות מבוסס מיקום',
    content: 'לפתח אפליקציה שמציגה תזכורות ומשימות רק כאשר המשתמש נמצא במיקום הרלוונטי. למשל, תזכורת לקנות חלב כשנמצאים ליד הסופר, או רשימת מטלות לבית כשמגיעים הביתה. להשתמש ב-Geofencing כדי לחסוך בסוללה.',
    summary_ai: 'אפליקציה לניהול משימות שתציג תזכורות לפי מיקום המשתמש, לדוגמה ליד הסופר או בבית, באמצעות טכנולוגיית Geofencing.',
    is_read: true,
    is_spark: true,
    tags: [defaultTags[1], defaultTags[5]],
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
  },
  {
    id: 'e5',
    type: 'spark',
    title: 'סיכום שיחה עם יועץ',
    content: 'לגוון את תיק ההשקעות. לא לשים את כל הביצים בסל אחד. לבדוק אפיקים סולידיים יותר בנוסף למניות טכנולוגיה. להגדיר יעדים ברורים לכל השקעה - טווח קצר, בינוני וארוך.',
    is_read: true,
    is_spark: true,
    tags: [defaultTags[4], defaultTags[5]],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  },
];


// --- Exported Live Data ---
export let mockTags: Tag[] = loadFromStorage('spark_tags', defaultTags);
export let mockRssFeeds: RssFeed[] = loadFromStorage('spark_rss_feeds', defaultRssFeeds);
export let mockFeedItems: FeedItem[] = loadFromStorage('spark_feed_items', defaultFeedItems);

// --- Savers ---
export const saveTags = () => saveToStorage('spark_tags', mockTags);
export const saveRssFeeds = () => saveToStorage('spark_rss_feeds', mockRssFeeds);
export const saveFeedItems = () => saveToStorage('spark_feed_items', mockFeedItems);