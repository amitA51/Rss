import React, { useMemo } from 'react';
import type { PersonalItem } from '../types';
import PersonalItemCard from './PersonalItemCard';

interface TimelineViewProps {
    items: PersonalItem[];
    onSelectItem: (item: PersonalItem, event: React.MouseEvent | React.KeyboardEvent) => void;
}

const formatDateGroup = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'היום';
    if (date.toDateString() === yesterday.toDateString()) return 'אתמול';
    
    return date.toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const TimelineView: React.FC<TimelineViewProps> = ({ items, onSelectItem }) => {

    const groupedItems = useMemo(() => {
        const groups = new Map<string, PersonalItem[]>();
        
        // Sort items once by date descending
        const sortedItems = [...items].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        sortedItems.forEach(item => {
            const dateKey = new Date(item.createdAt).toDateString();
            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(item);
        });

        return Array.from(groups.entries());
    }, [items]);

    return (
        <div className="px-4 space-y-8 animate-screen-enter">
            {groupedItems.map(([dateKey, itemsInGroup]) => (
                <div key={dateKey} className="relative">
                    <div className="sticky top-16 bg-[var(--bg-primary)]/80 backdrop-blur-sm z-10 py-2">
                        <h3 className="font-semibold text-[var(--accent-highlight)]">{formatDateGroup(dateKey)}</h3>
                    </div>
                    <div className="space-y-3 pt-2">
                         {itemsInGroup.map((item, index) => (
                             <PersonalItemCard
                                key={item.id}
                                item={item}
                                index={index}
                                onSelect={(item, e) => onSelectItem(item, e)}
                                onUpdate={() => {}}
                                onDelete={() => {}}
                                onContextMenu={() => {}}
                                onLongPress={(_item: PersonalItem) => {}}
                                isInSelectionMode={false}
                                isSelected={false}
                             />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TimelineView;