import type { FeedItem, Tag, RssFeed, PersonalItem, AppData, Template } from '../types';

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

const defaultPersonalItems: PersonalItem[] = [
     {
        id: 'p10',
        type: 'book',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'Sapiens: A Brief History of Humankind',
        author: 'Yuval Noah Harari',
        totalPages: 443,
        currentPage: 120,
        content: 'A thought-provoking book about the history of our species. The cognitive revolution is a key concept.',
        quotes: [
            "We did not domesticate wheat. It domesticated us.",
            "The romantic ideal of 'following your heart' is an invention of the last few centuries."
        ],
        metadata: { bookStatus: 'reading' }
    },
    {
        id: 'p5',
        type: 'task',
        createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        title: 'להכין מצגת לפגישת צוות',
        content: '',
        isCompleted: false,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
        priority: 'high',
    },
    {
        id: 'p6',
        type: 'task',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        title: 'לקנות כרטיסים להופעה',
        content: 'לבדוק מחירים בטיקטמאסטר ובזאפה',
        isCompleted: true,
        priority: 'medium',
    },
    {
        id: 'p9',
        type: 'task',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'להתקשר לרואה חשבון',
        content: '',
        isCompleted: false,
        priority: 'low',
    },
    {
        id: 'p7',
        type: 'habit',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'מדיטציה 10 דקות',
        content: 'להשתמש באפליקציית Headspace',
        streak: 12,
        lastCompleted: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        frequency: 'daily',
    },
    {
        id: 'p8',
        type: 'habit',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'קריאה לפני השינה',
        content: 'לפחות 15 דקות כל יום',
        streak: 4,
        lastCompleted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        frequency: 'daily',
    },
    {
        id: 'p1',
        type: 'workout',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'אימון רגליים',
        content: 'אימון קשה אבל מספק. הרגשתי התקדמות בסקוואט.',
        exercises: [
            { id: 'ex1', name: 'סקוואט', sets: [{ reps: 8, weight: 80 }, { reps: 8, weight: 80 }, { reps: 6, weight: 85 }] },
            { id: 'ex2', name: 'דדליפט רומני', sets: [{ reps: 10, weight: 60 }, { reps: 10, weight: 60 }, { reps: 12, weight: 55 }] },
            { id: 'ex3', name: 'מכרעים', sets: [{ reps: 12, weight: 20 }, { reps: 12, weight: 20 }] },
        ],
        metadata: { duration: 60, feeling: 'great' }
    },
    {
        id: 'p4',
        type: 'link',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Figma: The Collaborative Interface Design Tool.",
        content: "Figma is a vector graphics editor and prototyping tool which is primarily web-based, with additional offline features enabled by desktop applications for macOS and Windows.",
        url: 'https://www.figma.com',
        domain: 'figma.com',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/1667px-Figma-logo.svg.png'
    },
    {
        id: 'p2',
        type: 'learning',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'React Server Components',
        content: 'הבנתי את ההבדל העיקרי בין קומפוננטות שרת לקליינט. קומפוננטות שרת מרנדרות בשרת בלבד ואין להן state או lifecycle methods.',
        metadata: {
            status: 'learning',
            source: 'https://react.dev/blog',
            key_takeaways: [
                "RSCs render ahead of time, on the server.",
                "They can directly access server-side resources (e.g., databases).",
                "They produce zero client-side JavaScript bundle size.",
            ]
        }
    },
    {
        id: 'p3',
        type: 'note',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        title: 'רשימת קניות',
        content: '[x] חלב\n[x] ביצים\n[ ] לחם\n[ ] אבוקדו',
    }
];

const defaultTemplates: Template[] = [
    {
        id: 'template-1',
        name: 'סקירה שבועית',
        type: 'journal',
        content: {
            title: 'סקירה שבועית - {DATE}',
            content: '## ✅ השבוע הצלחתי\n\n- \n\n## 챌린지 השבוע\n\n- \n\n## 🎯 פוקוס לשבוע הבא\n\n- '
        }
    },
    {
        id: 'template-2',
        name: 'אימון רגליים',
        type: 'workout',
        content: {
            title: 'אימון רגליים',
            exercises: [
                { id: 't-ex1', name: 'סקוואט', sets: [{ reps: 8, weight: 0 }, { reps: 8, weight: 0 }, { reps: 8, weight: 0 }] },
                { id: 't-ex2', name: 'דדליפט רומני', sets: [{ reps: 10, weight: 0 }, { reps: 10, weight: 0 }] },
            ]
        }
    }
];

// --- Exported Live Data ---
export let mockTags: Tag[] = loadFromStorage('spark_tags', defaultTags);
export let mockRssFeeds: RssFeed[] = loadFromStorage('spark_rss_feeds', defaultRssFeeds);
export let mockFeedItems: FeedItem[] = loadFromStorage('spark_feed_items', defaultFeedItems);
export let mockPersonalItems: PersonalItem[] = loadFromStorage('spark_personal_items', defaultPersonalItems);
export let mockTemplates: Template[] = loadFromStorage('spark_templates', defaultTemplates);

// --- Savers ---
export const saveTags = () => saveToStorage('spark_tags', mockTags);
export const saveRssFeeds = () => saveToStorage('spark_rss_feeds', mockRssFeeds);
export const saveFeedItems = () => saveToStorage('spark_feed_items', mockFeedItems);
export const savePersonalItems = () => saveToStorage('spark_personal_items', mockPersonalItems);
export const saveTemplates = () => saveToStorage('spark_templates', mockTemplates);

// --- Bulk Data Operations ---
export const getAllData = (): AppData => ({
  tags: mockTags,
  rssFeeds: mockRssFeeds,
  feedItems: mockFeedItems,
  personalItems: mockPersonalItems,
  templates: mockTemplates,
});

export const replaceAllData = (data: AppData): void => {
  mockTags = data.tags || [];
  mockRssFeeds = data.rssFeeds || [];
  mockFeedItems = data.feedItems || [];
  mockPersonalItems = data.personalItems || [];
  mockTemplates = data.templates || [];
  
  saveTags();
  saveRssFeeds();
  saveFeedItems();
  savePersonalItems();
  saveTemplates();
};