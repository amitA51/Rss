import React, { useState, useCallback, useContext } from 'react';
import type { PersonalItem } from '../types';
import { AppContext } from '../state/AppContext';
import { removePersonalItem, updatePersonalItem, duplicatePersonalItem, reAddPersonalItem } from '../services/dataService';
import { StatusMessageType } from '../components/StatusMessage';
import { useModal } from '../state/ModalContext';

export const useHomeInteraction = (
    showStatus: (type: StatusMessageType, text: string, onUndo?: () => void) => void
) => {
    const { state, dispatch } = useContext(AppContext);
    const { personalItems } = state;
    const [selectedItem, setSelectedItem] = useState<PersonalItem | null>(null);
    const { openModal } = useModal();

    const handleUpdateItem = useCallback(async (id: string, updates: Partial<PersonalItem>) => {
        const originalItem = personalItems.find(item => item.id === id);
        if (!originalItem) return;

        dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id, updates } });
        if (selectedItem?.id === id) {
            setSelectedItem(prev => prev ? { ...prev, ...updates } : null);
        }

        try {
            await updatePersonalItem(id, updates);
        } catch (error) {
            console.error("Failed to update item:", error);
            dispatch({ type: 'UPDATE_PERSONAL_ITEM', payload: { id, updates: originalItem } });
            if (selectedItem?.id === id) {
                setSelectedItem(originalItem);
            }
            showStatus('error', 'שגיאה בעדכון הפריט.');
        }
    }, [dispatch, selectedItem, personalItems, showStatus]);
    
    const handleDeleteItem = useCallback(async (id: string) => {
        const itemToDelete = personalItems.find(item => item.id === id);
        if (!itemToDelete) return;

        if (window.navigator.vibrate) window.navigator.vibrate(50);
        
        await removePersonalItem(id);
        dispatch({ type: 'REMOVE_PERSONAL_ITEM', payload: id });

        showStatus('success', 'הפריט נמחק.', async () => {
            await reAddPersonalItem(itemToDelete);
            dispatch({ type: 'ADD_PERSONAL_ITEM', payload: itemToDelete });
        });
    }, [dispatch, personalItems, showStatus]);

    const handleSelectItem = useCallback((item: PersonalItem, event: React.MouseEvent | React.KeyboardEvent) => {
        event.stopPropagation();
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
        showStatus('success', `סשן פוקוס התחיל עבור: ${item.title}`);
    }, [dispatch, showStatus]);

    return {
        selectedItem,
        handleSelectItem,
        handleCloseModal,
        handleUpdateItem,
        handleDeleteItem,
        handleDeleteWithConfirmation,
        handleDuplicateItem,
        handleStartFocus,
    };
};