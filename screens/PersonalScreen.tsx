import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { PersonalItem } from '../types';
import { getPersonalItems, addPersonalItem, removePersonalItem, updatePersonalItem } from '../services/geminiService';
import { AddIcon, DumbbellIcon, SummarizeIcon, ClipboardListIcon, LinkIcon } from '../components/icons';
import PersonalItemCard from '../components/PersonalItemCard';
import AddPersonalItemModal from '../components/AddPersonalItemModal';
import PersonalItemDetailModal from '../components/PersonalItemDetailModal';

type FilterType = 'all' | 'workout' | 'learning' | 'note' | 'link';

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

const PersonalScreen: React.FC = () => {
  const [items, setItems] = useState<PersonalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailedItem, setDetailedItem] = useState<PersonalItem | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const personalItems = await getPersonalItems();
      setItems(personalItems);
    } catch (error) {
      console.error("Error fetching personal items:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAddItem = async (item: Omit<PersonalItem, 'id' | 'createdAt'>) => {
    try {
      await addPersonalItem(item);
      loadItems(); // Reload all items to see the new one
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Failed to add personal item:", error);
      alert("שגיאה בהוספת פריט.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm("האם למחוק את הפריט?")) {
      try {
        await removePersonalItem(id);
        setItems(prev => prev.filter(item => item.id !== id));
        if (detailedItem?.id === id) {
            setDetailedItem(null);
        }
      } catch (error) {
        console.error("Failed to delete personal item:", error);
        alert("שגיאה במחיקת הפריט.");
      }
    }
  };
  
  const handleUpdateItem = async (id: string, updates: Partial<PersonalItem>) => {
      try {
          const updatedItem = await updatePersonalItem(id, updates);
          setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
          if (detailedItem?.id === id) {
              setDetailedItem(updatedItem);
          }
      } catch(error) {
          console.error("Failed to update item:", error);
      }
  };

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(item => item.type === filter);
  }, [items, filter]);

  const NoItemsMessage = () => {
    let icon = <ClipboardListIcon className="w-16 h-16 text-gray-700 mb-4"/>;
    let text = "אין פריטים להצגה. לחץ על '+' כדי להוסיף פריט חדש.";
    if (filter === 'workout') {
      icon = <DumbbellIcon className="w-16 h-16 text-gray-700 mb-4"/>;
      text = "אין אימונים מתועדים. הוסף את האימון הראשון שלך!";
    } else if (filter === 'learning') {
      icon = <SummarizeIcon className="w-16 h-16 text-gray-700 mb-4"/>;
      text = "עקוב אחר מה שאתה לומד. הוסף נושא חדש!";
    } else if (filter === 'link') {
        icon = <LinkIcon className="w-16 h-16 text-gray-700 mb-4"/>;
        text = "שמור קישורים חשובים כדי לא לשכוח. הוסף את הקישור הראשון!";
    }
    return (
        <div className="text-center text-gray-500 mt-16 flex flex-col items-center">
            {icon}
            <p className="max-w-xs">{text}</p>
        </div>
    );
  };
  
  return (
    <div className="pt-4 relative min-h-screen">
      <header className="flex justify-between items-center mb-4 sticky top-0 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-md py-3 z-20 -mx-4 px-4 border-b border-[var(--border-color)]">
        <h1 className="text-3xl font-bold text-gray-100">אישי</h1>
      </header>
      
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4" style={{'scrollbarWidth': 'none'}}>
        <FilterButton label="הכל" filterType="all" currentFilter={filter} setFilter={setFilter} />
        <FilterButton label="אימונים" filterType="workout" currentFilter={filter} setFilter={setFilter} />
        <FilterButton label="למידה" filterType="learning" currentFilter={filter} setFilter={setFilter} />
        <FilterButton label="קישורים" filterType="link" currentFilter={filter} setFilter={setFilter} />
        <FilterButton label="פתקים" filterType="note" currentFilter={filter} setFilter={setFilter} />
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400">טוען...</p>
      ) : (
        <div className="space-y-3">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <PersonalItemCard key={item.id} item={item} onDelete={handleDeleteItem} onSelect={() => setDetailedItem(item)} />
            ))
          ) : (
            <NoItemsMessage />
          )}
        </div>
      )}
        
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 bg-blue-600 hover:bg-blue-500 text-white rounded-full p-4 shadow-lg shadow-blue-900/40 transform transition-all hover:scale-110 active:scale-95 z-30"
        aria-label="הוסף פריט אישי"
      >
        <AddIcon className="h-8 w-8" />
      </button>

      {isAddModalOpen && (
        <AddPersonalItemModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddItem}
        />
      )}
      
      {detailedItem && (
        <PersonalItemDetailModal
            item={detailedItem}
            onClose={() => setDetailedItem(null)}
            onUpdate={handleUpdateItem}
        />
      )}
    </div>
  );
};

export default PersonalScreen;