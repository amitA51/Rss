import React, { useState, useEffect, useCallback } from 'react';
import type { PersonalItem, Exercise, WorkoutSet, Tag } from '../types';
import { CloseIcon, DumbbellIcon, ClipboardListIcon, SummarizeIcon, TrashIcon, AddIcon, LinkIcon } from './icons';
import { getUrlMetadata, getTags } from '../services/geminiService';

interface AddPersonalItemModalProps {
  onClose: () => void;
  onAdd: (item: Omit<PersonalItem, 'id' | 'createdAt'>) => void;
}

type ItemType = 'workout' | 'note' | 'learning' | 'link';

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const AddPersonalItemModal: React.FC<AddPersonalItemModalProps> = ({ onClose, onAdd }) => {
  const [itemType, setItemType] = useState<ItemType>('workout');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // Workout state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [duration, setDuration] = useState<number | ''>('');

  // Learning state
  const [status, setStatus] = useState<'to-learn' | 'learning' | 'learned'>('to-learn');
  const [source, setSource] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>(['']);

  // Link state
  const [url, setUrl] = useState('');
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [fetchedMetadata, setFetchedMetadata] = useState<Partial<PersonalItem> | null>(null);
  const debouncedUrl = useDebounce(url, 1000);

  useEffect(() => {
      const fetchTags = async () => {
          const tags = await getTags();
          setAvailableTags(tags);
      };
      fetchTags();
  }, []);

  const handleFetchMetadata = useCallback(async (urlToFetch: string) => {
    try {
      new URL(urlToFetch); // basic validation
      setIsFetchingMetadata(true);
      setFetchedMetadata(null);
      const metadata = await getUrlMetadata(urlToFetch, availableTags);
      setFetchedMetadata(metadata);
      setTitle(metadata.title || '');
      setContent(metadata.content || '');
    } catch (error) {
      console.error("Failed to fetch URL metadata:", error);
      // Handle error in UI if needed, e.g. show a toast
    } finally {
      setIsFetchingMetadata(false);
    }
  }, [availableTags]);

  useEffect(() => {
    if (debouncedUrl && itemType === 'link') {
      handleFetchMetadata(debouncedUrl);
    }
  }, [debouncedUrl, itemType, handleFetchMetadata]);

  const handleAddExercise = () => {
    setExercises([...exercises, { id: `ex-${Date.now()}`, name: '', sets: [{ reps: 8, weight: 0 }] }]);
  };

  const handleExerciseChange = (exIndex: number, field: 'name', value: string) => {
    const newExercises = [...exercises];
    newExercises[exIndex][field] = value;
    setExercises(newExercises);
  };
  
  const handleAddSet = (exIndex: number) => {
      const newExercises = [...exercises];
      const lastSet = newExercises[exIndex].sets[newExercises[exIndex].sets.length - 1] || { reps: 8, weight: 0 };
      newExercises[exIndex].sets.push({...lastSet});
      setExercises(newExercises);
  };

  const handleSetChange = (exIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    const newExercises = [...exercises];
    newExercises[exIndex].sets[setIndex][field] = parseInt(value, 10) || 0;
    setExercises(newExercises);
  };
  
  const handleRemoveExercise = (exIndex: number) => {
      setExercises(exercises.filter((_, i) => i !== exIndex));
  };
  
  const handleRemoveSet = (exIndex: number, setIndex: number) => {
      const newExercises = [...exercises];
      newExercises[exIndex].sets = newExercises[exIndex].sets.filter((_, i) => i !== setIndex);
      setExercises(newExercises);
  };

  const handleTakeawayChange = (index: number, value: string) => {
      const newTakeaways = [...keyTakeaways];
      newTakeaways[index] = value;
      setKeyTakeaways(newTakeaways);
      if (index === keyTakeaways.length - 1 && value) {
          setKeyTakeaways([...newTakeaways, '']);
      }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title && itemType !== 'link') return;
    if (itemType === 'link' && !url) return;


    const newItem: Omit<PersonalItem, 'id' | 'createdAt'> = {
      type: itemType,
      title,
      content,
      metadata: {},
    };

    if (itemType === 'workout') {
      newItem.exercises = exercises.filter(ex => ex.name);
      if (duration) newItem.metadata!.duration = Number(duration);
    }
    if (itemType === 'learning') {
      newItem.metadata!.status = status;
      newItem.metadata!.source = source;
      newItem.metadata!.key_takeaways = keyTakeaways.filter(t => t);
    }
    if (itemType === 'link') {
      newItem.url = url;
      newItem.domain = fetchedMetadata?.domain;
      newItem.imageUrl = fetchedMetadata?.imageUrl;
    }

    onAdd(newItem);
  };
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 400);
  };
  
  const TypeButton: React.FC<{ type: ItemType; label: string; icon: React.ReactNode; }> = ({ type, label, icon }) => (
    <button
        type="button"
        onClick={() => setItemType(type)}
        className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all transform hover:scale-105 active:scale-100 ${itemType === type ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-gray-700 hover:bg-gray-600'}`}
    >
        {icon}
        <span className="text-xs font-semibold">{label}</span>
    </button>
  );

  const inputStyles = "w-full bg-gray-800/80 border border-[var(--border-color)] text-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={handleClose}>
      <div 
        className={`bg-gray-900/80 backdrop-blur-xl w-full max-w-2xl max-h-[90vh] rounded-t-2xl shadow-lg flex flex-col border-t border-blue-500/30 ${isClosing ? 'animate-slide-down-out' : 'animate-slide-up'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        `}</style>

        <header className="p-4 border-b border-[var(--border-color)] flex justify-between items-center sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
          <h2 className="text-xl font-bold text-gray-100">הוסף פריט אישי</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-grow flex flex-col overflow-hidden">
            <div className="p-6 overflow-y-auto space-y-5">
                <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">סוג הפריט</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <TypeButton type="workout" label="אימון" icon={<DumbbellIcon className="h-5 w-5"/>} />
                        <TypeButton type="learning" label="למידה" icon={<SummarizeIcon className="h-5 w-5"/>} />
                        <TypeButton type="link" label="קישור" icon={<LinkIcon className="h-5 w-5"/>} />
                        <TypeButton type="note" label="פתק" icon={<ClipboardListIcon className="h-5 w-5"/>} />
                    </div>
                </div>

                {itemType === 'link' ? (
                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-400 mb-1">הדבק קישור</label>
                        <div className="relative">
                            <input type="url" id="url" value={url} onChange={(e) => setUrl(e.target.value)} className={`${inputStyles} pl-10`} required placeholder="https://..."/>
                            {isFetchingMetadata && (
                                <div className="absolute top-1/2 left-3 transform -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">{itemType === 'workout' ? 'סוג אימון' : itemType === 'learning' ? 'נושא' : 'כותרת'}</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputStyles} required />
                </div>
                
                {itemType === 'workout' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-400 mb-1">משך (דקות)</label>
                            <input type="number" id="duration" value={duration} onChange={(e) => setDuration(e.target.value === '' ? '' : parseInt(e.target.value))} className={inputStyles} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">תרגילים</h3>
                        <div className="space-y-4">
                            {exercises.map((ex, exIndex) => (
                                <div key={ex.id} className="bg-gray-800/50 p-3 rounded-lg border border-[var(--border-color)]">
                                    <div className="flex gap-2 mb-2">
                                        <input type="text" placeholder="שם תרגיל" value={ex.name} onChange={(e) => handleExerciseChange(exIndex, 'name', e.target.value)} className={`${inputStyles} p-2 text-base`} />
                                        <button type="button" onClick={() => handleRemoveExercise(exIndex)} className="text-red-400 hover:text-red-300 p-2"><TrashIcon className="h-5 w-5"/></button>
                                    </div>
                                    <div className="space-y-2">
                                        {ex.sets.map((set, setIndex) => (
                                            <div key={setIndex} className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-400 w-6 text-center">{setIndex + 1}</span>
                                                <input type="number" placeholder="חזרות" value={set.reps} onChange={e => handleSetChange(exIndex, setIndex, 'reps', e.target.value)} className={`${inputStyles} p-2 text-center`}/>
                                                <span className="text-gray-400">חזרות</span>
                                                <input type="number" placeholder="משקל" value={set.weight} onChange={e => handleSetChange(exIndex, setIndex, 'weight', e.target.value)} className={`${inputStyles} p-2 text-center`}/>
                                                <span className="text-gray-400">ק"ג</span>
                                                <button type="button" onClick={() => handleRemoveSet(exIndex, setIndex)} className="text-gray-500 hover:text-red-400"><CloseIcon className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => handleAddSet(exIndex)} className="text-blue-400 text-sm mt-2 flex items-center gap-1 hover:text-blue-300">
                                        <AddIcon className="h-4 w-4"/> הוסף סט
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddExercise} className="mt-4 w-full text-center bg-gray-700/80 hover:bg-gray-600/80 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                           <DumbbellIcon className="h-5 w-5"/> הוסף תרגיל
                        </button>
                    </div>
                  </>
                )}
                
                {itemType === 'learning' && (
                    <>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-400 mb-1">סטטוס</label>
                        <select id="status" value={status} onChange={(e) => setStatus(e.target.value as any)} className={inputStyles}>
                            <option value="to-learn">רוצה ללמוד</option>
                            <option value="learning">לומד</option>
                            <option value="learned">נלמד</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="source" className="block text-sm font-medium text-gray-400 mb-1">מקור (קישור, ספר...)</label>
                        <input type="text" id="source" value={source} onChange={(e) => setSource(e.target.value)} className={inputStyles} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">תובנות מרכזיות</label>
                        {keyTakeaways.map((takeaway, index) => (
                           <input
                            key={index}
                            type="text"
                            value={takeaway}
                            onChange={(e) => handleTakeawayChange(index, e.target.value)}
                            placeholder={index === keyTakeaways.length - 1 ? "הוסף תובנה..." : ""}
                            className={`${inputStyles} mb-2`}
                            />
                        ))}
                    </div>
                    </>
                )}
                
                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">{itemType === 'learning' ? 'סיכום אישי' : itemType === 'workout' ? 'הערות' : itemType === 'link' ? 'סיכום / הערות' : 'תוכן'}</label>
                    <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={itemType === 'note' ? 8 : 3} className={inputStyles} placeholder={itemType==='note' ? "כתוב פתק... השתמש ב: [ ] למשימה" : ""}/>
                </div>
            </div>

            <footer className="p-4 border-t border-[var(--border-color)] mt-auto bg-gray-900/80 backdrop-blur-sm">
                <button
                    type="submit"
                    disabled={(itemType === 'link' ? !url : !title) || isFetchingMetadata}
                    className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-100 shadow-lg shadow-blue-900/30"
                >
                    {isFetchingMetadata ? 'מנתח קישור...' : 'הוסף פריט'}
                </button>
            </footer>
        </form>
      </div>
    </div>
  );
};

export default AddPersonalItemModal;