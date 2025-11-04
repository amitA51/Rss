// constants.ts
import type { PersonalItemType } from "./types";

/**
 * Centralized keys for localStorage to prevent typos and ensure consistency.
 */
export const LOCAL_STORAGE_KEYS = {
  SETTINGS: 'spark_settings',
  TAGS: 'spark_tags',
  RSS_FEEDS: 'spark_rss_feeds',
  FEED_ITEMS: 'spark_feed_items',
  PERSONAL_ITEMS: 'spark_personal_items',
  TEMPLATES: 'spark_templates',
  WATCHLIST: 'spark_watchlist',
  SPACES: 'spark_spaces',
  CUSTOM_MENTORS: 'spark_custom_mentors',
};

/**
 * Defines the types of items that can be created in the feed.
 */
export const FEED_ITEM_TYPES = ['rss', 'spark', 'news', 'mentor'] as const;

/**
 * Defines the types of items that are considered personal and appear on the home screen.
 */
export const PERSONAL_ITEM_TYPES = ['task', 'habit', 'workout', 'note', 'link', 'learning', 'goal', 'journal', 'book', 'idea', 'gratitude', 'roadmap'] as const;

/**
 * A combined list of all possible item types in the application.
 */
export const ITEM_TYPES = [...FEED_ITEM_TYPES, ...PERSONAL_ITEM_TYPES] as const;


// --- Filter Types ---

export const FEED_FILTER_TYPES = ['all', 'unread', 'sparks', 'rss'] as const;
export const PERSONAL_ITEM_FILTER_TYPES = ['all', 'task', 'habit', 'book', 'note', 'link', 'learning', 'goal', 'journal', 'workout', 'idea', 'roadmap'] as const;


// --- UI Constants ---
export const PERSONAL_ITEM_TYPE_COLORS: Record<PersonalItemType, string> = {
    task: 'var(--success)',
    habit: '#F472B6',
    workout: '#F472B6',
    note: 'var(--warning)',
    link: '#60A5FA',
    learning: '#38BDF8',
    goal: '#2DD4BF',
    journal: '#F0ABFC',
    book: '#A78BFA',
    idea: 'var(--warning)',
    gratitude: 'var(--accent-highlight)',
    roadmap: '#3B82F6',
};

export const AVAILABLE_ICONS = [
    'sparkles', 'lightbulb', 'clipboard', 'check-circle', 'link', 'summarize',
    'user', 'book-open', 'target', 'dumbbell', 'feed', 'chart-bar', 'brain', 'roadmap'
] as const;