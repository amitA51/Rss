import React, { useState, useCallback, useContext, useMemo, useRef, useEffect } from 'react';
import type { PersonalItem, Screen } from '../types';
import TaskItem from '../components/TaskItem';
import HabitItem from '../components/HabitItem';
import PersonalItemDetailModal from '../components/PersonalItemDetailModal';
import PersonalItemContextMenu from '../components/PersonalItemContextMenu';
import DailyBriefingModal from '../components/DailyBriefingModal';
import QuickAddTask from '../components/QuickAddTask';
import DailyProgressCircle from '../components/DailyProgressCircle';
import { SettingsIcon, SparklesIcon, EyeIcon, EyeOffIcon, CheckSquareIcon, StopwatchIcon } from '../components/icons';
import SkeletonLoader from '../components/SkeletonLoader';
import { AppContext } from '../state/AppContext';
import { generateDailyBriefing } from '../services/geminiService';
import { isHabitForToday } from '../hooks/useTodayItems';
import { useContextMenu } from '../hooks/useContextMenu';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';
import { useHomeInteraction } from '../hooks/useHomeInteraction';
import { rollOverIncompleteTasks } from '../services/dataService';
import { useHaptics } from '../hooks/useHaptics';
import { useItemReordering } from '../hooks/useItemReordering';


interface HomeScreenProps {
    setActiveScreen: (screen: Screen) => void;
}

type ViewMode = 'today' | 'tomorrow' | 'week';

const ViewSwitcher: React.FC<{
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}> = ({ currentView, onViewChange }) => {
    const views: { id: ViewMode, label: string }[] = [
        { id: 'today', label: 'היום' },
        { id: 'tomorrow', label: 'מחר' },
        { id: 'week', label: 'השבוע' },
    ];
    return (
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-full max-w-sm mx-auto">
            {views.map(view => (
                <button
                    key={view.id}
                    onClick={() => onViewChange(view.id)}
                    className={`flex-1 px-4 py-2 text-sm rounded-full font-medium transition-all ${
                        currentView === view.id ? 'bg-[var(--accent-gradient)] text-white shadow-[0_0_10px_var(--dynamic-accent-glow)]' : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                >
                    {view.label}
                </button>
            ))}
        </div>
    );
};

const Section: React.FC<{
    title: string;
    children: React.ReactNode;
    count: number;
    isCollapsible: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    className?: string;
    componentId: string;
}> = ({ title, children, count, isCollapsible, isExpanded, onToggle, className, componentId }) => {
    if (count === 0) return null;
    const sectionContentId = `section-content-${componentId}`;

    return (
        <section className={className}>
             <button
                onClick={onToggle}
                aria-expanded={isExpanded}
                aria-controls={sectionContentId}
                className="w-full flex justify-between items-center mb-3 px-1 disabled:cursor-default"
                disabled={!isCollapsible}
            >
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{title}</h2>
                {isCollapsible && (
                     <div className="flex items-center gap-2 text-[var(--text-secondary)] p-1">
                        <span className="text-xs font-mono">{count > 0 ? count : ''}</span>
                        <svg className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                )}
            </button>
            {isExpanded && <div id={sectionContentId} className="space-y-3">{children}</div>}
        </section>
    );
};


const HomeScreen: React.FC<HomeScreenProps> = ({ setActiveScreen }) => {
    const { state, dispatch } = useContext(AppContext);
    const { isLoading, settings, personalItems } = state;
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu<PersonalItem>();
    const { triggerHaptic } = useHaptics();
    
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number, onUndo?: () => void} | null>(null);
    const showStatus = useCallback((type: StatusMessageType, text: string, onUndo?: () => void) => {
        if (type === 'error') {
            triggerHaptic('heavy');
        }
        setStatusMessage({ type, text, id: Date.now(), onUndo });
    }, [triggerHaptic]);

    const {
        selectedItem,
        handleSelectItem,
        handleCloseModal,
        handleUpdateItem,
        handleDeleteItem,
        handleDeleteWithConfirmation,
        handleDuplicateItem,
        handleStartFocus,
    } = useHomeInteraction(showStatus);

    const [view, setView] = useState<ViewMode>('today');
    
    const { tasks, habits } = useMemo(() => {
        const allHabits = personalItems.filter(item => item.type === 'habit');
        const sortedAllHabits = allHabits.sort((a, b) => (a.order ?? new Date(a.createdAt).getTime()) - (b.order ?? new Date(b.createdAt).getTime()));

        const openTasks = personalItems.filter(item => item.type === 'task' && !item.isCompleted);
        
        let filteredTasks: PersonalItem[];
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const parseDate = (dateStr: string) => {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day);
        };

        if (view === 'today') {
            const tomorrowEnd = new Date();
            tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
            tomorrowEnd.setHours(23, 59, 59, 999);

            // Overdue, today's, tomorrow's and undated tasks
            const dated = openTasks.filter(item => {
                if (!item.dueDate) return false;
                const dueDate = parseDate(item.dueDate);
                // Set to end of day for consistent comparison
                dueDate.setHours(23, 59, 59, 999);
                return dueDate <= tomorrowEnd;
            });
            const undated = openTasks.filter(item => !item.dueDate);
            filteredTasks = [...dated, ...undated];
        } else if (view === 'tomorrow') {
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(todayStart.getDate() + 1);
            const tomorrowEnd = new Date(tomorrowStart);
            tomorrowEnd.setHours(23, 59, 59, 999);
            
            filteredTasks = openTasks.filter(item => {
                if (!item.dueDate) return false;
                const dueDate = parseDate(item.dueDate);
                return dueDate >= tomorrowStart && dueDate <= tomorrowEnd;
            });
        } else { // 'week'
            const weekEnd = new Date(todayStart);
            weekEnd.setDate(todayStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            
            filteredTasks = openTasks.filter(item => {
                if (!item.dueDate) return false;
                const dueDate = parseDate(item.dueDate);
                return dueDate >= todayStart && dueDate <= weekEnd;
            });
        }

        const sortedTasks = filteredTasks.sort((a, b) => {
            if (!a.dueDate && b.dueDate) return 1;
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && !b.dueDate) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

            const dateA = parseDate(a.dueDate!).getTime();
            const dateB = parseDate(b.dueDate!).getTime();
            if (dateA !== dateB) return dateA - dateB;

            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return (priorityOrder[a.priority || 'medium']) - (priorityOrder[b.priority || 'medium']);
        });

        return { 
            tasks: sortedTasks,
            habits: sortedAllHabits,
        };
    }, [personalItems, view]);


    const [focusMode, setFocusMode] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Array<string>>(['fixed_habits']);
    const [isBriefingLoading, setIsBriefingLoading] = useState(false);
    const [briefingContent, setBriefingContent] = useState('');
    const headerRef = useRef<HTMLElement>(null);
    
    const tasksReordering = useItemReordering(tasks, handleUpdateItem, 'createdAt');
    const habitsReordering = useItemReordering(habits, handleUpdateItem, 'order');


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


    const handleToggleCollapse = (id: string) => {
        setCollapsedSections(prev => 
            prev.includes(id) ? prev.filter(sectionId => sectionId !== id) : [...prev, id]
        );
    };

    const handleStartGlobalFocus = useCallback(() => {
        if (tasks.length > 0) {
            handleStartFocus(tasks[0]);
        } else {
            showStatus('success', 'אין משימות פתוחות להתמקד בהן.');
        }
    }, [tasks, handleStartFocus, showStatus]);

    const handleGetBriefing = async () => {
        if (isBriefingLoading) return;
        setIsBriefingLoading(true);
        setBriefingContent('');
        try {
            const gratitudeItem = personalItems.find(item => item.type === 'gratitude' && new Date(item.createdAt).toDateString() === new Date().toDateString());
            const habitsForBriefing = personalItems.filter(item => item.type === 'habit' && isHabitForToday(item));
            const briefing = await generateDailyBriefing(tasks.slice(0,3), habitsForBriefing, gratitudeItem?.content || null, settings.aiPersonality);
            setBriefingContent(briefing);
        } catch (error) {
            console.error(error);
            setBriefingContent("שגיאה בעת יצירת התדריך. אנא נסה שוב.");
        } finally {
            setIsBriefingLoading(false);
        }
    };

    const handleRollOverTasks = async () => {
        const updates = await rollOverIncompleteTasks();
        if (updates.length > 0) {
            updates.forEach(update => {
                dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: update });
            });
            showStatus('success', `גלגלת ${updates.length} משימות להיום.`);
        } else {
            showStatus('success', 'אין משימות לגלגל.');
        }
    };

    const { completionPercentage, overdueTasksCount } = useMemo(() => {
        const totalHabits = personalItems.filter(i => i.type === 'habit').length;
        const uncompletedHabitsToday = personalItems.filter(i => i.type === 'habit' && isHabitForToday(i)).length;
        const habitsCompletedToday = totalHabits - uncompletedHabitsToday;
        
        const openTasks = personalItems.filter(i => i.type === 'task' && !i.isCompleted);
        const totalTasks = personalItems.filter(i => i.type === 'task').length;
        const tasksCompleted = totalTasks - openTasks.length;

        const totalTrackedItems = totalHabits + totalTasks;
        const totalCompleted = habitsCompletedToday + tasksCompleted;
        const percentage = totalTrackedItems > 0 ? (totalCompleted / totalTrackedItems) * 100 : 0;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const overdue = openTasks.filter(t => t.dueDate && new Date(t.dueDate) < today).length;

        return { completionPercentage: percentage, overdueTasksCount: overdue };
    }, [personalItems]);
    
    const todayDate = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

    const getSectionTitle = () => {
        switch (view) {
            case 'today': return 'משימות להיום';
            case 'tomorrow': return 'משימות למחר';
            case 'week': return 'משימות לשבוע';
            default: return 'משימות';
        }
    };

    return (
        <div className={`pt-4 pb-8 space-y-8 transition-all duration-300 ${focusMode ? 'focus-mode' : ''}`}>
            <header ref={headerRef} className="sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20 -mx-4 px-4 transition-transform,opacity duration-300">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <DailyProgressCircle percentage={completionPercentage} />
                        <div>
                            <h1 className="text-3xl font-bold themed-title">{settings.screenLabels?.today || 'היום'}</h1>
                            <p className="text-sm text-[var(--dynamic-accent-end)] opacity-90">{todayDate}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setFocusMode(!focusMode)} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors" aria-label={focusMode ? "כבה מצב פוקוס" : "הפעל מצב פוקוס"}>
                            {focusMode ? <EyeOffIcon className="w-6 h-6"/> : <EyeIcon className="w-6 h-6"/>}
                        </button>
                         <button onClick={handleStartGlobalFocus} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors" aria-label="התחל סשן פוקוס כללי">
                            <StopwatchIcon className="w-6 h-6"/>
                        </button>
                        <button onClick={handleGetBriefing} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors" aria-label="הצג תדריך יומי">
                            <SparklesIcon className="w-6 h-6"/>
                        </button>
                        <button onClick={() => setActiveScreen('settings')} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors" aria-label="פתח הגדרות">
                            <SettingsIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>
            </header>
            
            <div className="animate-screen-enter px-4">
                 <ViewSwitcher currentView={view} onViewChange={setView} />
            </div>

            <div className="animate-screen-enter">
                <QuickAddTask onItemAdded={(message) => showStatus('success', message)} />
                <div className="mt-8 space-y-8">
                    {isLoading ? <SkeletonLoader count={5} /> : (
                        <>
                            <Section componentId="tasks" title={getSectionTitle()} count={tasks.length} isCollapsible={true} isExpanded={!collapsedSections.includes('tasks')} onToggle={() => handleToggleCollapse('tasks')} className="pl-8">
                                <div onDrop={tasksReordering.handleDrop}>
                                    {tasks.map((item, index) => <div key={item.id} draggable onDragStart={(e) => tasksReordering.handleDragStart(e, item)} onDragEnter={(e) => tasksReordering.handleDragEnter(e, item)} onDragEnd={tasksReordering.handleDragEnd} onDragOver={(e) => e.preventDefault()} className={`transition-opacity duration-300 ${tasksReordering.draggingItem?.id === item.id ? 'dragging-item' : ''} cursor-grab`}><TaskItem item={item} onUpdate={handleUpdateItem} onDelete={handleDeleteItem} onSelect={handleSelectItem} onContextMenu={handleContextMenu} onStartFocus={handleStartFocus} index={index}/></div>)}
                                </div>
                                {tasks.length === 0 && !collapsedSections.includes('tasks') && <p className="text-center text-sm text-[var(--text-secondary)] py-4">אין משימות לתצוגה זו.</p>}
                                {view === 'today' && overdueTasksCount > 0 && !collapsedSections.includes('tasks') && (<button onClick={handleRollOverTasks} className="mt-4 text-sm w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-[var(--accent-highlight)] font-semibold py-2 px-4 rounded-xl transition-colors"><CheckSquareIcon className="w-5 h-5"/> גלגל {overdueTasksCount} משימות שעבר זמנן</button>)}
                            </Section>

                            <Section componentId="fixed_habits" title="הרגלים קבועים" count={habits.length} isCollapsible={true} isExpanded={!collapsedSections.includes('fixed_habits')} onToggle={() => handleToggleCollapse('fixed_habits')} className="pl-8 non-essential-section">
                                <div onDrop={habitsReordering.handleDrop}>
                                    {habits.map((item, index) => <div key={item.id} draggable onDragStart={(e) => habitsReordering.handleDragStart(e, item)} onDragEnter={(e) => habitsReordering.handleDragEnter(e, item)} onDragEnd={habitsReordering.handleDragEnd} onDragOver={(e) => e.preventDefault()} className={`transition-opacity duration-300 ${habitsReordering.draggingItem?.id === item.id ? 'dragging-item' : ''} cursor-grab`}><HabitItem item={item} onUpdate={handleUpdateItem} onDelete={handleDeleteItem} onSelect={handleSelectItem} onContextMenu={handleContextMenu} index={index}/></div>)}
                                </div>
                            </Section>
                        </>
                    )}
                </div>
            </div>

            {selectedItem && <PersonalItemDetailModal item={selectedItem} onClose={handleCloseModal} onUpdate={handleUpdateItem} onDelete={handleDeleteWithConfirmation} />}
            {contextMenu.isOpen && contextMenu.item && <PersonalItemContextMenu x={contextMenu.x} y={contextMenu.y} item={contextMenu.item} onClose={closeContextMenu} onUpdate={handleUpdateItem} onDelete={handleDeleteItem} onDuplicate={handleDuplicateItem} onStartFocus={handleStartFocus} />}
            {(isBriefingLoading || briefingContent) && <DailyBriefingModal isLoading={isBriefingLoading} briefingContent={briefingContent} onClose={() => setBriefingContent('')} />}
            {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
        </div>
    );
};

export default HomeScreen;