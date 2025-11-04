import React, { useMemo, useContext, useCallback } from 'react';
import { FeedIcon, AddIcon, TargetIcon, LayoutDashboardIcon, ChartBarIcon, SearchIcon, SettingsIcon } from './icons';
import type { Screen } from '../types';
import { AppContext } from '../state/AppContext';

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isCenter?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, onClick, onContextMenu, isCenter }) => {
  const iconClasses = `h-6 w-6 transition-all duration-300 ${
    isActive && !isCenter ? 'text-[var(--dynamic-accent-start)]' : 
    isCenter ? 'text-white' : 
    'text-[var(--text-secondary)] group-hover:text-white'
  }`;

  const finalIcon = React.isValidElement<{ className?: string }>(icon)
      ? React.cloneElement(icon, { className: iconClasses })
      : icon;

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`relative flex flex-col items-center justify-center h-16 transition-all duration-300 group ${isCenter ? 'w-20' : 'w-16'}`}
      aria-label={label}
    >
      <div 
        className={`absolute transition-all duration-300 ${
          isCenter 
            ? `w-16 h-16 rounded-full bottom-6 shadow-lg shadow-black/30 border-2 border-[var(--bg-primary)] ${isActive ? 'bg-[var(--accent-gradient)] shadow-[0_0_15px_var(--dynamic-accent-glow)]' : 'bg-[var(--bg-card)]'}`
            : ''
        }`}
      ></div>
      <div className={`relative transition-transform duration-300 transform-gpu group-active:scale-90 ${isCenter ? 'mt-3' : ''} ${isActive && !isCenter ? 'scale-110 -translate-y-2' : 'group-hover:-translate-y-1'}`}>
        {finalIcon}
      </div>
      <span 
        className={`text-xs mt-1 font-bold transition-all duration-300 
        ${isActive && !isCenter ? 'text-[var(--dynamic-accent-highlight)] opacity-100 themed-glow-text' : 'text-[var(--text-secondary)] opacity-60 group-hover:text-white group-hover:opacity-100'}`}
      >
        {label}
      </span>
    </button>
  );
};

const allNavItems: Record<Screen, { label: string; icon: React.ReactNode }> = {
    feed: { label: 'פיד', icon: <FeedIcon /> },
    today: { label: 'היום', icon: <TargetIcon /> },
    add: { label: 'הוספה', icon: <AddIcon className="h-7 w-7" /> },
    library: { label: 'המתכנן', icon: <LayoutDashboardIcon /> },
    investments: { label: 'השקעות', icon: <ChartBarIcon /> },
    search: { label: 'חיפוש', icon: <SearchIcon /> },
    settings: { label: 'הגדרות', icon: <SettingsIcon /> },
};


const BottomNavBar: React.FC<{ activeScreen: Screen; setActiveScreen: (screen: Screen) => void }> = ({ activeScreen, setActiveScreen }) => {
  const { state } = useContext(AppContext);
  const { settings } = state;
  const { screenLabels, navBarLayout } = settings;

  // FIX: Encapsulate event handlers in useCallback to stabilize their identity
  // and prevent unnecessary re-renders, and include them in the useMemo dependency array.
  const handleLongPressAdd = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const lastType = settings.lastAddedType;
    if (lastType) {
      sessionStorage.setItem('preselect_add', lastType);
      setActiveScreen('add');
       if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }
  }, [settings.lastAddedType, setActiveScreen]);

  const handleAddItemClick = useCallback(() => {
    if (activeScreen === 'investments') {
        sessionStorage.setItem('preselect_add', 'ticker');
    } else if (activeScreen === 'feed') {
        sessionStorage.setItem('preselect_add', 'spark');
    }
    setActiveScreen('add');
  }, [activeScreen, setActiveScreen]);
  
  const navItems = useMemo(() => {
    const layout = [...navBarLayout];
    const addIndex = layout.indexOf('add');
    if (addIndex !== -1 && addIndex !== 2) {
      layout.splice(addIndex, 1);
      layout.splice(2, 0, 'add');
    }

    return layout.slice(0, 5).map((screenId, index) => {
      const item = allNavItems[screenId];
      // FIX: Corrected a runtime error where `item.id` was accessed. The `item` object from `allNavItems`
      // does not have an `id` property. The check should be against `screenId`.
      const isCenterButton = index === 2 && screenId === 'add';

      return {
        id: screenId,
        label: screenLabels[screenId] || item.label,
        icon: item.icon,
        isCenter: isCenterButton,
        onClick: isCenterButton ? handleAddItemClick : () => setActiveScreen(screenId),
        onContextMenu: isCenterButton ? handleLongPressAdd : undefined,
      }
    });
  }, [navBarLayout, screenLabels, setActiveScreen, handleAddItemClick, handleLongPressAdd]);

  const navClasses = `fixed bottom-0 right-0 left-0 h-20 bg-transparent z-30 ${settings.themeSettings.cardStyle === 'glass' ? 'glass-nav' : 'bg-[var(--bg-primary)]/80 backdrop-blur-lg border-t border-[var(--border-primary)]'}`;

  return (
    <>
      <nav 
        className={navClasses}
      >
        <div className="flex justify-around max-w-md mx-auto relative h-full items-center">
          {navItems.map((item) => (
              <NavItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                isActive={activeScreen === item.id}
                onClick={item.onClick}
                onContextMenu={item.onContextMenu}
                isCenter={item.isCenter}
              />
          ))}
        </div>
      </nav>
    </>
  );
};

export default BottomNavBar;