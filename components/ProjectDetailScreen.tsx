import React, { useMemo, useContext, useState, useCallback } from 'react';
import type { PersonalItem } from '../types';
import { AppContext } from '../state/AppContext';
import PersonalItemCard from './PersonalItemCard';
import { TargetIcon, ChevronLeftIcon, LayoutDashboardIcon, ListIcon } from './icons';
import KanbanView from './KanbanView';
import { removePersonalItem, updatePersonalItem, duplicatePersonalItem, reAddPersonalItem } from '../services/dataService';
import { useContextMenu } from '../hooks/useContextMenu';

interface ProjectDetailScreenProps {
    project: PersonalItem;
    onBack: () => void;
    onSelectItem: (item: PersonalItem, event?: React.MouseEvent | React.KeyboardEvent) => void;
}

const ProjectDetailScreen: React.FC<ProjectDetailScreenProps> = ({ project, onBack, onSelectItem }) => {
    const { state, dispatch } = useContext(AppContext);
    const { personalItems } = state;
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu<PersonalItem>();
    const [view, setView] = useState<'list' | 'board'>('list');

    const childItems = useMemo(() => {
        return personalItems.filter(item => item.projectId === project.id);
    }, [personalItems, project.id]);

    const completedTasks = useMemo(() => {
        return childItems.filter(i => (i.type === 'task' || i.type === 'roadmap') && i.isCompleted).length;
    }, [childItems]);

    const totalTasks = useMemo(() => {
        return childItems.filter(i => (i.type === 'task' || i.type === 'roadmap')).length;
    }, [childItems]);
    
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const handleUpdateItem = useCallback(async (id: string, updates: Partial<PersonalItem>) => {
        const originalItem = personalItems.find(item => item.id === id);
        if (!originalItem) return;
        dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id, updates } });
        try {
            await updatePersonalItem(id, updates);
        } catch (error) {
            console.error("Failed to update item:", error);
            dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id, updates: originalItem } });
        }
    }, [dispatch, personalItems]);
    
    const handleDeleteItem = useCallback(async (id: string) => {
        const itemToDelete = personalItems.find(item => item.id === id);
        if (!itemToDelete) return;
        await removePersonalItem(id);
        dispatch({ type: 'REMOVE_PERSONAL_ITEM', payload: id });
    }, [dispatch, personalItems]);


    return (
        <div className="pt-4 pb-8 space-y-6 animate-screen-enter">
            <header className="flex justify-between items-start -mx-4 px-4 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20">
                <div className="flex items-start gap-4 flex-1 overflow-hidden">
                    <button onClick={onBack} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors shrink-0 -ml-2 mt-2">
                        <ChevronLeftIcon className="w-6 h-6"/>
                    </button>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400 shrink-0 mt-1">
                        <TargetIcon className="w-7 h-7"/>
                    </div>
                    <div className="flex-1 pt-1">
                        <p className="text-xs text-blue-400 font-semibold">פרויקט</p>
                        <h1 className="hero-title themed-title leading-tight truncate">{project.title}</h1>
                    </div>
                </div>
            </header>

            <div className="px-4">
                 <div className="themed-card p-4">
                    <p className="text-sm text-[var(--text-secondary)] mb-2">{project.content}</p>
                     <div>
                        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                            <span>התקדמות</span>
                            <span>{completedTasks}/{totalTasks} הושלמו</span>
                        </div>
                        <div className="w-full bg-[var(--bg-card)] rounded-full h-1.5 border border-[var(--border-primary)]">
                            <div className="bg-[var(--accent-gradient)] h-1 rounded-full" style={{width: `${progress}%`}}></div>
                        </div>
                    </div>
                 </div>
            </div>
            
             <div className="px-4">
                <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-full max-w-xs mx-auto">
                    <button onClick={() => setView('list')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-sm ${view === 'list' ? 'bg-white/10 text-white' : 'text-[var(--text-secondary)]'}`}><ListIcon className="w-5 h-5"/> רשימה</button>
                    <button onClick={() => setView('board')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-sm ${view === 'board' ? 'bg-white/10 text-white' : 'text-[var(--text-secondary)]'}`}><LayoutDashboardIcon className="w-5 h-5"/> לוח</button>
                </div>
            </div>
            
            <div className="">
                {view === 'list' ? (
                     <div className="space-y-3 px-4">
                        {childItems.map((item, index) => (
                             <PersonalItemCard
                                key={item.id}
                                item={item}
                                index={index}
                                onSelect={(item, e) => onSelectItem(item, e)}
                                onUpdate={handleUpdateItem}
                                onDelete={handleDeleteItem}
                                onContextMenu={() => {}}
                                onLongPress={(_item: PersonalItem) => {}}
                                isInSelectionMode={false}
                                isSelected={false}
                             />
                        ))}
                     </div>
                ) : (
                    <KanbanView items={childItems} onUpdate={handleUpdateItem} onSelectItem={(item, e) => onSelectItem(item, e)} onQuickAdd={() => {}} onDelete={handleDeleteItem} />
                )}

                {childItems.length === 0 && (
                    <div className="text-center text-[var(--text-secondary)] mt-16 flex flex-col items-center">
                        <p>אין פריטים המשויכים לפרויקט זה עדיין.</p>
                    </div>
                )}
            </div>
        </div>
    )
};

export default ProjectDetailScreen;