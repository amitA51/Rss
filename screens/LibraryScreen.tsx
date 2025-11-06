import React, { useState, useMemo, useCallback, useContext } from 'react';
import type { PersonalItem, Screen, Space } from '../types';
import PersonalItemDetailModal from '../components/PersonalItemDetailModal';
import PersonalItemContextMenu from '../components/PersonalItemContextMenu';
import ProjectDetailScreen from '../components/ProjectDetailScreen';
import TimelineView from '../components/TimelineView';
import { SettingsIcon, LayoutDashboardIcon, CalendarIcon, ListIcon, TargetIcon, SparklesIcon, InboxIcon, ChevronLeftIcon, SearchIcon } from '../components/icons';
import { getIconForName } from '../components/IconMap';
import SkeletonLoader from '../components/SkeletonLoader';
import { AppContext } from '../state/AppContext';
import { removePersonalItem, updatePersonalItem, duplicatePersonalItem, reAddPersonalItem } from '../services/dataService';
import { useContextMenu } from '../hooks/useContextMenu';
import KanbanView from '../components/KanbanView';
import CalendarView from '../components/CalendarView';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';
import SpaceDetailScreen from '../components/SpaceDetailScreen';
import PersonalItemCard from '../components/PersonalItemCard';
import { useDebounce } from '../hooks/useDebounce';


type HubView = 'dashboard' | 'timeline' | 'board' | 'calendar';
type ActiveView = 
  | { type: HubView }
  | { type: 'project', item: PersonalItem }
  | { type: 'space', item: Space }
  | { type: 'inbox' };


const ViewSwitcher: React.FC<{
    currentView: HubView;
    onViewChange: (view: HubView) => void;
}> = ({ currentView, onViewChange }) => {
    const views = [
        { id: 'dashboard', icon: LayoutDashboardIcon, label: 'דשבורד' },
        { id: 'timeline', icon: ListIcon, label: 'ציר זמן' },
        { id: 'board', icon: LayoutDashboardIcon, label: 'לוח' },
        { id: 'calendar', icon: CalendarIcon, label: 'לוח שנה' },
    ] as const;

    return (
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-full">
            {views.map(view => (
                <button
                    key={view.id}
                    onClick={() => onViewChange(view.id)}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-full flex items-center justify-center gap-1.5 font-medium transition-all ${
                        currentView === view.id ? 'bg-[var(--accent-gradient)] text-white shadow-[0_0_10px_var(--dynamic-accent-glow)]' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                >
                    <view.icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{view.label}</span>
                </button>
            ))}
        </div>
    );
};


const LibraryScreen: React.FC<{ setActiveScreen: (screen: Screen) => void }> = ({ setActiveScreen }) => {
    const { state, dispatch } = useContext(AppContext);
    const { personalItems, spaces, isLoading, settings } = state;
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu<PersonalItem>();
    
    const [activeView, setActiveView] = useState<ActiveView>({ type: 'dashboard' });
    const [selectedItem, setSelectedItem] = useState<PersonalItem | null>(null);
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number, onUndo?: () => void} | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 200);

    const showStatus = useCallback((type: StatusMessageType, text: string, onUndo?: () => void) => {
        setStatusMessage({ type, text, id: Date.now(), onUndo });
    }, []);

    const handleSelectItem = useCallback((item: PersonalItem, event?: React.MouseEvent | React.KeyboardEvent) => {
        event?.stopPropagation();
        setSelectedItem(item);
    }, []);
    
    const handleCloseModal = useCallback((nextItem?: PersonalItem) => {
        setSelectedItem(nextItem || null);
    }, []);

    const handleUpdateItem = useCallback(async (id: string, updates: Partial<PersonalItem>) => {
        const originalItem = personalItems.find(item => item.id === id);
        if (!originalItem) return;

        dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id, updates } });
        setSelectedItem(prev => (prev && prev.id === id) ? { ...prev, ...updates } : prev);

        try {
            await updatePersonalItem(id, updates);
        } catch (error) {
            console.error("Failed to update item:", error);
            dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id, updates: originalItem } });
            setSelectedItem(prev => (prev && prev.id === id) ? originalItem : prev);
            showStatus('error', 'שגיאה בעדכון הפריט.');
        }
    }, [dispatch, personalItems, showStatus]);
    
    const handleDeleteItem = useCallback(async (id: string) => {
        const itemToDelete = personalItems.find(item => item.id === id);
        if (!itemToDelete) return;
    
        await removePersonalItem(id);
        dispatch({ type: 'REMOVE_PERSONAL_ITEM', payload: id });
    
        showStatus('success', 'הפריט נמחק.', async () => {
            await reAddPersonalItem(itemToDelete);
            dispatch({ type: 'ADD_PERSONAL_ITEM', payload: itemToDelete });
        });
    }, [dispatch, personalItems, showStatus]);

    const handleDeleteWithConfirmation = useCallback((id: string) => {
        const itemToDelete = personalItems.find(item => item.id === id);
        if (itemToDelete && window.confirm(`האם למחוק את "${itemToDelete.title}"?`)) {
            handleDeleteItem(id);
            setSelectedItem(null);
        }
    }, [personalItems, handleDeleteItem]);

    const handleDuplicateItem = useCallback(async (id: string) => {
        const newItem = await duplicatePersonalItem(id);
        dispatch({ type: 'ADD_PERSONAL_ITEM', payload: newItem });
        showStatus('success', 'הפריט שוכפל');
    }, [dispatch, showStatus]);

    const handleStartFocus = useCallback((item: PersonalItem) => {
        dispatch({ type: 'START_FOCUS_SESSION', payload: item });
    }, [dispatch]);

    const { inboxItems, projectItems, personalSpaces } = useMemo(() => {
        const inbox = personalItems.filter(i => !i.spaceId && !i.projectId && i.type !== 'goal');
        const projects = personalItems.filter(i => i.type === 'goal');
        const pSpaces = spaces.filter(s => s.type === 'personal');
        return { inboxItems: inbox, projectItems: projects, personalSpaces: pSpaces };
    }, [personalItems, spaces]);

    const searchResults = useMemo(() => {
        if (!debouncedQuery) return [];
        const lowerCaseQuery = debouncedQuery.toLowerCase();
        return personalItems.filter(item => 
            item.title.toLowerCase().includes(lowerCaseQuery) ||
            (item.content && item.content.toLowerCase().includes(lowerCaseQuery))
        );
    }, [debouncedQuery, personalItems]);

    const renderMainHub = () => (
        <>
        <header className="flex flex-col gap-4 -mx-4 px-4 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20">
            <div className="flex justify-between items-center">
                <h1 className="hero-title themed-title">
                    {settings.screenLabels?.library || 'המתכנן'}
                </h1>
                <button onClick={() => setActiveScreen('settings')} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors" aria-label="הגדרות">
                    <SettingsIcon className="w-6 h-6"/>
                </button>
            </div>
             <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-[var(--text-secondary)]" />
                </div>
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפש בכל הפריטים האישיים..."
                    className={`w-full border text-[var(--text-primary)] rounded-2xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-all ${settings.themeSettings.cardStyle === 'glass' ? 'bg-white/10 border-white/10 backdrop-blur-sm' : 'bg-[var(--bg-secondary)] border-[var(--border-primary)]'}`}
                />
            </div>
        </header>

        {debouncedQuery ? (
             <div className="px-4 space-y-4">
                <p className="text-sm text-[var(--text-secondary)]">{searchResults.length} תוצאות נמצאו</p>
                {searchResults.map((item, index) => (
                    <PersonalItemCard
                        key={item.id}
                        item={item}
                        index={index}
                        searchQuery={debouncedQuery}
                        onSelect={handleSelectItem}
                        onUpdate={handleUpdateItem}
                        onDelete={handleDeleteItem}
                        onContextMenu={handleContextMenu}
                        onLongPress={(_item: PersonalItem) => {}}
                        isInSelectionMode={false}
                        isSelected={false}
                    />
                ))}
             </div>
        ) : (
            <div className={`transition-all duration-500 var(--fi-cubic-bezier) ${selectedItem ? 'receding-background' : ''}`}>
                <div className="px-4">
                    <ViewSwitcher currentView={activeView.type as HubView} onViewChange={(view) => setActiveView({type: view})} />
                </div>

                <div className="pt-6">
                    {isLoading && <SkeletonLoader count={3} />}
                    
                    {!isLoading && activeView.type === 'dashboard' && (
                        <div className="space-y-8 animate-screen-enter px-4">
                            {inboxItems.length > 0 && (
                                <section>
                                    <button onClick={() => setActiveView({ type: 'inbox' })} className="w-full themed-card p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <InboxIcon className="w-6 h-6 text-[var(--text-secondary)]"/>
                                            <h2 className="text-lg font-semibold text-white">תיבת דואר נכנס</h2>
                                        </div>
                                        <span className="text-sm font-mono bg-[var(--accent-start)] text-black font-bold rounded-full px-2 py-0.5">{inboxItems.length}</span>
                                    </button>
                                </section>
                            )}

                            {projectItems.length > 0 && (
                                <section>
                                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 px-1">פרויקטים</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {projectItems.map(project => {
                                            const childTasks = personalItems.filter(i => i.projectId === project.id && (i.type === 'task' || i.type === 'roadmap' || (i.steps && i.steps.length > 0)));
                                            const completedTasks = childTasks.reduce((acc, i) => {
                                                if (i.type === 'task' && i.isCompleted) return acc + 1;
                                                if (i.type === 'roadmap' && i.steps) return acc + i.steps.filter(s => s.isCompleted).length;
                                                return acc;
                                            }, 0);
                                            const totalTasks = childTasks.reduce((acc, i) => {
                                                if (i.type === 'task') return acc + 1;
                                                if (i.type === 'roadmap' && i.steps) return acc + i.steps.length;
                                                return acc;
                                            }, 0);
                                            
                                            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                                            
                                            return (
                                                <button key={project.id} onClick={() => setActiveView({ type: 'project', item: project })} className="themed-card p-4 text-right space-y-3 hover:-translate-y-1 transition-transform">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400">
                                                            <TargetIcon className="w-6 h-6"/>
                                                        </div>
                                                        <h3 className="text-lg font-bold text-white truncate">{project.title}</h3>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                                                            <span>{completedTasks}/{totalTasks} הושלמו</span>
                                                            <span>{Math.round(progress)}%</span>
                                                        </div>
                                                        <div className="w-full bg-[var(--bg-card)] rounded-full h-1.5 border border-[var(--border-primary)]">
                                                            <div className="bg-[var(--accent-gradient)] h-1 rounded-full" style={{width: `${progress}%`}}></div>
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </section>
                            )}

                            {personalSpaces.length > 0 && (
                                <section>
                                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3 px-1">מרחבים</h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {personalSpaces.map(space => {
                                            const Icon = getIconForName(space.icon);
                                            const itemCount = personalItems.filter(i => i.spaceId === space.id).length;
                                            return (
                                                <button key={space.id} onClick={() => setActiveView({ type: 'space', item: space })} className="themed-card p-3 flex flex-col items-center justify-center text-center aspect-square hover:-translate-y-1 transition-transform">
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{backgroundColor: `${space.color}20`, color: space.color}}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <span className="font-semibold text-white text-sm truncate">{space.name}</span>
                                                    <span className="text-xs text-[var(--text-secondary)]">{itemCount} פריטים</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                    {!isLoading && activeView.type === 'timeline' && <TimelineView items={personalItems} onSelectItem={handleSelectItem} />}
                    {!isLoading && activeView.type === 'board' && <KanbanView items={personalItems} onUpdate={handleUpdateItem} onSelectItem={handleSelectItem} onQuickAdd={() => {}} onDelete={handleDeleteItem} />}
                    {!isLoading && activeView.type === 'calendar' && <CalendarView items={personalItems} onUpdate={handleUpdateItem} onSelectItem={handleSelectItem} onQuickAdd={() => {}} />}
                </div>
            </div>
        )}
        </>
    );

    if (activeView.type === 'project') {
        return <ProjectDetailScreen project={activeView.item} onBack={() => setActiveView({ type: 'dashboard' })} onSelectItem={handleSelectItem} />;
    }

    if (activeView.type === 'space') {
        return <SpaceDetailScreen space={activeView.item} onBack={() => setActiveView({ type: 'dashboard' })} onSelectItem={handleSelectItem} />;
    }

    if (activeView.type === 'inbox') {
        return (
            <div className="animate-screen-enter">
                 <header className="flex items-center gap-4 -mx-4 px-4 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20">
                     <button onClick={() => setActiveView({ type: 'dashboard' })} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors" aria-label="חזור לדשבורד">
                        <ChevronLeftIcon className="w-6 h-6"/>
                    </button>
                    <h1 className="hero-title themed-title">תיבת דואר נכנס</h1>
                </header>
                <div className="space-y-3 px-4 pt-4">
                    {inboxItems.map((item, index) => (
                        <PersonalItemCard
                            key={item.id}
                            item={item}
                            index={index}
                            onSelect={handleSelectItem}
                            onUpdate={handleUpdateItem}
                            onDelete={handleDeleteItem}
                            onContextMenu={handleContextMenu}
                            onLongPress={(_item: PersonalItem) => {}}
                            isInSelectionMode={false}
                            isSelected={false}
                        />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="pt-4 pb-8 space-y-6">
            {renderMainHub()}
            <PersonalItemDetailModal
                item={selectedItem}
                onClose={handleCloseModal}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteWithConfirmation}
            />
             {contextMenu.isOpen && contextMenu.item && (
                <PersonalItemContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    item={contextMenu.item}
                    onClose={closeContextMenu}
                    onUpdate={handleUpdateItem}
                    onDelete={handleDeleteItem}
                    onDuplicate={handleDuplicateItem}
                    onStartFocus={handleStartFocus}
                />
            )}
            {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
        </div>
    );
};

export default LibraryScreen;