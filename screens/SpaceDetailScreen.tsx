import React, { useMemo, useContext, useState, useCallback } from 'react';
import type { PersonalItem, Space } from '../types';
import { AppContext } from '../state/AppContext';
import PersonalItemCard from '../components/PersonalItemCard';
import { ChevronLeftIcon, LayoutDashboardIcon, ListIcon, SparklesIcon } from '../components/icons';
import KanbanView from '../components/KanbanView';
import { removePersonalItem, reAddPersonalItem, updatePersonalItem } from '../services/dataService';
import { summarizeSpaceContent } from '../services/geminiService';
import { getIconForName } from '../components/IconMap';
import SpaceSummaryModal from '../components/SpaceSummaryModal';
import { useItemReordering } from '../hooks/useItemReordering';
import PersonalItemDetailModal from '../components/PersonalItemDetailModal';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';
import { useModal } from '../state/ModalContext';


interface SpaceDetailScreenProps {
    space: Space;
    onBack: () => void;
    onSelectItem: (item: PersonalItem, event?: React.MouseEvent | React.KeyboardEvent) => void;
}

const SpaceDetailScreen: React.FC<SpaceDetailScreenProps> = ({ space, onBack }) => {
    const { state, dispatch } = useContext(AppContext);
    const { personalItems } = state;
    const { openModal } = useModal();
    const [view, setView] = useState<'list' | 'board'>('list');
    
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);

    const [selectedItem, setSelectedItem] = useState<PersonalItem | null>(null);
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number, onUndo?: () => void} | null>(null);

    const showStatus = useCallback((type: StatusMessageType, text: string, onUndo?: () => void) => {
        setStatusMessage({ type, text, id: Date.now(), onUndo });
    }, []);
    
    const handleCloseModal = (nextItem?: PersonalItem) => setSelectedItem(nextItem || null);


    const spaceItems = useMemo(() => {
        return personalItems
            .filter(item => item.spaceId === space.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [personalItems, space.id]);

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


    const handleSummarize = async () => {
        if (isSummarizing) return;
        setIsSummarizing(true);
        setSummary(null);
        try {
            const result = await summarizeSpaceContent(spaceItems, space.name);
            setSummary(result);
        } catch (error) {
            console.error("Failed to summarize space", error);
            setSummary("שגיאה בעת יצירת הסיכום.");
        } finally {
            setIsSummarizing(false);
        }
    };
    
    const { draggingItem, handleDragStart, handleDragEnter, handleDragEnd, handleDrop } = useItemReordering(spaceItems, handleUpdateItem);

    const Icon = getIconForName(space.icon);

    return (
        <div className="pt-4 pb-8 space-y-6 animate-screen-enter">
            <header className="flex justify-between items-start -mx-4 px-4 sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20">
                <div className="flex items-start gap-4 flex-1 overflow-hidden">
                    <button onClick={onBack} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors shrink-0 -ml-2 mt-2">
                        <ChevronLeftIcon className="w-6 h-6"/>
                    </button>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 mt-1" style={{backgroundColor: `${space.color}20`, color: space.color}}>
                        <Icon className="w-7 h-7"/>
                    </div>
                    <div className="flex-1 pt-1">
                        <p className="text-xs font-semibold" style={{ color: space.color }}>מרחב</p>
                        <h1 className="hero-title themed-title leading-tight truncate">{space.name}</h1>
                    </div>
                </div>
            </header>

            <div className="px-4">
                <div className="flex items-center gap-2 p-1 bg-[var(--bg-secondary)] rounded-full max-w-sm mx-auto">
                    <button onClick={() => setView('list')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-sm ${view === 'list' ? 'bg-white/10 text-white' : 'text-[var(--text-secondary)]'}`}><ListIcon className="w-5 h-5"/> רשימה</button>
                    <button onClick={() => setView('board')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full text-sm ${view === 'board' ? 'bg-white/10 text-white' : 'text-[var(--text-secondary)]'}`}><LayoutDashboardIcon className="w-5 h-5"/> לוח</button>
                    <button onClick={handleSummarize} className="p-2 rounded-full text-yellow-400 hover:bg-yellow-400/10"><SparklesIcon className="w-5 h-5"/></button>
                </div>
            </div>
            
            <div className="">
                {view === 'list' ? (
                     <div className="space-y-3 px-4" onDrop={handleDrop}>
                        {spaceItems.map((item, index) => (
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
                                spaceColor={space.color}
                                onDragStart={(e, item) => handleDragStart(e, item)}
                                onDragEnter={(e, item) => handleDragEnter(e, item)}
                                onDragEnd={handleDragEnd}
                                isDragging={draggingItem?.id === item.id}
                             />
                        ))}
                     </div>
                ) : (
                    <KanbanView items={spaceItems} onUpdate={handleUpdateItem} onSelectItem={(item, e) => handleSelectItem(item, e)} onQuickAdd={() => {}} onDelete={handleDeleteItem} />
                )}

                {spaceItems.length === 0 && (
                    <div className="text-center text-[var(--text-secondary)] mt-16 flex flex-col items-center">
                        <p>המרחב הזה ריק. הוסף פריטים כדי להתחיל.</p>
                    </div>
                )}
            </div>

            {(isSummarizing || summary) && (
                <SpaceSummaryModal
                    isLoading={isSummarizing}
                    summary={summary}
                    spaceName={space.name}
                    onClose={() => setSummary(null)}
                />
            )}
            
            {selectedItem && (
                 <PersonalItemDetailModal
                    item={selectedItem}
                    onClose={handleCloseModal}
                    onUpdate={handleUpdateItem}
                    onDelete={handleDeleteWithConfirmation}
                    contextItems={spaceItems}
                />
            )}
            {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
        </div>
    )
};

export default SpaceDetailScreen;