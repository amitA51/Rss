import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { PersonalItem } from '../types';
import { getPersonalItems, updatePersonalItem, removePersonalItem } from '../services/geminiService';
import TaskItem from '../components/TaskItem';
import HabitItem from '../components/HabitItem';
import PersonalItemCard from '../components/PersonalItemCard';
import PersonalItemDetailModal from '../components/PersonalItemDetailModal';
import { FileIcon } from '../components/icons';

type FilterType = 'all' | PersonalItem['type'];

const FilterButton: React.FC<{
  label: string;
  filterType: FilterType;
  currentFilter: FilterType;
  setFilter: (filter: FilterType) => void;
}> = ({ label, filterType, currentFilter, setFilter }) => (
  <button
      onClick={() => setFilter(filterType)}
      className={`px-4 py-2 text-sm rounded-full transition-all shrink-0 transform hover:scale-105 active:scale-95 font-semibold ${
          currentFilter === filterType 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
  >
      {label}
  </button>
);

const renderItem = (item: PersonalItem, onUpdate: any, onDelete: any, onSelect: any) => {
    switch (item.type) {
        case 'task':
            return <TaskItem key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} onSelect={onSelect} />;
        case 'habit':
            return <HabitItem key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} onSelect={onSelect} />;
        default:
            return <PersonalItemCard key={item.id} item={item} onDelete={onDelete} onSelect={onSelect} />;
    }
}

const HomeScreen: React.FC = () => {
    const [personalItems, setPersonalItems] = useState<PersonalItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedItem, setSelectedItem] = useState<PersonalItem | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const pItems = await getPersonalItems();
            setPersonalItems(pItems);
        } catch (error) {
            console.error("Error fetching personal items:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleUpdatePersonalItem = async (id: string, updates: Partial<PersonalItem>) => {
        const originalItems = [...personalItems];
        const updatedItem = { ...personalItems.find(item => item.id === id)!, ...updates };
        setPersonalItems(prev => prev.map(item => item.id === id ? updatedItem : item));
        if (selectedItem?.id === id) {
            setSelectedItem(updatedItem);
        }
        try {
            await updatePersonalItem(id, updates);
        } catch (error) {
            console.error("Failed to update item:", error);
            setPersonalItems(originalItems);
        }
    };

    const handleDeletePersonalItem = async (id: string) => {
        if (!window.confirm("האם למחוק את הפריט?")) return;
        
        const originalItems = [...personalItems];
        setPersonalItems(prev => prev.filter(item => item.id !== id));
        try {
            await removePersonalItem(id);
        } catch (error) {
            alert("שגיאה במחיקת הפריט.");
            setPersonalItems(originalItems);
        }
    };

    const filteredItems = useMemo(() => {
        if (filter === 'all') return personalItems;
        return personalItems.filter(item => item.type === filter);
    }, [personalItems, filter]);

    if (isLoading) {
        return <div className="text-center text-gray-400 pt-16">טוען...</div>;
    }

    return (
        <div className="pt-4 pb-8 space-y-6">
            <h1 className="text-3xl font-bold text-gray-100">אישי</h1>
            
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" style={{'scrollbarWidth': 'none'}}>
                <FilterButton label="הכל" filterType="all" currentFilter={filter} setFilter={setFilter} />
                <FilterButton label="משימות" filterType="task" currentFilter={filter} setFilter={setFilter} />
                <FilterButton label="הרגלים" filterType="habit" currentFilter={filter} setFilter={setFilter} />
                <FilterButton label="ספרים" filterType="book" currentFilter={filter} setFilter={setFilter} />
                <FilterButton label="פתקים" filterType="note" currentFilter={filter} setFilter={setFilter} />
                <FilterButton label="קישורים" filterType="link" currentFilter={filter} setFilter={setFilter} />
                <FilterButton label="למידה" filterType="learning" currentFilter={filter} setFilter={setFilter} />
            </div>

            {filteredItems.length > 0 ? (
                <div className="space-y-4">
                    {filteredItems.map(item => renderItem(item, handleUpdatePersonalItem, handleDeletePersonalItem, setSelectedItem))}
                </div>
            ) : (
                <div className="text-center text-gray-500 mt-16 flex flex-col items-center">
                    <FileIcon className="w-16 h-16 text-gray-700 mb-4"/>
                    <p className="max-w-xs">
                        {personalItems.length > 0 ? "אין פריטים התואמים לסינון זה." : "אין פריטים אישיים. הוסף פריט חדש!"}
                    </p>
                </div>
            )}
            
            <PersonalItemDetailModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onUpdate={handleUpdatePersonalItem}
            />
        </div>
    );
};

export default HomeScreen;