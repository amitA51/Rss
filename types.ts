export interface Tag {
  id: string;
  name: string;
}

export interface Attachment {
  name: string;
  type: 'drive' | 'local';
  url: string; // Google Drive link or Data URL for local file
  mimeType: string;
}

export interface FeedItem {
  id:string;
  type: 'rss' | 'spark';
  title: string;
  link?: string;
  content: string;
  summary_ai?: string;
  is_read: boolean;
  is_spark: boolean;
  tags: Tag[];
  createdAt: string;
  attachments?: Attachment[];
}

export interface RssFeed {
  id:string;
  url: string;
  name: string;
}

export interface WorkoutSet {
  reps: number;
  weight: number;
}

export interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

export interface PersonalItem {
  id: string;
  type: 'workout' | 'note' | 'learning' | 'link' | 'task' | 'habit' | 'goal' | 'journal' | 'book';
  createdAt: string;
  title: string;
  content: string; // Used for notes, link summaries, journal entries, book summaries
  
  // Link specific
  url?: string;
  domain?: string;
  imageUrl?: string;

  // Workout specific
  exercises?: Exercise[];
  
  // Task specific
  isCompleted?: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';

  // Habit specific
  streak?: number;
  lastCompleted?: string; // ISO date string
  frequency?: 'daily' | 'weekly';
  
  // Book specific
  author?: string;
  totalPages?: number;
  currentPage?: number;
  quotes?: string[];
  coverImageUrl?: string;

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

export interface AppSettings {
  aiModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  autoSummarize: boolean;
  defaultScreen: 'feed' | 'home';
}

export interface AppData {
  tags: Tag[];
  rssFeeds: RssFeed[];
  feedItems: FeedItem[];
  personalItems: PersonalItem[];
  templates: Template[];
}

export interface ExportData {
  settings: AppSettings;
  data: AppData;
  exportDate: string;
  version: number;
}