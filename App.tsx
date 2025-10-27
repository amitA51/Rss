
import React, { useState, useCallback } from 'react';
import BottomNavBar from './components/BottomNavBar';
import FeedScreen from './screens/FeedScreen';
import AddSparkScreen from './screens/AddSparkScreen';
import SearchScreen from './screens/SearchScreen';
import SettingsScreen from './screens/SettingsScreen';

type Screen = 'feed' | 'add' | 'search' | 'settings';

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<Screen>('feed');

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
      default:
        return <FeedScreen />;
    }
  }, [activeScreen]);

  return (
    <div className="bg-black text-gray-200 font-sans min-h-screen">
      <main className="pb-20">
        {renderScreen()}
      </main>
      <BottomNavBar activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
    </div>
  );
};

export default App;
