import React, { useMemo, useContext, useState, useCallback } from 'react';
import type { PersonalItem } from '../types';
import { AppContext } from '../state/AppContext';
import PersonalItemCard from '../components/PersonalItemCard';
import { TargetIcon, ChevronLeftIcon, LayoutDashboardIcon, ListIcon, StopwatchIcon } from '../components/icons';
import KanbanView from '../components/KanbanView';
import { removePersonalItem, updatePersonalItem, duplicatePersonalItem, reAddPersonalItem } from '../services/dataService';
import { useContextMenu } from '../hooks/useContextMenu';
import { useItemReordering } from '../hooks/useItemReordering';
import PersonalItemDetailModal from '../components/PersonalItemDetailModal';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';
import { useModal } from '../state/ModalContext';


interface ProjectDetailScreenProps {
    project: PersonalItem;
    onBack: () => void;
    onSelectItem: (item: PersonalItem, event?: React.MouseEvent | React.KeyboardEvent) => void;
}

const ProjectDetailScreen: React.FC<ProjectDetailScreenProps> = ({ project, onBack }) => {
    const { state, dispatch } = useContext(AppContext);
    const { personalItems } = state;
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu<PersonalItem>();
    const { openModal } = useModal();
    const [view, setView] = useState<'list' | 'board'>('list');
    
    const [selectedItem, setSelectedItem] = useState<PersonalItem | null>(null);
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number, onUndo?: () => void} | null>(null);

    const showStatus = useCallback((type: StatusMessageType, text: string, onUndo?: () => void) => {
        setStatusMessage({ type, text, id: Date.now(), onUndo });
    }, []);

    const handleUpdateItem = useCallback(async (id: string, updates: Partial<PersonalItem>) => {
        const originalItem = personalItems.find(item => item.id === id);
        if (!originalItem) return;
        dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id, updates } });
        if (selectedItem?.id === id) {
            setSelectedItem(prev => (prev ? { ...prev, ...updates } : null));
        }
        try {
            await updatePersonalItem(id, updates);
        } catch (error) {
            console.error("Failed to update item:", error);
            dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id, updates: originalItem } });
        }
    }, [dispatch, personalItems, selectedItem]);
    
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
            setSelectedItem(null); // Close modal
        }
    }, [personalItems, handleDeleteItem]);
    
    const handleSelectItem = useCallback((item: PersonalItem, event?: React.MouseEvent | React.KeyboardEvent) => {
        event?.stopPropagation();
        if (item.type === 'roadmap') {
            openModal('roadmapScreen', { 
                item,
                onUpdate: handleUpdateItem,
                onDelete: handleDeleteItem,
             });
            return;
        }
        setSelectedItem(item);
    }, [openModal, handleUpdateItem, handleDeleteItem]);
    
    const handleCloseModal = useCallback((nextItem?: PersonalItem) => {
        setSelectedItem(nextItem || null);
    }, []);


    const childItems = useMemo(() => {
        return personalItems
            .filter(item => item.projectId === project.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [personalItems, project.id]);
    
    const { draggingItem, handleDragStart, handleDragEnter, handleDragEnd, handleDrop } = useItemReordering(childItems, handleUpdateItem);

    const { completedTasks, totalTasks, totalFocusMinutes } = useMemo(() => {
        const tasks = childItems.filter(i => (i.type === 'task' || i.type === 'roadmap'));
        const completed = tasks.filter(i => i.isCompleted).length;
        
        const focusMinutes = childItems.reduce((total, item) => {
            return total + (item.focusSessions || []).reduce((itemTotal, session) => itemTotal + session.duration, 0);
        }, 0);

        return { completedTasks: completed, totalTasks: tasks.length, totalFocusMinutes: focusMinutes };
    }, [childItems]);
    
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;


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
                             {totalFocusMinutes > 0 && (
                                <span className="flex items-center gap-1"><StopwatchIcon className="w-3 h-3"/> {Math.floor(totalFocusMinutes/60)}ש {totalFocusMinutes % 60}ד בפוקוס</span>
                            )}
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
                     <div className="space-y-3 px-4" onDrop={handleDrop}>
                        {childItems.map((item, index) => (
                             <PersonalItemCard
                                key={item.id}
                                item={item}
                                index={index}
                                onSelect={(item, e) => handleSelectItem(item, e)}
                                onUpdate={handleUpdateItem}
                                onDelete={handleDeleteItem}
                                onContextMenu={() => {}}
                                onLongPress={(_item: PersonalItem) => {}}
                                isInSelectionMode={false}
                                isSelected={false}
                                onDragStart={(e, item) => handleDragStart(e, item)}
                                onDragEnter={(e, item) => handleDragEnter(e, item)}
                                onDragEnd={handleDragEnd}
                                isDragging={draggingItem?.id === item.id}
                             />
                        ))}
                     </div>
                ) : (
                    <KanbanView items={childItems} onUpdate={handleUpdateItem} onSelectItem={(item, e) => handleSelectItem(item, e)} onQuickAdd={() => {}} onDelete={handleDeleteItem} />
                )}

                {childItems.length === 0 && (
                    <div className="text-center text-[var(--text-secondary)] mt-16 flex flex-col items-center">
                        <p>אין פריטים המשויכים לפרויקט זה עדיין.</p>
                    </div>
                )}
            </div>
             {selectedItem && (
                <PersonalItemDetailModal
                    item={selectedItem}
                    onClose={handleCloseModal}
                    onUpdate={handleUpdateItem}
                    onDelete={handleDeleteWithConfirmation}
                    contextItems={childItems}
                />
            )}
            {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
        </div>
    )
};

export default ProjectDetailScreen;