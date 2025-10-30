import React, { useState } from 'react';
import BottomNavBar from './components/BottomNavBar';
import FeedScreen from './screens/FeedScreen';
import HomeScreen from './screens/HomeScreen';
import AddScreen from './screens/AddScreen';
import SearchScreen from './screens/SearchScreen';
import SettingsScreen from './screens/SettingsScreen';
import { loadSettings } from './services/settingsService';

export type Screen = 'feed' | 'search' | 'add' | 'home' | 'settings';

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>(loadSettings().defaultScreen);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'feed':
        return <FeedScreen />;
      case 'home':
        return <HomeScreen />;
      case 'add':
        return <AddScreen setActiveScreen={setActiveScreen} />;
      case 'search':
        return <SearchScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      <main className="animate-fade-in-up">
        {renderScreen()}
      </main>
      <BottomNavBar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
    </div>
  );
};

export default App;