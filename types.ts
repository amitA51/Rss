import { ITEM_TYPES, PERSONAL_ITEM_TYPES } from './constants';

export type Screen = 'feed' | 'search' | 'add' | 'today' | 'library' | 'settings' | 'investments';
export type ItemType = typeof ITEM_TYPES[number];
export type PersonalItemType = typeof PERSONAL_ITEM_TYPES[number];

export interface Tag {
  id: string;
  name: string;
}

export interface Space {
  id: string;
  name: string;
  icon: string; // Icon identifier
  color: string; // Hex color or CSS variable
  type: 'personal' | 'feed';
  order: number;
}

export interface Attachment {
  name: string;
  type: 'drive' | 'local';
  url: string; // Google Drive link or Data URL for local file
  mimeType: string;
}

export interface FeedItem {
  id:string;
  type: 'rss' | 'spark' | 'news' | 'mentor';
  title: string;
  link?: string;
  content: string;
  summary_ai?: string;
  is_read: boolean;
  is_spark: boolean;
  isImportant?: boolean;
  tags: Tag[];
  createdAt: string;
  attachments?: Attachment[];
  source?: string; // e.g., 'BTC' for news, RSS feed ID, or mentor ID `mentor:jordan-peterson`
}

export interface RssFeed {
  id:string;
  url: string;
  name: string;
  spaceId?: string;
}

export interface WorkoutSet {
  reps: number;
  weight: number;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

export interface FocusSession {
  date: string; // ISO date string
  duration: number; // in minutes
}

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  duration: string; // e.g., "2 weeks", "1 day"
  isCompleted: boolean;
  notes?: string;
  subTasks?: SubTask[];
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface PersonalItem {
  id: string;
  type: PersonalItemType;
  createdAt: string;
  title: string;
  content: string; // Used for notes, link summaries, journal entries, book summaries
  projectId?: string; // ID of the parent goal/project
  spaceId?: string; // New: For categorization into Spaces
  attachments?: Attachment[];
  icon?: string; // Icon identifier for the item
  
  // Link specific
  url?: string;
  domain?: string;
  imageUrl?: string;

  // Workout specific
  exercises?: Exercise[];
  
  // Task specific
  isCompleted?: boolean;
  isImportant?: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  focusSessions?: FocusSession[];
  subTasks?: SubTask[];

  // Habit specific
  streak?: number;
  lastCompleted?: string; // ISO date string
  completionHistory?: { date: string }[];
  frequency?: 'daily' | 'weekly';
  
  // Book specific
  author?: string;
  totalPages?: number;
  currentPage?: number;
  quotes?: string[];
  coverImageUrl?: string;

  // Roadmap specific
  steps?: RoadmapStep[];

  // For Kanban board view
  status?: 'todo' | 'doing' | 'done';

  // Learning specific
  flashcards?: { id: string; question: string; answer: string; }[];

  // Metadata for various types
  metadata?: {
    // For workouts
    duration?: number; // in minutes
    feeling?: 'bad' | 'ok' | 'good' | 'great';
    // For learning
    status?: 'to-learn' | 'learning' | 'learned';
    source?: string; // Can be a URL, but also a book title etc.
    key_takeaways?: string[];
    // For goals
    targetDate?: string;
    // For journal
    mood?: 'awful' | 'bad' | 'ok' | 'good' | 'great';
    // For links (AI suggested)
    suggestedTags?: string[];
    // For books
    bookStatus?: 'to-read' | 'reading' | 'finished';
  };
}

export interface Template {
  id: string;
  name: string;
  type: PersonalItem['type'];
  // The content is a partial PersonalItem that holds the template data
  content: Partial<PersonalItem>;
}


// --- New Types for Settings and Data Management ---

export type AddableType = PersonalItemType | 'spark' | 'ticker';
export type AppFont = 'inter' | 'lato' | 'source-code-pro' | 'heebo' | 'rubik' | 'alef';
export type CardStyle = 'glass' | 'flat' | 'bordered';
export type HomeScreenComponentId = 'gratitude' | 'habits' | 'tasks';
export type UiDensity = 'comfortable' | 'compact';
export type FeedViewMode = 'list' | 'visual';

export interface ThemeSettings {
  name: string; // e.g., "Gold", "Crimson", "Custom"
  accentColor: string; // hex color
  font: AppFont;
  cardStyle: CardStyle;
  backgroundEffect: boolean;
}

export interface IntervalTimerSettings {
  restDuration: number; // in seconds
  workDuration: number; // in seconds
  autoStartNext: boolean;
}

export interface HomeScreenComponent {
  id: HomeScreenComponentId;
  isVisible: boolean;
}

export interface AppSettings {
  aiModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  autoSummarize: boolean;
  defaultScreen: 'feed' | 'today';
  themeSettings: ThemeSettings;
  notificationsEnabled: boolean;
  lastAddedType?: AddableType;
  enableIntervalTimer: boolean;
  screenLabels: Partial<Record<Screen, string>>;
  
  // New granular settings
  intervalTimerSettings: IntervalTimerSettings;
  homeScreenLayout: HomeScreenComponent[];
  sectionLabels: Record<HomeScreenComponentId, string>;
  enablePeriodicSync: boolean; // Added for PWA background sync
  uiDensity: UiDensity;
  navBarLayout: Screen[];
  enabledMentorIds: string[];
  feedViewMode: FeedViewMode;
}

export interface WatchlistItem {
    id: string; // e.g., 'bitcoin' for crypto, 'TSLA' for stock
    name: string; // e.g., 'Bitcoin', 'Tesla Inc.'
    ticker: string; // e.g., 'BTC', 'TSLA'
    type: 'crypto' | 'stock';
}

export interface FinancialAsset extends WatchlistItem {
    price?: number;
    change24h?: number;
    marketCap?: number;
    sparkline?: number[]; // for 7d chart
    dailyChart?: { time: number; price: number }[];
}

export interface AppData {
  tags: Tag[];
  rssFeeds: RssFeed[];
  feedItems: FeedItem[];
  personalItems: PersonalItem[];
  templates: Template[];
  watchlist: WatchlistItem[];
  spaces: Space[];
  customMentors: Mentor[];
}

export interface ExportData {
  settings: AppSettings;
  data: AppData;
  exportDate: string;
  version: number;
}

// --- New Mentor Types ---
export interface Mentor {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean; // To identify user-added mentors
  quotes: string[]; // The AI-generated or default content
}