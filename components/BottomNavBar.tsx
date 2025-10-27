
import React from 'react';
import { FeedIcon, AddIcon, SearchIcon, SettingsIcon } from './icons';

type Screen = 'feed' | 'add' | 'search' | 'settings';

interface BottomNavBarProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
      isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    {icon}
    <span className="text-xs mt-1">{label}</span>
  </button>
);

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeScreen, setActiveScreen }) => {
  const navItems = [
    { id: 'feed', label: 'פיד', icon: <FeedIcon className="h-6 w-6" /> },
    { id: 'add', label: 'הוספה', icon: <AddIcon className="h-6 w-6" /> },
    { id: 'search', label: 'חיפוש', icon: <SearchIcon className="h-6 w-6" /> },
    { id: 'settings', label: 'הגדרות', icon: <SettingsIcon className="h-6 w-6" /> },
  ] as const;

  return (
    <nav className="fixed bottom-0 right-0 left-0 bg-gray-900 border-t border-gray-800 shadow-lg">
      <div className="flex justify-around max-w-md mx-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeScreen === item.id}
            onClick={() => setActiveScreen(item.id)}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNavBar;
