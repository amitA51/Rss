import { useState, useRef, DragEvent, useCallback } from 'react';
import type { PersonalItem } from '../types';

/**
 * A custom hook to manage drag-and-drop reordering of a list of PersonalItems.
 * It works by updating either the `createdAt` or `order` property to define the new order.
 * @param items The array of items to be reordered, assumed to be ALREADY SORTED.
 * @param onUpdate The callback function to persist the item update.
 * @param orderByKey The property to update for reordering.
 * @returns An object with state and handlers for drag-and-drop functionality.
 */
export const useItemReordering = (
    items: PersonalItem[],
    onUpdate: (id: string, updates: Partial<PersonalItem>) => void,
    orderByKey: 'createdAt' | 'order' = 'createdAt'
) => {
    const dragItem = useRef<PersonalItem | null>(null);
    const dragOverItem = useRef<PersonalItem | null>(null);
    const [draggingItem, setDraggingItem] = useState<PersonalItem | null>(null);

    const handleDragStart = useCallback((e: DragEvent, item: PersonalItem) => {
        dragItem.current = item;
        setDraggingItem(item);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragEnter = useCallback((_e: DragEvent, item: PersonalItem) => {
        dragOverItem.current = item;
    }, []);

    const handleDragEnd = useCallback(() => {
        dragItem.current = null;
        dragOverItem.current = null;
        setDraggingItem(null);
    }, []);

    const handleDrop = useCallback(() => {
        if (!dragItem.current || !dragOverItem.current || dragItem.current.id === dragOverItem.current.id) {
            handleDragEnd();
            return;
        }

        const dragItemIndex = items.findIndex(i => i.id === dragItem.current!.id);
        const dragOverItemIndex = items.findIndex(i => i.id === dragOverItem.current!.id);

        if (dragItemIndex === -1 || dragOverItemIndex === -1) {
            handleDragEnd();
            return;
        };

        const getSortValue = (item: PersonalItem) => {
            if (orderByKey === 'order') {
                return item.order || new Date(item.createdAt).getTime(); // Fallback for old items
            }
            return new Date(item.createdAt).getTime();
        };

        const sortDirection = orderByKey === 'order' ? 'ASC' : 'DESC';
        
        let newOrderValue: number;

        // Moving an item UP in the array (to a smaller index)
        if (dragItemIndex > dragOverItemIndex) {
            const prevItem = items[dragOverItemIndex - 1];
            const nextItem = items[dragOverItemIndex];
            const nextValue = getSortValue(nextItem);
            if (prevItem) {
                const prevValue = getSortValue(prevItem);
                newOrderValue = (prevValue + nextValue) / 2;
            } else { // Dropped at the top
                newOrderValue = sortDirection === 'ASC' ? nextValue - 1000 : nextValue + 1000;
            }
        } else { // Moving an item DOWN in the array (to a larger index)
            const prevItem = items[dragOverItemIndex];
            const nextItem = items[dragOverItemIndex + 1];
            const prevValue = getSortValue(prevItem);
            if (nextItem) {
                const nextValue = getSortValue(nextItem);
                newOrderValue = (prevValue + nextValue) / 2;
            } else { // Dropped at the bottom
                newOrderValue = sortDirection === 'ASC' ? prevValue + 1000 : prevValue - 1000;
            }
        }

        const updatePayload: Partial<PersonalItem> = {};
        if (orderByKey === 'order') {
            updatePayload.order = newOrderValue;
        } else {
            updatePayload.createdAt = new Date(newOrderValue).toISOString();
        }

        onUpdate(dragItem.current.id, updatePayload);
        handleDragEnd();
    }, [items, onUpdate, handleDragEnd, orderByKey]);

    return {
        draggingItem,
        handleDragStart,
        handleDragEnter,
        handleDragEnd,
        handleDrop
    };
};