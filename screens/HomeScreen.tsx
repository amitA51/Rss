import React, { useState, useCallback, useContext, useMemo, useRef, useEffect } from 'react';
import type { PersonalItem, HomeScreenComponent, Screen, HomeScreenComponentId } from '../types';
import TaskItem from '../components/TaskItem';
import HabitItem from '../components/HabitItem';
import PersonalItemDetailModal from '../components/PersonalItemDetailModal';
import PersonalItemContextMenu from '../components/PersonalItemContextMenu';
import DailyBriefingModal from '../components/DailyBriefingModal';
import GratitudeTracker from '../components/GratitudeTracker';
import QuickAddTask from '../components/QuickAddTask';
import DailyProgressCircle from '../components/DailyProgressCircle';
import { SettingsIcon, SparklesIcon, DragHandleIcon, EyeIcon, EyeOffIcon, CheckSquareIcon, StopwatchIcon } from '../components/icons';
import SkeletonLoader from '../components/SkeletonLoader';
import { AppContext } from '../state/AppContext';
import { saveSettings } from '../services/settingsService';
import { generateDailyBriefing } from '../services/geminiService';
import { useTodayItems } from '../hooks/useTodayItems';
import { useContextMenu } from '../hooks/useContextMenu';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';
import { useHomeInteraction } from '../hooks/useHomeInteraction';
import { rollOverIncompleteTasks } from '../services/dataService';
import { useHaptics } from '../hooks/useHaptics';


interface HomeScreenProps {
    setActiveScreen: (screen: Screen) => void;
}

const Section: React.FC<{
    title: string;
    children: React.ReactNode;
    count: number;
    isCollapsible: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    className?: string;
    componentId: HomeScreenComponentId | 'completed';
}> = ({ title, children, count, isCollapsible, isExpanded, onToggle, className, componentId }) => {
    if (count === 0 && componentId !== 'gratitude') return null;
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
                        {componentId !== 'gratitude' && <span className="text-xs font-mono">{count}</span>}
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
    const { todaysHabits, openTasks } = useTodayItems();
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

    const [layout, setLayout] = useState<HomeScreenComponent[]>(settings.homeScreenLayout);
    const [focusMode, setFocusMode] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Array<HomeScreenComponentId | 'completed'>>(['completed']);

    const [isBriefingLoading, setIsBriefingLoading] = useState(false);
    const [briefingContent, setBriefingContent] = useState('');
    const headerRef = useRef<HTMLElement>(null);

    // State for SECTION dragging
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [dragging, setDragging] = useState(false);

    // State for TASK dragging
    const dragTask = useRef<PersonalItem | null>(null);
    const dragOverTask = useRef<PersonalItem | null>(null);
    const [draggingTask, setDraggingTask] = useState(false);

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

    const handleDrop = () => {
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const newLayout = [...layout];
            const dragItemContent = newLayout[dragItem.current];
            newLayout.splice(dragItem.current, 1);
            newLayout.splice(dragOverItem.current, 0, dragItemContent);
            setLayout(newLayout);
            const newSettings = { ...settings, homeScreenLayout: newLayout };
            saveSettings(newSettings);
            dispatch({ type: 'SET_SETTINGS', payload: newSettings });
        }
        dragItem.current = null;
        dragOverItem.current = null;
        setDragging(false);
    };

    const handleToggleCollapse = (id: HomeScreenComponentId | 'completed') => {
        setCollapsedSections(prev => 
            prev.includes(id) ? prev.filter(sectionId => sectionId !== id) : [...prev, id]
        );
    };

    const handleStartGlobalFocus = useCallback(() => {
        if (openTasks.length > 0) {
            handleStartFocus(openTasks[0]);
        } else {
            showStatus('success', 'אין משימות פתוחות להתמקד בהן.');
        }
    }, [openTasks, handleStartFocus, showStatus]);

    const handleGetBriefing = async () => {
        if (isBriefingLoading) return;
        setIsBriefingLoading(true);
        setBriefingContent('');
        try {
            const gratitudeItem = personalItems.find(item => item.type === 'gratitude' && new Date(item.createdAt).toDateString() === new Date().toDateString());
            const briefing = await generateDailyBriefing(openTasks.slice(0,3), todaysHabits, gratitudeItem?.content || null, settings.aiPersonality);
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
    
    const handleTaskDrop = () => {
        if (!dragTask.current || !dragOverTask.current || dragTask.current.id === dragOverTask.current.id) {
            setDraggingTask(false);
            return;
        }
    
        const tasks = openTasks;
        const dragItemIndex = tasks.findIndex(i => i.id === dragTask.current!.id);
        const dragOverItemIndex = tasks.findIndex(i => i.id === dragOverTask.current!.id);
    
        if (dragItemIndex === -1 || dragOverItemIndex === -1) return;
    
        let newCreatedAt: string;
    
        if (dragItemIndex > dragOverItemIndex) { // Moving UP
            const prevItem = tasks[dragOverItemIndex - 1];
            const nextItem = tasks[dragOverItemIndex];
            const nextItemTime = new Date(nextItem.createdAt).getTime();
            if (prevItem) {
                const prevItemTime = new Date(prevItem.createdAt).getTime();
                newCreatedAt = new Date((prevItemTime + nextItemTime) / 2).toISOString();
            } else {
                newCreatedAt = new Date(nextItemTime + 1000).toISOString();
            }
        } else { // Moving DOWN
            const prevItem = tasks[dragOverItemIndex];
            const nextItem = tasks[dragOverItemIndex + 1];
            const prevItemTime = new Date(prevItem.createdAt).getTime();
            if (nextItem) {
                const nextItemTime = new Date(nextItem.createdAt).getTime();
                newCreatedAt = new Date((prevItemTime + nextItemTime) / 2).toISOString();
            } else {
                newCreatedAt = new Date(prevItemTime - 1000).toISOString();
            }
        }
    
        handleUpdateItem(dragTask.current.id, { createdAt: newCreatedAt });
    
        setDraggingTask(false);
        dragTask.current = null;
        dragOverTask.current = null;
    };

    const { completionPercentage, overdueTasksCount, completedTodayTasks } = useMemo(() => {
        const allHabits = personalItems.filter(i => i.type === 'habit');
        const habitsCompletedToday = allHabits.filter(h => h.lastCompleted && new Date(h.lastCompleted).toDateString() === new Date().toDateString()).length;
        
        const allTasks = personalItems.filter(i => i.type === 'task');
        const tasksCompleted = allTasks.filter(t => t.isCompleted).length;
        
        const totalItems = allHabits.length + allTasks.length;
        const totalCompleted = habitsCompletedToday + tasksCompleted;
        const percentage = totalItems > 0 ? (totalCompleted / totalItems) * 100 : 0;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const overdue = allTasks.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) < today).length;

        const completedToday = allTasks.filter(t => t.isCompleted && t.lastCompleted && new Date(t.lastCompleted).toDateString() === today.toDateString());

        return { completionPercentage: percentage, overdueTasksCount: overdue, completedTodayTasks: completedToday };
    }, [personalItems]);
    
    const todayDate = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

    const componentsMap: Record<HomeScreenComponentId, React.ReactNode> = {
        gratitude: <GratitudeTracker />,
        habits: todaysHabits.map((item, index) => <HabitItem key={item.id} index={index} item={item} onUpdate={handleUpdateItem} onDelete={handleDeleteItem} onSelect={handleSelectItem} onContextMenu={handleContextMenu} />),
        tasks: (
            <>
                {openTasks.map((item, index) => (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={() => { dragTask.current = item; setDraggingTask(true); }}
                        onDragEnter={() => { dragOverTask.current = item; }}
                        onDragEnd={handleTaskDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className={`transition-opacity duration-300 ${draggingTask && dragTask.current?.id === item.id ? 'dragging-item' : ''} cursor-grab`}
                    >
                        <TaskItem 
                            item={item} 
                            onUpdate={handleUpdateItem} 
                            onDelete={handleDeleteItem} 
                            onSelect={handleSelectItem} 
                            onContextMenu={handleContextMenu}
                            onStartFocus={handleStartFocus}
                            index={index} 
                        />
                    </div>
                ))}
            </>
        ),
    };

    const componentMeta: Record<HomeScreenComponentId, { title: string; count: number; isCollapsible: boolean; isNonEssential?: boolean }> = {
        gratitude: { title: settings.sectionLabels.gratitude, count: 1, isCollapsible: true, isNonEssential: true },
        habits: { title: "הרגלים", count: todaysHabits.length, isCollapsible: true },
        tasks: { title: "משימות להיום", count: openTasks.length, isCollapsible: true },
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
            
            <QuickAddTask onItemAdded={(message) => showStatus('success', message)} />

            {isLoading ? <SkeletonLoader count={5} /> : (
                <>
                    {layout.map((component, index) => {
                        if (!component.isVisible) return null;
                        const meta = componentMeta[component.id];
                        return (
                            <div
                                key={component.id}
                                className={`transition-all duration-300 ${dragging && dragItem.current === index ? 'dragging-item' : ''}`}
                            >
                                <div className="flex items-start gap-2">
                                    <button 
                                        draggable
                                        onDragStart={() => { dragItem.current = index; setDragging(true); }}
                                        onDragEnter={() => dragOverItem.current = index}
                                        onDragEnd={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        className="pt-2 cursor-grab text-[var(--text-secondary)]/50 hover:text-white"
                                        aria-label={`גרור כדי לסדר מחדש את אזור ${meta.title}`}
                                    >
                                        <DragHandleIcon className="w-5 h-5"/>
                                    </button>
                                    <div className="flex-1">
                                        <Section
                                            componentId={component.id}
                                            title={meta.title}
                                            count={meta.count}
                                            isCollapsible={meta.isCollapsible}
                                            isExpanded={!collapsedSections.includes(component.id)}
                                            onToggle={() => handleToggleCollapse(component.id)}
                                            className={meta.isNonEssential ? 'non-essential-section' : ''}
                                        >
                                            {componentsMap[component.id]}
                                        </Section>
                                        
                                        {component.id === 'tasks' && openTasks.length === 0 && !collapsedSections.includes('tasks') && <p className="text-center text-sm text-[var(--text-secondary)] py-4">אין משימות להיום. כל הכבוד!</p>}
                                        
                                        {component.id === 'tasks' && overdueTasksCount > 0 && !collapsedSections.includes('tasks') && (
                                            <button onClick={handleRollOverTasks} className="mt-4 text-sm w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-[var(--accent-highlight)] font-semibold py-2 px-4 rounded-xl transition-colors">
                                                <CheckSquareIcon className="w-5 h-5"/>
                                                גלגל {overdueTasksCount} משימות שעבר זמנן
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                     {/* Completed Tasks Section */}
                    <Section
                        componentId="completed"
                        title="הושלמו היום"
                        count={completedTodayTasks.length}
                        isCollapsible={true}
                        isExpanded={!collapsedSections.includes('completed')}
                        onToggle={() => handleToggleCollapse('completed')}
                        className="pl-8"
                    >
                        {completedTodayTasks.map((item, index) => (
                             <TaskItem 
                                key={item.id}
                                item={item} 
                                onUpdate={handleUpdateItem} 
                                onDelete={handleDeleteItem} 
                                onSelect={handleSelectItem} 
                                onContextMenu={handleContextMenu}
                                onStartFocus={handleStartFocus}
                                index={index} 
                            />
                        ))}
                    </Section>
                </>
            )}
            {selectedItem && <PersonalItemDetailModal item={selectedItem} onClose={handleCloseModal} onUpdate={handleUpdateItem} onDelete={handleDeleteWithConfirmation} />}
            {contextMenu.isOpen && contextMenu.item && <PersonalItemContextMenu x={contextMenu.x} y={contextMenu.y} item={contextMenu.item} onClose={closeContextMenu} onUpdate={handleUpdateItem} onDelete={handleDeleteItem} onDuplicate={handleDuplicateItem} onStartFocus={handleStartFocus} />}
            {(isBriefingLoading || briefingContent) && <DailyBriefingModal isLoading={isBriefingLoading} briefingContent={briefingContent} onClose={() => setBriefingContent('')} />}
            {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
        </div>
    );
};

export default HomeScreen;