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
  id: string;
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
  type: 'workout' | 'note' | 'learning' | 'link';
  createdAt: string;
  title: string;
  content: string; // Used for notes, link summaries, and general description for learning/workouts
  
  // Link specific
  url?: string;
  domain?: string;
  imageUrl?: string;

  // Workout specific
  exercises?: Exercise[];
  
  // Metadata for various types
  metadata?: {
    // For workouts
    duration?: number; // in minutes
    feeling?: 'bad' | 'ok' | 'good' | 'great';
    // For learning
    status?: 'to-learn' | 'learning' | 'learned';
    source?: string; // Can be a URL, but also a book title etc.
    key_takeaways?: string[];
    // For links (AI suggested)
    suggestedTags?: string[];
  };
}

// --- New Types for Settings and Data Management ---

export interface AppSettings {
  aiModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  autoSummarize: boolean;
  defaultScreen: 'feed' | 'personal';
}

export interface AppData {
  tags: Tag[];
  rssFeeds: RssFeed[];
  feedItems: FeedItem[];
  personalItems: PersonalItem[];
}

export interface ExportData {
  settings: AppSettings;
  data: AppData;
  exportDate: string;
  version: number;
}