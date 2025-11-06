import React, { useMemo, useContext, useCallback } from 'react';
import { FeedIcon, AddIcon, TargetIcon, LayoutDashboardIcon, ChartBarIcon, SearchIcon, SettingsIcon } from './icons';
import type { Screen } from '../types';
import { AppContext } from '../state/AppContext';
import { useHaptics } from '../hooks/useHaptics';

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isCenter?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, onClick, onContextMenu, isCenter }) => {
  const iconClasses = `transition-all duration-300 ease-[var(--fi-cubic-bezier)] ${
    isCenter
      ? 'h-9 w-9 text-[var(--dynamic-accent-start)] group-hover:brightness-125'
      : `h-6 w-6 ${isActive ? 'text-[var(--dynamic-accent-start)] svg-glow' : 'text-[var(--text-secondary)] group-hover:text-white'}`
  }`;

  const finalIcon = React.isValidElement<{ className?: string }>(icon)
      ? React.cloneElement(icon, { className: iconClasses })
      : icon;

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`relative flex flex-col items-center justify-center h-16 transition-all duration-300 group ${isCenter ? 'w-20' : 'flex-1'}`}
      aria-label={label}
    >
      <div className={`relative flex flex-col items-center justify-center transition-transform duration-300 transform-gpu group-active:scale-90 ${isActive && !isCenter ? 'scale-110 -translate-y-1' : 'group-hover:-translate-y-1'}`}>
        {finalIcon}
        <span 
          className={`text-xs mt-1 font-bold transition-all duration-300 ease-[var(--fi-cubic-bezier)] 
          ${isActive && !isCenter ? 'themed-glow-text text-[var(--dynamic-accent-highlight)] opacity-100' : 
          isCenter ? 'opacity-0' :
          'text-[var(--text-secondary)] opacity-80 group-hover:opacity-100'}`}
        >
          {label}
        </span>
      </div>
    </button>
  );
};

const allNavItems: Record<Screen, { label: string; icon: React.ReactNode }> = {
    feed: { label: 'פיד', icon: <FeedIcon /> },
    today: { label: 'היום', icon: <TargetIcon /> },
    add: { label: 'הוספה', icon: <AddIcon /> },
    library: { label: 'המתכנן', icon: <LayoutDashboardIcon /> },
    investments: { label: 'השקעות', icon: <ChartBarIcon /> },
    search: { label: 'חיפוש', icon: <SearchIcon /> },
    settings: { label: 'הגדרות', icon: <SettingsIcon /> },
};


const BottomNavBar: React.FC<{ activeScreen: Screen; setActiveScreen: (screen: Screen) => void }> = ({ activeScreen, setActiveScreen }) => {
  const { state } = useContext(AppContext);
  const { settings } = state;
  const { screenLabels, navBarLayout } = settings;
  const { triggerHaptic } = useHaptics();

  const handleLongPressAdd = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const lastType = settings.lastAddedType;
    if (lastType) {
      sessionStorage.setItem('preselect_add', lastType);
      setActiveScreen('add');
       triggerHaptic('medium');
    }
  }, [settings.lastAddedType, setActiveScreen, triggerHaptic]);

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


  return (
      <nav className="fixed bottom-0 right-0 left-0 h-20 z-30">
        <div className="absolute inset-0 glass-nav border-t border-[var(--border-primary)]"></div>
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
  );
};

export default BottomNavBar;