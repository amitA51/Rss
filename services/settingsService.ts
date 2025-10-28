import type { AppSettings } from '../types';

const SETTINGS_KEY = 'spark_app_settings';

const defaultSettings: AppSettings = {
  aiModel: 'gemini-2.5-flash',
  autoSummarize: false,
  defaultScreen: 'feed',
};

export const loadSettings = (): AppSettings => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      // Merge with defaults to ensure new settings are applied
      return { ...defaultSettings, ...JSON.parse(storedSettings) };
    }
  } catch (error) {
    console.error("Failed to load settings from localStorage", error);
  }
  return defaultSettings;
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings to localStorage", error);
  }
};

const APP_DATA_KEYS = [
    'spark_tags',
    'spark_rss_feeds',
    'spark_feed_items',
    'spark_personal_items',
    SETTINGS_KEY,
];

export const wipeAllData = (): void => {
    if (window.confirm("פעולה זו תמחק לצמיתות את כל הנתונים, הפידים וההגדרות שלך. האם אתה בטוח לחלוטין?")) {
        if (window.confirm("אישור אחרון! לא תהיה דרך חזרה. האם אתה בטוח שברצונך למחוק הכל?")) {
            APP_DATA_KEYS.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.error(`Failed to remove key ${key} from localStorage`, error);
                }
            });
            alert("כל הנתונים נמחקו. האפליקציה תיטען מחדש כעת.");
            window.location.reload();
        }
    }
};