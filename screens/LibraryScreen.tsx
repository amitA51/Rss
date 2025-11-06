import React, { useState, useMemo, useCallback, useContext, useRef, useEffect } from 'react';
import type { PersonalItem, PersonalItemType, Space, AddableType } from '../types';
import type { Screen } from '../types';
import PersonalItemCard from '../components/PersonalItemCard';
import PersonalItemDetailModal from '../components/PersonalItemDetailModal';
import PersonalItemContextMenu from '../components/PersonalItemContextMenu';
import SpaceSummaryModal from '../components/SpaceSummaryModal';
import { ItemCreationForm } from '../components/ItemCreationForm';
import { SettingsIcon, LayoutDashboardIcon, SparklesIcon, DragHandleIcon, CalendarIcon, ListIcon, AddIcon, SearchIcon, CloseIcon, TrashIcon, CopyIcon, StarIcon } from '../components/icons';
import { getIconForName } from '../components/IconMap';
import SkeletonLoader from '../components/SkeletonLoader';
import { AppContext } from '../state/AppContext';
import { removePersonalItem, updatePersonalItem, duplicatePersonalItem, reAddPersonalItem } from '../services/dataService';
import { summarizeSpaceContent } from '../services/geminiService';
import { useContextMenu } from '../hooks/useContextMenu';
import { useDebounce } from '../hooks/useDebounce';
import KanbanView from '../components/KanbanView';
import CalendarView from '../components/CalendarView';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';


// --- Helper Components ---

const BatchActionBar: React.FC<{
  count: number;
  onCancel: () => void;
  onDelete: () => void;
  onToggleImportant: () => void;
  onDuplicate: () => void;
}> = ({ count, onCancel, onDelete, onToggleImportant, onDuplicate }) => {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-20 right-0 left-0 z-40 p-2 animate-slide-up-in">
      <div className="max-w-md mx-auto bg-[var(--bg-card)]/80 backdrop-blur-xl border border-[var(--border-primary)] rounded-2xl shadow-2xl p-2 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <CloseIcon className="w-6 h-6 text-white"/>
            </button>
            <span className="font-bold text-white">{count} נבחרו</span>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={onToggleImportant} className="p-3 rounded-full hover:bg-white/10 transition-colors text-gray-300" title="סמן כחשוב">
                <StarIcon className="w-6 h-6"/>
            </button>
            <button onClick={onDuplicate} className="p-3 rounded-full hover:bg-white/10 transition-colors text-gray-300" title="שכפל">
                <CopyIcon className="w-6 h-6"/>
            </button>
            <button onClick={onDelete} className="p-3 rounded-full hover:bg-red-500/10 transition-colors text-red-400" title="מחק">
                <TrashIcon className="w-6 h-6"/>
            </button>
        </div>
      </div>
    </div>
  );
};


const ViewSwitcher: React.FC<{
    currentView: 'list' | 'board' | 'calendar';
    onViewChange: (view: 'list' | 'board' | 'calendar') => void;
}> = ({ currentView, onViewChange }) => {
    const views = [
        { id: 'list', icon: ListIcon, label: 'רשימה' },
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
                        currentView === view.id ? 'bg-[var(--accent-gradient)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                >
                    <view.icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{view.label}</span>
                </button>
            ))}
        </div>
    );
};

const SpaceHeader: React.FC<{
    space: Space;
    itemCounts: Record<string, number>;
    totalItems: number;
    isExpanded: boolean;
    onToggle: () => void;
    onSummarize: () => void;
}> = ({ space, itemCounts, totalItems, isExpanded, onToggle, onSummarize }) => {
    const Icon = getIconForName(space.icon);

    return (
        <div 
            className="themed-card overflow-hidden transition-all duration-300 ease-in-out"
            style={{ '--space-color': space.color, '--space-glow': `${space.color}33` } as React.CSSProperties}
        >
            <div className="p-4 relative cursor-pointer" onClick={onToggle}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[var(--space-color)] opacity-10"></div>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--space-color)]/20 text-[var(--space-color)] shrink-0">
                            <Icon className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">{space.name}</h3>
                            <p className="text-sm text-[var(--text-secondary)]">{totalItems} פריטים</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSummarize(); }} 
                            className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--space-color)]/20 hover:text-[var(--space-color)] transition-colors" 
                            aria-label="AI Summary"
                        >
                            <SparklesIcon className="w-5 h-5" />
                        </button>
                        <div className="p-2 rounded-full text-[var(--text-secondary)]">
                            <svg className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const LibraryScreen: React.FC<{ setActiveScreen: (screen: Screen) => void }> = ({ setActiveScreen }) => {
    const { state, dispatch } = useContext(AppContext);
    const { personalItems, spaces, isLoading, settings } = state;
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu<PersonalItem>();
    
    const [currentView, setCurrentView] = useState<'list' | 'board' | 'calendar'>('list');
    const [expandedSpaces, setExpandedSpaces] = useState<string[]>([]);
    const [selectedItem, setSelectedItem] = useState<PersonalItem | null>(null);
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number, onUndo?: () => void} | null>(null);
    
    // --- State for Batch Actions ---
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // --- State for "Quick Add" ---
    const [isAdding, setIsAdding] = useState(false);
    const [addConfig, setAddConfig] = useState<{type: AddableType; defaultStatus?: 'todo'|'doing'|'done'; defaultDueDate?: string} | null>(null);
    
    // --- New State for Search & Sort ---
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'type' | 'importance' | 'title'>('date-desc');
    const debouncedQuery = useDebounce(searchQuery, 300);

    // --- Drag & Drop State for List View ---
    const dragItem = useRef<PersonalItem | null>(null);
    const dragOverItem = useRef<PersonalItem | null>(null);
    const [dragging, setDragging] = useState(false);
    const headerRef = useRef<HTMLElement>(null);

    // State for AI Summary Modal
    const [summaryModalState, setSummaryModalState] = useState<{isOpen: boolean; space: Space | null; content: string | null; isLoading: boolean}>({
        isOpen: false, space: null, content: null, isLoading: false
    });
    
    useEffect(() => {
        const handleScroll = () => {
            if (headerRef.current) {
                const scrollY = window.scrollY;
                const translateY = Math.min(scrollY * 0.5, 150);
                headerRef.current.style.transform = `translateY(-${translateY}px)`;
                headerRef.current.style.opacity = `${Math.max(1 - scrollY / 200, 0)}`;
            }
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const showStatus = (type: StatusMessageType, text: string, onUndo?: () => void) => {
        if (type === 'error' && window.navigator.vibrate) {
            window.navigator.vibrate(100);
        }
        setStatusMessage({ type, text, id: Date.now(), onUndo });
    };

    const personalSpaces = useMemo(() => spaces.filter(s => s.type === 'personal'), [spaces]);
    
    const { itemsBySpace, kanbanItems, calendarItems, itemCountsBySpace } = useMemo(() => {
        const sortedAndFilteredItems = personalItems
            .filter(item => {
                if (!debouncedQuery) return true;
                const query = debouncedQuery.toLowerCase();
                return item.title.toLowerCase().includes(query) || (item.content || '').toLowerCase().includes(query);
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case 'date-asc':
                        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    case 'type':
                        return a.type.localeCompare(b.type) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    case 'importance':
                        return (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    case 'title':
                        return a.title.localeCompare(b.title, 'he');
                    case 'date-desc':
                    default:
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
            });

        const map = new Map<string, PersonalItem[]>();
        personalSpaces.forEach(space => map.set(space.id, []));
        const kItems: PersonalItem[] = [];
        const cItems: PersonalItem[] = [];
        const kanbanTypes: PersonalItemType[] = ['task', 'goal', 'roadmap', 'learning', 'idea'];

        sortedAndFilteredItems.forEach(item => {
            if (item.spaceId && map.has(item.spaceId)) {
                map.get(item.spaceId)!.push(item);
            }
            if (kanbanTypes.includes(item.type)) {
                kItems.push(item);
            }
            if ((item.type === 'task' && item.dueDate) || (item.type === 'goal' && item.metadata?.targetDate)) {
                cItems.push(item);
            }
        });
        
        const counts = new Map<string, { total: number; byType: Record<string, number> }>();
        personalSpaces.forEach(space => {
            const itemsInSpace = personalItems.filter(i => i.spaceId === space.id);
            const byType: Record<string, number> = {};
            itemsInSpace.forEach(item => {
                byType[item.type] = (byType[item.type] || 0) + 1;
            });
            counts.set(space.id, { total: itemsInSpace.length, byType });
        });
        
        return { itemsBySpace: map, kanbanItems: kItems, calendarItems: cItems, itemCountsBySpace: counts };
    }, [personalItems, personalSpaces, debouncedQuery, sortBy]);
    
    const openAddItemModal = useCallback((config: {type: AddableType; defaultStatus?: 'todo'|'doing'|'done'; defaultDueDate?: string}) => {
        setAddConfig(config);
        setIsAdding(true);
    }, []);

    const handleToggleSpace = useCallback((spaceId: string) => {
        setExpandedSpaces(prev => 
            prev.includes(spaceId)
                ? prev.filter(id => id !== spaceId)
                : [...prev, spaceId]
        );
    }, []);

    const handleSummarizeSpace = async (space: Space) => {
        setSummaryModalState({ isOpen: true, space, content: null, isLoading: true });
        try {
            const itemsInSpace = itemsBySpace.get(space.id) || [];
            const summary = await summarizeSpaceContent(itemsInSpace, space.name);
            setSummaryModalState(s => ({ ...s, content: summary, isLoading: false }));
        } catch (error) {
            console.error(error);
            setSummaryModalState(s => ({ ...s, content: 'שגיאה בעת יצירת הסיכום.', isLoading: false }));
        }
    };
    
    const handleSelectItem = useCallback((item: PersonalItem, event?: React.MouseEvent) => {
        if (selectionMode) {
            event?.stopPropagation();
            const newIds = new Set(selectedIds);
            if (newIds.has(item.id)) {
                newIds.delete(item.id);
            } else {
                newIds.add(item.id);
            }
            setSelectedIds(newIds);
            if (newIds.size === 0) {
                setSelectionMode(false);
            }
        } else {
            event?.stopPropagation();
            setSelectedItem(item);
        }
    }, [selectionMode, selectedIds]);

    const handleLongPress = (item: PersonalItem) => {
        if (window.navigator.vibrate) window.navigator.vibrate(50);
        setSelectionMode(true);
        setSelectedIds(new Set([item.id]));
    };
    
    const handleCloseModal = useCallback((nextItem?: PersonalItem) => {
        setSelectedItem(nextItem || null);
    }, []);

    const handleUpdateItem = useCallback(async (id: string, updates: Partial<PersonalItem>) => {
        const originalItem = personalItems.find(item => item.id === id);
        if (!originalItem) return;

        // Optimistic UI update
        dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id, updates } });
        setSelectedItem(prev => (prev && prev.id === id) ? { ...prev, ...updates } : prev);

        try {
            await updatePersonalItem(id, updates);
        } catch (error) {
            console.error("Failed to update item:", error);
            // Rollback on failure
            dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id, updates: originalItem } });
            setSelectedItem(prev => (prev && prev.id === id) ? originalItem : prev);
            showStatus('error', 'שגיאה בעדכון הפריט.');
        }
    }, [dispatch, personalItems]);
    
    const handleDeleteItem = useCallback(async (id: string) => {
        const itemToDelete = personalItems.find(item => item.id === id);
        if (!itemToDelete) return;
    
        if (window.navigator.vibrate) window.navigator.vibrate(50);
    
        // Optimistic UI update
        await removePersonalItem(id);
        dispatch({ type: 'REMOVE_PERSONAL_ITEM', payload: id });
    
        showStatus('success', 'הפריט נמחק.', async () => {
            await reAddPersonalItem(itemToDelete);
            dispatch({ type: 'ADD_PERSONAL_ITEM', payload: itemToDelete });
        });
    }, [dispatch, personalItems]);

    const handleDuplicateItem = useCallback(async (id: string) => {
        const newItem = await duplicatePersonalItem(id);
        dispatch({ type: 'ADD_PERSONAL_ITEM', payload: newItem });
        showStatus('success', 'הפריט שוכפל');
    }, [dispatch]);

    const handleStartFocus = useCallback((item: PersonalItem) => {
        dispatch({ type: 'START_FOCUS_SESSION', payload: item });
    }, [dispatch]);
    
    const handleDragEnd = () => {
        if (!dragItem.current || !dragOverItem.current || dragItem.current.id === dragOverItem.current.id) {
            setDragging(false);
            return;
        }

        const spaceId = dragItem.current.spaceId;
        if (!spaceId) return;

        const itemsInSpace = itemsBySpace.get(spaceId) || [];
        const dragItemIndex = itemsInSpace.findIndex(i => i.id === dragItem.current!.id);
        const dragOverItemIndex = itemsInSpace.findIndex(i => i.id === dragOverItem.current!.id);
        
        if (dragItemIndex === -1 || dragOverItemIndex === -1) return;

        let newCreatedAt: string;

        if (dragItemIndex > dragOverItemIndex) { // Moving UP
            const prevItem = itemsInSpace[dragOverItemIndex - 1];
            const nextItem = itemsInSpace[dragOverItemIndex];
            const nextItemTime = new Date(nextItem.createdAt).getTime();
            if (prevItem) {
                const prevItemTime = new Date(prevItem.createdAt).getTime();
                newCreatedAt = new Date((prevItemTime + nextItemTime) / 2).toISOString();
            } else {
                newCreatedAt = new Date(nextItemTime + 1000).toISOString();
            }
        } else { // Moving DOWN
            const prevItem = itemsInSpace[dragOverItemIndex];
            const nextItem = itemsInSpace[dragOverItemIndex + 1];
            const prevItemTime = new Date(prevItem.createdAt).getTime();
            if (nextItem) {
                const nextItemTime = new Date(nextItem.createdAt).getTime();
                newCreatedAt = new Date((prevItemTime + nextItemTime) / 2).toISOString();
            } else {
                newCreatedAt = new Date(prevItemTime - 1000).toISOString();
            }
        }
        
        handleUpdateItem(dragItem.current.id, { createdAt: newCreatedAt });

        setDragging(false);
        dragItem.current = null;
        dragOverItem.current = null;
    };
    
    // --- Batch Action Handlers ---
    const handleBatchCancel = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handleBatchToggleImportant = () => {
        const itemsToUpdate = Array.from(selectedIds).map(id => personalItems.find(item => item.id === id)).filter(Boolean) as PersonalItem[];
        const shouldMarkImportant = itemsToUpdate.some(item => !item.isImportant);
        itemsToUpdate.forEach(item => handleUpdateItem(item.id, { isImportant: shouldMarkImportant }));
        handleBatchCancel();
    };
    
    const handleBatchDuplicate = () => {
        const itemsToDuplicate = Array.from(selectedIds).map(id => personalItems.find(item => item.id === id)).filter(Boolean) as PersonalItem[];
        itemsToDuplicate.forEach(item => handleDuplicateItem(item.id));
        showStatus('success', `${itemsToDuplicate.length} פריטים שוכפלו.`);
        handleBatchCancel();
    };

    const handleBatchDelete = async () => {
        const itemsToDelete = Array.from(selectedIds).map(id => personalItems.find(item => item.id === id)).filter(Boolean) as PersonalItem[];
        
        if (window.navigator.vibrate) window.navigator.vibrate(100);

        itemsToDelete.forEach(item => {
             dispatch({ type: 'REMOVE_PERSONAL_ITEM', payload: item.id });
        });
        
        try {
            await Promise.all(itemsToDelete.map(item => removePersonalItem(item.id)));
            showStatus('success', `${itemsToDelete.length} פריטים נמחקו.`);
        } catch (error) {
            console.error('Batch delete failed:', error);
            showStatus('error', 'שגיאה במחיקת הפריטים.');
        }

        handleBatchCancel();
    };


    const renderCurrentView = () => {
        switch(currentView) {
            case 'board':
                // FIX: Pass openAddItemModal directly to onQuickAdd. The signatures are compatible.
                return <KanbanView items={kanbanItems} onUpdate={handleUpdateItem} onSelectItem={handleSelectItem} onQuickAdd={openAddItemModal} />;
            case 'calendar':
                return <CalendarView items={calendarItems} onUpdate={handleUpdateItem} onSelectItem={handleSelectItem} onQuickAdd={(type, date) => openAddItemModal({ type, defaultDueDate: date })} />;
            case 'list':
            default:
                return (
                    <div className="space-y-4">
                        {personalSpaces.map((space, spaceIndex) => {
                            const counts = itemCountsBySpace.get(space.id);
                            const isExpanded = expandedSpaces.includes(space.id);
                            const items = itemsBySpace.get(space.id) || [];
                            
                            return (
                                <div key={space.id} className="animate-item-enter-fi" style={{ animationDelay: `${spaceIndex * 80}ms`}}>
                                    <SpaceHeader 
                                        space={space}
                                        itemCounts={counts?.byType || {}}
                                        totalItems={counts?.total || 0}
                                        isExpanded={isExpanded}
                                        onToggle={() => handleToggleSpace(space.id)}
                                        onSummarize={() => handleSummarizeSpace(space)}
                                    />
                                    {isExpanded && (
                                        <div className="pl-4 pt-3 space-y-3 border-l-2" style={{ borderColor: `${space.color}40`}}>
                                            {items.map((item, index) => (
                                                <div 
                                                    key={item.id}
                                                    draggable
                                                    onDragStart={() => { dragItem.current = item; setDragging(true); }}
                                                    onDragEnter={() => { dragOverItem.current = item; }}
                                                    onDragEnd={handleDragEnd}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    className={`transition-opacity duration-300 ${dragging && dragItem.current?.id === item.id ? 'dragging-item' : ''}`}
                                                >
                                                    <PersonalItemCard 
                                                        item={item} 
                                                        onSelect={handleSelectItem} 
                                                        onUpdate={handleUpdateItem} 
                                                        onContextMenu={handleContextMenu} 
                                                        index={index}
                                                        spaceColor={space.color}
                                                        onLongPress={handleLongPress}
                                                        isInSelectionMode={selectionMode}
                                                        isSelected={selectedIds.has(item.id)}
                                                    />
                                                </div>
                                            ))}
                                            {items.length === 0 && <p className="text-sm text-center text-[var(--text-secondary)] py-4">אין פריטים התואמים לחיפוש במרחב זה.</p>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
        }
    }


    return (
        <div className={`pt-4 pb-8 space-y-6 ${selectionMode ? 'selection-mode' : ''}`}>
             <header ref={headerRef} className="flex justify-between items-center sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20 border-b border-[var(--border-primary)] -mx-4 px-4 transition-transform,opacity duration-300">
                <h1 className="hero-title themed-title">
                    {settings.screenLabels?.library || 'המתכנן'}
                </h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setActiveScreen('add')} className="p-2 rounded-full bg-[var(--bg-secondary)] text-white hover:bg-white/20 transition-colors">
                        <AddIcon className="w-6 h-6"/>
                    </button>
                    <button onClick={() => setActiveScreen('settings')} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors">
                        <SettingsIcon className="w-6 h-6"/>
                    </button>
                </div>
            </header>
            
            <div className={`transition-all duration-500 var(--fi-cubic-bezier) ${selectedItem || isAdding ? 'receding-background' : ''}`}>
                <div className="px-4 space-y-4">
                   <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
                    {currentView === 'list' && (
                        <div className="flex gap-2 animate-screen-enter">
                            <div className="relative flex-grow">
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <SearchIcon className="h-5 w-5 text-[var(--text-secondary)]" />
                                </div>
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="חפש בספרייה..."
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg py-2 pr-10 pl-3 focus:outline-none focus:ring-1 focus:ring-[var(--dynamic-accent-start)] transition-all"
                                />
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[var(--dynamic-accent-start)] text-sm"
                            >
                                <option value="date-desc">תאריך (חדש {'<'} ישן)</option>
                                <option value="date-asc">תאריך (ישן {'<'} חדש)</option>
                                <option value="importance">חשיבות</option>
                                <option value="type">סוג</option>
                                <option value="title">שם (א-ת)</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="pt-6">
                    {isLoading && <SkeletonLoader count={3} />}
                    
                    {!isLoading && personalSpaces.length > 0 ? (
                        renderCurrentView()
                    ) : !isLoading ? (
                         <div className="text-center text-[var(--text-secondary)] mt-16 flex flex-col items-center">
                            <LayoutDashboardIcon className="w-16 h-16 text-gray-700 mb-4"/>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">אין מרחבים אישיים</h2>
                            <p className="max-w-xs text-sm mb-6">צור מרחבים חדשים בהגדרות כדי לארגן את הפריטים שלך.</p>
                            <button
                                onClick={() => setActiveScreen('settings')}
                                className="bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-6 rounded-2xl transition-all transform active:scale-95"
                            >
                                פתח הגדרות
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            <PersonalItemDetailModal
                item={selectedItem}
                onClose={handleCloseModal}
                onUpdate={handleUpdateItem}
            />
             {contextMenu.isOpen && contextMenu.item && !selectionMode && (
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
            {summaryModalState.isOpen && summaryModalState.space && (
                <SpaceSummaryModal
                    spaceName={summaryModalState.space.name}
                    isLoading={summaryModalState.isLoading}
                    summary={summaryModalState.content}
                    onClose={() => setSummaryModalState({ isOpen: false, space: null, content: null, isLoading: false })}
                />
            )}
             {isAdding && addConfig && (
                <ItemCreationForm
                    key={addConfig.type + (addConfig.defaultDueDate || '')} // Force re-render
                    itemType={addConfig.type}
                    onClose={() => setIsAdding(false)}
                    setActiveScreen={setActiveScreen}
                    defaultStatus={addConfig.defaultStatus}
                    defaultDueDate={addConfig.defaultDueDate}
                />
            )}
             {selectionMode && (
                <BatchActionBar 
                    count={selectedIds.size}
                    onCancel={handleBatchCancel}
                    onToggleImportant={handleBatchToggleImportant}
                    onDuplicate={handleBatchDuplicate}
                    onDelete={handleBatchDelete}
                />
             )}
             {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
        </div>
    );
};

export default LibraryScreen;