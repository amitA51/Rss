import React, { useState, useMemo, DragEvent, useRef } from 'react';
import type { PersonalItem, PersonalItemType, AddableType } from '../types';
import PersonalItemCard from './PersonalItemCard';
import { AddIcon } from './icons';

type Status = 'todo' | 'doing' | 'done';

const columns: Record<Status, { title: string; color: string }> = {
  todo: { title: 'לביצוע', color: 'var(--text-secondary)' },
  doing: { title: 'בעבודה', color: 'var(--dynamic-accent-start)' },
  done: { title: 'הושלם', color: 'var(--success)' },
};
const columnOrder: Status[] = ['todo', 'doing', 'done'];

interface KanbanViewProps {
  items: PersonalItem[];
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  onSelectItem: (item: PersonalItem, event: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onQuickAdd: (config: { type: AddableType; defaultStatus: Status }) => void;
}

const getItemStatus = (item: PersonalItem): Status => {
  if (item.type === 'task' && item.isCompleted) return 'done';
  if (item.status === 'done') return 'done';
  if (item.status === 'doing') return 'doing';
  return 'todo';
};

const KanbanView: React.FC<KanbanViewProps> = ({ items, onUpdate, onSelectItem, onQuickAdd, onDelete }) => {
  const [draggedItem, setDraggedItem] = useState<PersonalItem | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);
  const dragOverItem = useRef<PersonalItem | null>(null);

  const itemsByStatus = useMemo(() => {
    const grouped: Record<Status, PersonalItem[]> = { todo: [], doing: [], done: [] };
    items.forEach(item => {
      const status = getItemStatus(item);
      grouped[status].push(item);
    });
    // Sort items within each column by creation date
    Object.keys(grouped).forEach(status => {
        grouped[status as Status].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
    return grouped;
  }, [items]);

  const handleDragStart = (e: DragEvent, item: PersonalItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, status: Status) => {
    e.preventDefault();
    if (draggedItem && getItemStatus(draggedItem) !== status) {
        setDragOverColumn(status);
    }
  };
  
  const handleDragLeave = () => {
      setDragOverColumn(null);
  };

  const handleDrop = (e: DragEvent, targetStatus: Status) => {
    e.preventDefault();
    if (!draggedItem) return;

    const sourceStatus = getItemStatus(draggedItem);

    if (sourceStatus !== targetStatus) {
        // --- Inter-column drop (change status) ---
        const updates: Partial<PersonalItem> = { status: targetStatus };
        if (['task', 'roadmap'].includes(draggedItem.type)) {
            updates.isCompleted = targetStatus === 'done';
        }
        onUpdate(draggedItem.id, updates);
    } else if (dragOverItem.current && draggedItem.id !== dragOverItem.current.id) {
        // --- Intra-column drop (reorder) ---
        const columnItems = itemsByStatus[targetStatus];
        const dragItemIndex = columnItems.findIndex(i => i.id === draggedItem.id);
        const dragOverItemIndex = columnItems.findIndex(i => i.id === dragOverItem.current?.id);

        if (dragItemIndex === -1 || dragOverItemIndex === -1) return;

        let newCreatedAt: string;

        if (dragItemIndex > dragOverItemIndex) { // Moving UP
            const prevItem = columnItems[dragOverItemIndex - 1];
            const nextItem = columnItems[dragOverItemIndex];
            const nextItemTime = new Date(nextItem.createdAt).getTime();
            newCreatedAt = prevItem 
                ? new Date((new Date(prevItem.createdAt).getTime() + nextItemTime) / 2).toISOString()
                : new Date(nextItemTime + 1000).toISOString();
        } else { // Moving DOWN
            const prevItem = columnItems[dragOverItemIndex];
            const nextItem = columnItems[dragOverItemIndex + 1];
            const prevItemTime = new Date(prevItem.createdAt).getTime();
            newCreatedAt = nextItem
                ? new Date((prevItemTime + new Date(nextItem.createdAt).getTime()) / 2).toISOString()
                : new Date(prevItemTime - 1000).toISOString();
        }
        onUpdate(draggedItem.id, { createdAt: newCreatedAt });
    }

    setDraggedItem(null);
    setDragOverColumn(null);
    dragOverItem.current = null;
  };
  
  const handleQuickAdd = (status: Status) => {
      const relevantType: PersonalItemType = status === 'todo' ? 'task' : 'note';
      onQuickAdd({type: relevantType, defaultStatus: status});
  }

  return (
    <div className="flex gap-4 overflow-x-auto p-2 -mx-4">
      {columnOrder.map(status => (
        <div
          key={status}
          onDragOver={(e) => handleDragOver(e, status)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, status)}
          className={`flex-shrink-0 w-80 bg-[var(--bg-secondary)] rounded-2xl flex flex-col transition-colors ${dragOverColumn === status ? 'kanban-column-drag-over' : ''}`}
        >
          <div className="p-3 border-b border-[var(--border-primary)] flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: columns[status].color}}></div>
            <h3 className="font-semibold text-lg text-white">{columns[status].title}</h3>
            <span className="text-sm text-[var(--text-secondary)] font-mono">{itemsByStatus[status].length}</span>
          </div>
          <div className="p-3 space-y-3 overflow-y-auto flex-grow">
            {itemsByStatus[status].map((item, index) => (
              <PersonalItemCard
                key={item.id}
                item={item}
                index={index}
                onSelect={onSelectItem}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onContextMenu={() => {}} // Context menu is complex here, disable for now
                onDragStart={(e, i) => handleDragStart(e, i)}
                onDragEnter={() => dragOverItem.current = item}
                onDragEnd={() => dragOverItem.current = null}
                isDragging={draggedItem?.id === item.id}
                onLongPress={(_item: PersonalItem) => { /* Not used in Kanban view */ }}
                isInSelectionMode={false}
                isSelected={false}
              />
            ))}
             {dragOverColumn === status && <div className="dragging-placeholder"></div>}
          </div>
          {status === 'todo' && (
             <button onClick={() => handleQuickAdd('todo')} className="m-3 mt-0 p-2 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/10 rounded-lg w-[calc(100%-1.5rem)] flex items-center justify-center gap-2">
                <AddIcon className="w-5 h-5" /> הוסף פריט
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default KanbanView;