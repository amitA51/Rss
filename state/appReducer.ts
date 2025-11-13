import type { FeedItem, PersonalItem, AppSettings, Space, AddableType, FeedViewMode, GoogleCalendarEvent } from '../types';
import { loadSettings, saveSettings } from '../services/settingsService';

export interface AppState {
  isLoading: boolean;
  error: string | null;
  feedItems: FeedItem[];
  personalItems: PersonalItem[];
  spaces: Space[];
  settings: AppSettings;
  focusSession: { item: PersonalItem; startTime: number } | null;
  googleAuthState: 'loading' | 'signedIn' | 'signedOut';
  calendarEvents: GoogleCalendarEvent[];
}

export type AppAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { feedItems: FeedItem[]; personalItems: PersonalItem[]; spaces: Space[] } }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_FEED_ITEM'; payload: FeedItem }
  | { type: 'UPDATE_FEED_ITEM'; payload: { id: string; updates: Partial<FeedItem> } }
  | { type: 'BATCH_UPDATE_FEED_ITEMS'; payload: { id: string; updates: Partial<FeedItem> }[] }
  | { type: 'REMOVE_FEED_ITEM'; payload: string }
  | { type: 'ADD_PERSONAL_ITEM'; payload: PersonalItem }
  | { type: 'UPDATE_PERSONAL_ITEM'; payload: { id: string; updates: Partial<PersonalItem> } }
  | { type: 'REMOVE_PERSONAL_ITEM'; payload: string }
  | { type: 'SET_ALL_DATA', payload: { feedItems: FeedItem[], personalItems: PersonalItem[], spaces: Space[] } }
  | { type: 'SET_SETTINGS', payload: AppSettings }
  | { type: 'ADD_SPACE'; payload: Space }
  | { type: 'UPDATE_SPACE'; payload: { id: string; updates: Partial<Space> } }
  | { type: 'REMOVE_SPACE'; payload: string }
  | { type: 'SET_SPACES'; payload: Space[] }
  | { type: 'START_FOCUS_SESSION'; payload: PersonalItem }
  | { type: 'CLEAR_FOCUS_SESSION' }
  | { type: 'SET_LAST_ADDED_TYPE'; payload: AddableType }
  | { type: 'SET_FEED_VIEW_MODE'; payload: FeedViewMode }
  | { type: 'SET_GOOGLE_AUTH_STATE'; payload: 'loading' | 'signedIn' | 'signedOut' }
  | { type: 'SET_CALENDAR_EVENTS'; payload: GoogleCalendarEvent[] };


export const initialState: AppState = {
  isLoading: true,
  error: null,
  feedItems: [],
  personalItems: [],
  spaces: [],
  settings: loadSettings(),
  focusSession: null,
  googleAuthState: 'loading',
  calendarEvents: [],
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        feedItems: action.payload.feedItems,
        personalItems: action.payload.personalItems,
        spaces: action.payload.spaces,
      };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    
    case 'ADD_FEED_ITEM':
      return { ...state, feedItems: [action.payload, ...state.feedItems] };
      
    case 'UPDATE_FEED_ITEM':
      return {
        ...state,
        feedItems: state.feedItems.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
        ),
      };
      
    case 'BATCH_UPDATE_FEED_ITEMS': {
        const updatesMap = new Map(action.payload.map(u => [u.id, u.updates]));
        return {
            ...state,
            feedItems: state.feedItems.map(item => 
                updatesMap.has(item.id) ? { ...item, ...updatesMap.get(item.id) } : item
            ),
        };
    }
      
    case 'REMOVE_FEED_ITEM':
      return { ...state, feedItems: state.feedItems.filter(item => item.id !== action.payload) };

    case 'ADD_PERSONAL_ITEM':
        return { ...state, personalItems: [action.payload, ...state.personalItems] };
    
    case 'UPDATE_PERSONAL_ITEM':
        return {
            ...state,
            personalItems: state.personalItems.map(item => 
                item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
            ),
        };

    case 'REMOVE_PERSONAL_ITEM':
        return { ...state, personalItems: state.personalItems.filter(item => item.id !== action.payload) };

    case 'SET_ALL_DATA':
        return {
            ...state,
            feedItems: action.payload.feedItems,
            personalItems: action.payload.personalItems,
            spaces: action.payload.spaces,
        }
    
    case 'SET_SETTINGS':
        return { ...state, settings: action.payload };

    case 'SET_LAST_ADDED_TYPE': {
        const newSettings = { ...state.settings, lastAddedType: action.payload };
        saveSettings(newSettings);
        return { ...state, settings: newSettings };
    }
    
    case 'SET_FEED_VIEW_MODE': {
        const newSettings = { ...state.settings, feedViewMode: action.payload };
        saveSettings(newSettings);
        return { ...state, settings: newSettings };
    }

    case 'ADD_SPACE':
        return { ...state, spaces: [...state.spaces, action.payload].sort((a,b) => a.order - b.order) };
    
    case 'UPDATE_SPACE':
        return {
            ...state,
            spaces: state.spaces.map(s => s.id === action.payload.id ? { ...s, ...action.payload.updates } : s).sort((a,b) => a.order - b.order),
        };
    
    case 'REMOVE_SPACE':
        return { ...state, spaces: state.spaces.filter(s => s.id !== action.payload) };

    case 'SET_SPACES':
        return { ...state, spaces: action.payload.sort((a,b) => a.order - b.order) };
    
    case 'START_FOCUS_SESSION': {
        const itemToFocus = action.payload;
        let updatedPersonalItems = state.personalItems;
        
        // Automatically move item to "doing" in Kanban view if it's currently "todo"
        if (itemToFocus.status === 'todo') {
            const updates = { status: 'doing' as const };
             updatedPersonalItems = state.personalItems.map(item => 
                item.id === itemToFocus.id ? { ...item, ...updates } : item
            );
        }

        return { 
            ...state, 
            focusSession: { item: { ...itemToFocus, status: 'doing' }, startTime: Date.now() },
            personalItems: updatedPersonalItems
        };
    }

    case 'CLEAR_FOCUS_SESSION':
        return { ...state, focusSession: null };

    case 'SET_GOOGLE_AUTH_STATE':
        return { ...state, googleAuthState: action.payload };

    case 'SET_CALENDAR_EVENTS':
        return { ...state, calendarEvents: action.payload };

    default:
      return state;
  }
}