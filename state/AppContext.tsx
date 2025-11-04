import React, { createContext, useReducer, useEffect, ReactNode } from 'react';
import { appReducer, initialState, AppState, AppAction } from './appReducer';
import * as dataService from '../services/dataService';
import { loadSettings } from '../services/settingsService';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export const AppContext = createContext<AppContextType>({
  state: initialState,
  dispatch: () => null,
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const loadInitialData = async () => {
      dispatch({ type: 'FETCH_START' });
      try {
        const [feedItems, personalItems, spaces] = await Promise.all([
            dataService.getFeedItems(),
            dataService.getPersonalItems(),
            dataService.getSpaces()
        ]);
        
        // Settings are still loaded synchronously from localStorage
        dispatch({ type: 'FETCH_SUCCESS', payload: { feedItems, personalItems, spaces } });
      } catch (error) {
        console.error('Failed to load initial data:', error);
        dispatch({ type: 'FETCH_ERROR', payload: 'Failed to load data' });
      }
    };

    loadInitialData();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};