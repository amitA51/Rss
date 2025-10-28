import React, { useState, useEffect, useRef } from 'react';
import { FeedIcon, AddIcon, SearchIcon, SettingsIcon, UserIcon } from './icons';

type Screen = 'feed' | 'add' | 'search' | 'settings' | 'personal';

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
    className={`relative z-10 flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-300 group ${
      isActive ? 'text-white' : 'text-gray-400 hover:text-white'
    }`}
    aria-label={label}
  >
    <div className="transition-transform duration-300 transform-gpu group-hover:-translate-y-1">
      {icon}
    </div>
    <span className="text-xs mt-1">{label}</span>
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
    { id: 'personal', label: 'אישי', icon: <UserIcon className="h-6 w-6" /> },
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
        height: `${itemRect.height}px`,
        left: `${itemRect.left - navRect.left + (itemRect.width * 0.15)}px`,
        top: `${itemRect.top - navRect.top}px`,
      });
    }
  }, [activeScreen]);

  return (
    <>
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <nav 
        ref={navRef}
        className="fixed bottom-0 right-0 left-0 bg-black/60 backdrop-blur-lg border-t border-gray-800/70"
        style={{ filter: 'url(#gooey)' }}
      >
        <div className="flex justify-around max-w-md mx-auto relative">
          <div 
            className="absolute bg-blue-600 rounded-full transition-all duration-500 ease-in-out-back"
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