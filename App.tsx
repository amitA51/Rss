import React, { useState, useCallback, useEffect } from 'react';
import BottomNavBar from './components/BottomNavBar';
import FeedScreen from './screens/FeedScreen';
import AddSparkScreen from './screens/AddSparkScreen';
import SearchScreen from './screens/SearchScreen';
import SettingsScreen from './screens/SettingsScreen';
import PersonalScreen from './screens/PersonalScreen';
import AssistantScreen from './screens/AssistantScreen';
import { loadSettings } from './services/settingsService';

export type Screen = 'feed' | 'add' | 'search' | 'settings' | 'personal' | 'assistant';

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('feed');

  useEffect(() => {
    const settings = loadSettings();
    setActiveScreen(settings.defaultScreen);
  }, []);

  const renderScreen = useCallback(() => {
    switch (activeScreen) {
      case 'feed':
        return <FeedScreen />;
      case 'add':
        return <AddSparkScreen setActiveScreen={setActiveScreen} />;
      case 'search':
        return <SearchScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'personal':
        return <PersonalScreen />;
       case 'assistant':
        return <AssistantScreen />;
      default:
        return <FeedScreen />;
    }
  }, [activeScreen]);

  return (
    <div className="min-h-screen">
      <main className="pb-24 max-w-4xl mx-auto px-2 sm:px-4">
        <div key={activeScreen} className="animate-fade-in-up">
          {renderScreen()}
        </div>
      </main>
      <BottomNavBar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
    </div>
  );
};

export default App;