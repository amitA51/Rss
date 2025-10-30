import React, { useState, useEffect, useRef } from 'react';
import { FeedIcon, AddIcon, SearchIcon, SettingsIcon, LayoutDashboardIcon } from './icons';

type Screen = 'feed' | 'add' | 'search' | 'settings' | 'home';

interface BottomNavBarProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  itemRef: React.RefObject<HTMLButtonElement>;
}> = ({ label, icon, isActive, onClick, itemRef }) => (
  <button
    ref={itemRef}
    onClick={onClick}
    className={`relative z-10 flex flex-col items-center justify-center w-full h-full transition-colors duration-300 group ${
      isActive ? 'text-white' : 'text-gray-400 hover:text-white'
    }`}
    aria-label={label}
  >
    <div className="transition-transform duration-300 transform-gpu group-hover:-translate-y-1 group-hover:scale-110 group-active:scale-95">
      {icon}
    </div>
    <span className={`text-xs mt-1 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{label}</span>
  </button>
);

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeScreen, setActiveScreen }) => {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<{[key: string]: React.RefObject<HTMLButtonElement>}>({});

  const navItems = [
    { id: 'feed', label: 'פיד', icon: <FeedIcon className="h-6 w-6" /> },
    { id: 'search', label: 'חיפוש', icon: <SearchIcon className="h-6 w-6" /> },
    { id: 'add', label: 'הוספה', icon: <AddIcon className="h-7 w-7" /> },
    { id: 'home', label: 'בית', icon: <LayoutDashboardIcon className="h-6 w-6" /> },
    { id: 'settings', label: 'הגדרות', icon: <SettingsIcon className="h-6 w-6" /> },
  ] as const;

  navItems.forEach(item => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    itemRefs.current[item.id] = useRef<HTMLButtonElement>(null);
  });

  useEffect(() => {
    const activeItemRef = itemRefs.current[activeScreen];
    if (activeItemRef?.current && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const itemRect = activeItemRef.current.getBoundingClientRect();
      
      setIndicatorStyle({
        width: `${itemRect.width * 0.7}px`,
        height: `calc(${itemRect.height}px - 2.5rem)`,
        left: `${itemRect.left - navRect.left + (itemRect.width * 0.15)}px`,
        top: '0.5rem',
      });
    }
  }, [activeScreen]);

  return (
    <>
      <nav 
        ref={navRef}
        className="fixed bottom-0 right-0 left-0 h-20 bg-gradient-to-t from-black/80 via-black/70 to-black/60 backdrop-blur-lg border-t border-gray-700/50"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
        <div className="flex justify-around max-w-md mx-auto relative h-full">
          <div 
            className="absolute bg-blue-600/50 rounded-2xl transition-all duration-500 ease-in-out-back"
            style={indicatorStyle}
          ></div>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              isActive={activeScreen === item.id}
              onClick={() => setActiveScreen(item.id)}
              itemRef={itemRefs.current[item.id]}
            />
          ))}
        </div>
      </nav>
      <style>{`
        .ease-in-out-back {
          transition-timing-function: cubic-bezier(0.68, -0.6, 0.32, 1.6);
        }
      `}</style>
    </>
  );
};

export default BottomNavBar;