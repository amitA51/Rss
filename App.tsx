import React, { useState, Suspense, lazy, useContext, useEffect, useMemo } from 'react';
import BottomNavBar from './components/BottomNavBar';
import { loadSettings } from './services/settingsService';
import { AppProvider, AppContext } from './state/AppContext';
import SessionTimer from './components/SessionTimer';
import DynamicBackground from './components/DynamicBackground';
import type { Screen, PersonalItem } from './types';
import { updateAppBadge } from './services/notificationsService';
import { RefreshIcon } from './components/icons';
import * as dataService from './services/dataService';
import { generatePalette } from './services/styleUtils';
import StatusMessage, { StatusMessageType } from './components/StatusMessage';
import { useHabitReminders } from './hooks/useHabitReminders';


// --- Polished Loading Component ---
const AppLoading: React.FC = () => (
    <div className="h-[80vh] flex items-center justify-center">
        <svg width="64" height="64" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--dynamic-accent-start)" />
                    <stop offset="100%" stopColor="var(--dynamic-accent-end)" />
                </linearGradient>
            </defs>
            <g>
                <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25" fill="currentColor"/>
                <path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z" fill="url(#spinner-gradient)">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/>
                </path>
            </g>
        </svg>
    </div>
);


// --- Code Splitting with React.lazy ---
const FeedScreen = lazy(() => import('./screens/FeedScreen'));
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const AddScreen = lazy(() => import('./screens/AddScreen'));
const SearchScreen = lazy(() => import('./screens/SearchScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const LibraryScreen = lazy(() => import('./screens/LibraryScreen'));
const InvestmentsScreen = lazy(() => import('./screens/InvestmentsScreen'));


const ThemedApp: React.FC = () => {
    const { state, dispatch } = useContext(AppContext);
    const { settings, focusSession } = state;
    const { themeSettings, uiDensity, animationIntensity, fontSizeScale } = settings;
    const [activeScreen, setActiveScreen] = useState<Screen>(state.settings.defaultScreen);
    const [updateAvailable, setUpdateAvailable] = useState<ServiceWorker | null>(null);
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number, onUndo?: () => Promise<void> | void} | null>(null);

    // Schedule habit reminders
    useHabitReminders();

    const showStatus = (type: StatusMessageType, text: string, onUndo?: () => Promise<void> | void) => {
        setStatusMessage({ type, text, id: Date.now(), onUndo });
    };

    useEffect(() => {
        const body = document.body;
        const root = document.documentElement;

        // Apply dynamic colors from accent color
        const palette = generatePalette(themeSettings.accentColor);
        for (const [key, value] of Object.entries(palette)) {
            root.style.setProperty(key, value);
        }

        // Apply font class
        body.classList.remove('font-inter', 'font-lato', 'font-source-code-pro', 'font-heebo', 'font-rubik', 'font-alef');
        body.classList.add(`font-${themeSettings.font.replace(/_/g, '-')}`);

        // Apply card style class
        body.classList.remove('card-style-glass', 'card-style-flat', 'card-style-bordered');
        body.classList.add(`card-style-${themeSettings.cardStyle}`);
        
        // Apply mouse highlight based on card style
        if (themeSettings.cardStyle === 'glass') {
            body.classList.add('with-mouse-highlight');
        } else {
            body.classList.remove('with-mouse-highlight');
        }
        
        // Apply UI density
        body.classList.remove('density-comfortable', 'density-compact');
        body.classList.add(`density-${uiDensity}`);

        // Apply Animation Intensity
        body.classList.remove('animations-off', 'animations-subtle', 'animations-default', 'animations-full');
        body.classList.add(`animations-${animationIntensity}`);

        // Apply Font Size Scale
        root.style.setProperty('--font-scale', fontSizeScale.toString());


    }, [themeSettings, uiDensity, animationIntensity, fontSizeScale]);

    // Update app badge whenever unread feed items change
    useEffect(() => {
        const unreadCount = state.feedItems.filter(item => !item.is_read).length;
        updateAppBadge(unreadCount);
    }, [state.feedItems]);


    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');

        if (action) {
            if (action === 'share') {
                const url = params.get('url');
                const text = params.get('text');
                const title = params.get('title');
                sessionStorage.setItem('sharedData', JSON.stringify({ url, text, title }));
                setActiveScreen('add');
            } else if (action === 'add_task') {
                sessionStorage.setItem('preselect_add', 'task');
                setActiveScreen('add');
            } else if (action === 'add_spark') {
                sessionStorage.setItem('preselect_add', 'spark');
                setActiveScreen('add');
            } else if (action === 'go_today') {
                setActiveScreen('today');
            } else if (action === 'go_feed') {
                setActiveScreen('feed');
            } else if (action === 'import') {
                setActiveScreen('settings');
            }
            // Clean up URL to prevent re-triggering on reload
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);
    
     // --- PWA Update Prompt Logic ---
    useEffect(() => {
        const registerListeners = async () => {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                if (registration.waiting) {
                    setUpdateAvailable(registration.waiting);
                }
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setUpdateAvailable(newWorker);
                            }
                        });
                    }
                });
            }
        };
        registerListeners();
    }, []);

    const handleUpdate = () => {
        if (updateAvailable) {
            updateAvailable.postMessage({ type: 'SKIP_WAITING' });
            // Page will reload via 'controllerchange' listener in index.tsx
        }
    };
    
    const handleEndSession = async (loggedDuration?: number, isCancel: boolean = false) => {
        const sessionToRestore = state.focusSession; // Capture session state before clearing
        if (loggedDuration && sessionToRestore) {
            // FIX: Await the async data service call to get the updated item.
            const updatedItem = await dataService.logFocusSession(sessionToRestore.item.id, loggedDuration);
            dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id: updatedItem.id, updates: updatedItem } });
        }
        dispatch({ type: 'CLEAR_FOCUS_SESSION' });

        if (isCancel && sessionToRestore) {
            showStatus('success', 'הסשן הופסק.', () => {
                // UNDO action
                dispatch({ type: 'START_FOCUS_SESSION', payload: sessionToRestore.item });
            });
        }
    };

    // By creating a map of components, we ensure they are all mounted at once.
    // Toggling `display` instead of using a `key` prop preserves their internal state.
    const screenMap: Record<Screen, React.ReactNode> = {
        feed: <FeedScreen setActiveScreen={setActiveScreen} />,
        today: <HomeScreen setActiveScreen={setActiveScreen} />,
        add: <AddScreen setActiveScreen={setActiveScreen} />,
        library: <LibraryScreen setActiveScreen={setActiveScreen} />,
        investments: <InvestmentsScreen setActiveScreen={setActiveScreen} />,
        search: <SearchScreen setActiveScreen={setActiveScreen} />,
        settings: <SettingsScreen setActiveScreen={setActiveScreen} />,
    };

    if (state.focusSession) {
        return <SessionTimer item={state.focusSession.item} onEndSession={handleEndSession} />;
    }

    return (
        <div className="max-w-2xl mx-auto app-container pb-24 overflow-x-hidden">
            {themeSettings.backgroundEffect && <DynamicBackground />}
            <main>
                <Suspense fallback={<AppLoading />}>
                    {Object.entries(screenMap).map(([screenKey, screenComponent]) => (
                        <div
                            key={screenKey}
                            style={{ display: activeScreen === screenKey as Screen ? 'block' : 'none' }}
                        >
                            <div className={activeScreen === screenKey ? 'animate-screen-enter' : ''}>
                                {screenComponent}
                            </div>
                        </div>
                    ))}
                </Suspense>
            </main>
            <BottomNavBar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
            {updateAvailable && (
                <div className="fixed bottom-24 right-4 z-50 animate-screen-enter">
                    <div className="themed-card p-3 flex items-center gap-4">
                        <p className="text-sm text-white font-medium">עדכון חדש זמין!</p>
                        <button onClick={handleUpdate} className="flex items-center gap-2 bg-[var(--accent-gradient)] text-black text-sm font-bold px-4 py-2 rounded-full hover:brightness-110 transition-all shadow-[0_4px_15px_var(--dynamic-accent-glow)]">
                            <RefreshIcon className="w-4 h-4" />
                            רענן
                        </button>
                    </div>
                </div>
            )}
            {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
        </div>
    );
}


const App: React.FC = () => {
  return (
    <AppProvider>
      <ThemedApp />
    </AppProvider>
  );
};

export default App;