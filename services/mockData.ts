import type { FeedItem, Tag, RssFeed, PersonalItem, Template, Space, Mentor } from '../types';

// This file now only serves to provide the initial, default data structure
// for a fresh installation of the app. It is considered a private implementation
// detail of the dataService.

export const defaultTags: Tag[] = [
  { id: '1', name: 'טכנולוגיה' },
  { id: '2', name: 'פרודוקטיביות' },
  { id: '3', name: 'AI' },
  { id: '4', name: 'עיצוב' },
  { id: '5', name: 'פיננסים' },
  { id: '6', name: 'אישי' },
  { id: '7', name: 'סייבר' },
  { id: '8', name: 'פסיכולוגיה' },
];

export const defaultSpaces: Space[] = [
    { id: 'space-p1', name: 'כללי', icon: 'clipboard', color: '#A78BFA', type: 'personal', order: 0 },
    { id: 'space-p2', name: 'למידה', icon: 'brain', color: '#38BDF8', type: 'personal', order: 1 },
    { id: 'space-f1', name: 'חדשות כלליות', icon: 'feed', color: '#60A5FA', type: 'feed', order: 0 },
];

export const defaultRssFeeds: RssFeed[] = [
  { id: 'rss1', name: 'כלכליסט - שוק ההון', url: 'https://www.calcalist.co.il/rss/calcalist,0,0,14,00.xml', spaceId: 'space-f1' },
  { id: 'rss2', name: 'Dark Reading', url: 'https://www.darkreading.com/rss_simple.asp' },
  { id: 'rss3', name: 'Psychology Today', url: 'https://www.psychologytoday.com/intl/en/front/feed', spaceId: 'space-f1' },
];

export const defaultFeedItems: FeedItem[] = [
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

export const defaultPersonalItems: PersonalItem[] = [
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
        metadata: { bookStatus: 'reading' },
        spaceId: 'space-p2',
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
        spaceId: 'space-p1',
        subTasks: [
            { id: 'sub1', title: 'איסוף נתונים וסטטיסטיקות', isCompleted: true },
            { id: 'sub2', title: 'יצירת שקף פתיחה וסיום', isCompleted: true },
            { id: 'sub3', title: 'בניית גוף המצגת (3-4 שקפים עיקריים)', isCompleted: false },
            { id: 'sub4', title: 'הוספת עיצוב וגרפיקה', isCompleted: false },
            { id: 'sub5', title: 'תרגול והכנה', isCompleted: false },
        ]
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
        spaceId: 'space-p1',
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
        completionHistory: [],
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
        completionHistory: [],
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
        metadata: { duration: 60, feeling: 'great' },
        spaceId: 'space-p1',
    },
    {
        id: 'p4',
        type: 'link',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        title: "Figma: The Collaborative Interface Design Tool.",
        content: "Figma is a vector graphics editor and prototyping tool which is primarily web-based, with additional offline features enabled by desktop applications for macOS and Windows.",
        url: 'https://www.figma.com',
        domain: 'figma.com',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/1667px-Figma-logo.svg.png',
        spaceId: 'space-p2',
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
        },
        spaceId: 'space-p2',
    },
    {
        id: 'p3',
        type: 'note',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        title: 'רשימת קניות',
        content: '[x] חלב\n[x] ביצים\n[ ] לחם\n[ ] אבוקדו',
        spaceId: 'space-p1',
    }
];

export const defaultTemplates: Template[] = [
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

// --- New Mentor Data ---
export const defaultMentors: Mentor[] = [
    { 
        id: 'jordan-peterson', 
        name: 'ג\'ורדן פיטרסון', 
        description: 'פסיכולוג קליני, מחבר ואיש רוח.',
        quotes: [
            'סדר את החדר שלך. קח אחריות על המרחב המיידי שלך.',
            'השווה את עצמך למי שהיית אתמול, לא למי שמישהו אחר הוא היום.',
            'רדוף אחר מה שמשמעותי, לא אחר מה שנוח.',
            'אמור את האמת - או לפחות אל תשקר.',
            'אל תתנו לילדיכם לעשות משהו שגורם לכם לא לחבב אותם.',
            'התייחס לעצמך כאל מישהו שאתה אחראי לעזור לו.',
            'התיידד עם אנשים שרוצים את הטוב ביותר עבורך.'
        ] 
    },
    { 
        id: 'david-goggins', 
        name: 'דיוויד גוגינס', 
        description: 'רץ אולטרה-מרתון, לוחם וסופר.',
        quotes: [
            'אל תפסיק כשאתה עייף. תפסיק כשסיימת.',
            'הדבר היחיד שחשוב יותר מהכישרון שלך הוא הלב שלך.',
            'המוח שלנו הוא הנשק החזק ביותר בעולם. ברגע שאתה מבין איך לשלוט בו, אתה יכול להשיג הכל.',
            'אתה חייב לבנות קשיחות מנטלית. זה הדבר היחיד שתוכל להישען עליו כשהחיים ינסו להפיל אותך.',
            'היחיד שיכול להגיד לך שאתה לא יכול לעשות משהו זה אתה. והוא לא חייב להיות צודק.',
            'הכאב שאתה מרגיש היום יהיה הכוח שתרגיש מחר.',
            'צא מאזור הנוחות שלך כל יום.'
        ] 
    }
];
