import type { AppSettings, Screen, HomeScreenComponent, ThemeSettings, UiDensity } from '../types';
import { LOCAL_STORAGE_KEYS as LS } from '../constants';

const defaultThemes: Record<string, ThemeSettings> = {
    gold: { name: 'Gold', accentColor: '#E5B84B', font: 'inter', cardStyle: 'glass', backgroundEffect: true },
    crimson: { name: 'Crimson', accentColor: '#DC2626', font: 'lato', cardStyle: 'bordered', backgroundEffect: false },
    emerald: { name: 'Emerald', accentColor: '#059669', font: 'inter', cardStyle: 'flat', backgroundEffect: true },
    nebula: { name: 'Nebula', accentColor: '#8B5CF6', font: 'source-code-pro', cardStyle: 'glass', backgroundEffect: true },
    oceanic: { name: 'Oceanic', accentColor: '#3B82F6', font: 'inter', cardStyle: 'flat', backgroundEffect: false },
};

const defaultSettings: AppSettings = {
  aiModel: 'gemini-2.5-flash',
  autoSummarize: false,
  defaultScreen: 'today',
  themeSettings: defaultThemes.gold,
  notificationsEnabled: false,
  lastAddedType: 'task',
  enableIntervalTimer: true,
  enablePeriodicSync: false, // Added default value
  uiDensity: 'comfortable',
  navBarLayout: ['feed', 'today', 'add', 'investments', 'library'],
  enabledMentorIds: [],
  feedViewMode: 'list',
  screenLabels: {
    feed: 'פיד',
    today: 'היום',
    add: 'הוספה',
    investments: 'השקעות',
    library: 'המתכנן',
    search: 'חיפוש',
    settings: 'הגדרות',
  },
  intervalTimerSettings: {
    restDuration: 90,
    workDuration: 25 * 60,
    autoStartNext: true,
  },
  homeScreenLayout: [
    { id: 'gratitude', isVisible: true },
    { id: 'habits', isVisible: true },
    { id: 'tasks', isVisible: true },
  ],
  sectionLabels: {
    gratitude: 'הכרת תודה',
    habits: 'הרגלים להיום',
    tasks: 'משימות פתוחות',
  },
};

// Helper to merge layouts, keeping user's visibility but adding new components if they exist in default
const mergeLayouts = (userLayout: HomeScreenComponent[], defaultLayout: HomeScreenComponent[]): HomeScreenComponent[] => {
    const userLayoutMap = new Map(userLayout.map(c => [c.id, c]));
    const newLayout = defaultLayout.map(defaultComp => 
        userLayoutMap.has(defaultComp.id) 
            ? userLayoutMap.get(defaultComp.id)! 
            : defaultComp
    );
    // Also ensure components user has that are no longer in default are removed
    return newLayout.filter(comp => defaultLayout.some(d => d.id === comp.id));
}


export const loadSettings = (): AppSettings => {
  try {
    const storedSettings = localStorage.getItem(LS.SETTINGS);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      
      // Migration for users who had 'home' as default
      if (parsed.defaultScreen === 'home') {
        parsed.defaultScreen = 'today';
      }

      // Migration from old show/hide toggles to new layout object
      if (parsed.showGratitude !== undefined && !parsed.homeScreenLayout) {
        parsed.homeScreenLayout = [
            { id: 'gratitude', isVisible: parsed.showGratitude },
            { id: 'habits', isVisible: parsed.showHabits },
            { id: 'tasks', isVisible: parsed.showTasks },
        ];
        // Clean up old properties
        delete parsed.showGratitude;
        delete parsed.showHabits;
        delete parsed.showTasks;
      }
      
      // MIGRATION: from simple theme string to ThemeSettings object
      if (typeof parsed.theme === 'string' && !parsed.themeSettings) {
          parsed.themeSettings = defaultThemes[parsed.theme as keyof typeof defaultThemes] || defaultThemes.gold;
          delete parsed.theme;
      }
      
      // Merge with defaults to ensure new settings are applied
      return { 
          ...defaultSettings, 
          ...parsed, 
          themeSettings: { ...defaultSettings.themeSettings, ...parsed.themeSettings },
          screenLabels: { ...defaultSettings.screenLabels, ...parsed.screenLabels },
          intervalTimerSettings: { ...defaultSettings.intervalTimerSettings, ...parsed.intervalTimerSettings },
          sectionLabels: { ...defaultSettings.sectionLabels, ...parsed.sectionLabels },
          homeScreenLayout: parsed.homeScreenLayout ? mergeLayouts(parsed.homeScreenLayout, defaultSettings.homeScreenLayout) : defaultSettings.homeScreenLayout,
          // FIX: Ensure navBarLayout is an array before using it.
          navBarLayout: (Array.isArray(parsed.navBarLayout) && parsed.navBarLayout.length > 0) ? parsed.navBarLayout : defaultSettings.navBarLayout,
          enabledMentorIds: parsed.enabledMentorIds || [],
      };
    }
  } catch (error) {
    console.error("Failed to load settings from localStorage", error);
  }
  return defaultSettings;
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    // Remove deprecated properties before saving
    const settingsToSave = { ...settings };
    delete (settingsToSave as any).showGratitude;
    delete (settingsToSave as any).showHabits;
    delete (settingsToSave as any).showTasks;
    delete (settingsToSave as any).theme;

    localStorage.setItem(LS.SETTINGS, JSON.stringify(settingsToSave));
  } catch (error) {
    console.error("Failed to save settings to localStorage", error);
  }
};