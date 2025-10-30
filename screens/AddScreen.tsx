import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Tag, Attachment, PersonalItem, Exercise, Template } from '../types';
import type { Screen } from '../App';
import { getTags, autoTagContent, addSpark, getUrlMetadata, addPersonalItem, extractTextFromImage, addTemplate, getTemplates } from '../services/geminiService';
import { 
    AutoTagIcon, ClipboardIcon, MicrophoneIcon, UploadIcon, CloseIcon, 
    FileIcon, ImageIcon, PdfIcon, DocIcon, CheckCircleIcon, FlameIcon, 
    TargetIcon, BookOpenIcon, DumbbellIcon, LinkIcon, SummarizeIcon, 
    ClipboardListIcon, BoldIcon, ItalicIcon, ListIcon, ChecklistIcon, ScanTextIcon, DriveIcon, TemplateIcon
} from '../components/icons';

const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-purple-400" />;
    if (mimeType === 'application/pdf') return <PdfIcon className="h-5 w-5 text-red-400" />;
    if (mimeType.includes('document') || mimeType.includes('msword')) return <DocIcon className="h-5 w-5 text-blue-400" />;
    return <FileIcon className="h-5 w-5 text-gray-400" />;
};

interface AddScreenProps {
  setActiveScreen: (screen: Screen) => void;
}

const AddScreen: React.FC<AddScreenProps> = ({ setActiveScreen }) => {
  const [input, setInput] = useState('');
  const [itemType, setItemType] = useState<PersonalItem['type'] | 'spark'>('spark');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Link specific
  const [url, setUrl] = useState('');
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // Task specific
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Book specific
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');

  // Workout specific
  const [exercises, setExercises] = useState<Exercise[]>([{id: `ex-${Date.now()}`, name: '', sets: [{reps: 0, weight: 0}]}]);
  
  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const contentAreaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    getTags().then(setAvailableTags);
    getTemplates().then(setTemplates);
  }, []);

  const resetState = useCallback(() => {
      setInput('');
      setTitle('');
      setContent('');
      setSelectedTagIds(new Set());
      setDueDate('');
      setPriority('medium');
      setUrl('');
      setAuthor('');
      setTotalPages('');
      setExercises([{id: `ex-${Date.now()}`, name: '', sets: [{reps: 0, weight: 0}]}]);
  }, []);
  
  const handleSetItemType = (type: PersonalItem['type'] | 'spark') => {
    if (type !== itemType) {
        resetState();
    }
    setItemType(type);
  };

  const handleApplyTemplate = (template: Template) => {
    if (template.content.title) setTitle(template.content.title);
    if (template.content.content) setContent(template.content.content);
    if (template.content.exercises) setExercises(JSON.parse(JSON.stringify(template.content.exercises))); // Deep copy
    // Add other fields as needed
    setShowTemplates(false);
  };
  
  const handleSaveAsTemplate = async () => {
      const name = prompt("הזן שם לתבנית:");
      if (!name) return;

      let templateContent: Partial<PersonalItem> = {
          title,
          content
      };
      if (itemType === 'workout') {
          templateContent.exercises = exercises;
      }
      // Add other types as needed

      await addTemplate({ name, type: itemType as PersonalItem['type'], content: templateContent });
      alert("התבנית נשמרה!");
      getTemplates().then(setTemplates);
  };

  // Main command parsing logic
  useEffect(() => {
    const parseInput = async () => {
        const trimmedInput = input.trim();
        // URL detection
        if (/^https?:\/\//.test(trimmedInput)) {
            handleSetItemType('link');
            setUrl(trimmedInput);
            setIsFetchingMetadata(true);
            try {
                const metadata = await getUrlMetadata(trimmedInput, availableTags);
                setTitle(metadata.title || '');
                setContent(metadata.content || '');
            } catch (e) { console.error(e) } 
            finally { setIsFetchingMetadata(false); }
        } 
        // Task detection
        else if (trimmedInput.startsWith('משימה:')) {
            handleSetItemType('task');
            setTitle(trimmedInput.substring(7).trim());
        } else {
            // Default to spark or note depending on content length
            if (itemType !== 'spark' && itemType !== 'note') handleSetItemType('spark');
            setContent(input);
        }
    };
    parseInput();
  }, [input, availableTags]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (itemType === 'spark') {
        const selectedTags = availableTags.filter(t => selectedTagIds.has(t.id));
        await addSpark({ title: title || content.substring(0, 50), content, tags: selectedTags, attachments: [] });
      } else {
         let newItem: Omit<PersonalItem, 'id' | 'createdAt'> = {
            type: itemType, title, content, metadata: {},
        };
        switch (itemType) {
            case 'task':
                newItem = { ...newItem, isCompleted: false, dueDate: dueDate || undefined, priority };
                break;
            case 'link':
                newItem = { ...newItem, url };
                break;
            case 'book':
                newItem = { ...newItem, author, totalPages: Number(totalPages) || 0, currentPage: 0, quotes: [], metadata: { bookStatus: 'to-read' }};
                break;
            case 'workout':
                newItem = { ...newItem, exercises: exercises.filter(ex => ex.name) };
                break;
        }
        await addPersonalItem(newItem);
      }
      resetState();
      alert('הפריט נוסף בהצלחה!');
      setActiveScreen(itemType === 'spark' ? 'feed' : 'home');

    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const TypeButton: React.FC<{ type: PersonalItem['type'] | 'spark'; label: string; icon: React.ReactNode; }> = ({ type, label, icon }) => (
    <button type="button" onClick={() => handleSetItemType(type)} className={`flex flex-col items-center justify-center gap-2 p-2 rounded-lg transition-all w-24 h-24 shrink-0 ${itemType === type ? 'bg-blue-600/20 border border-blue-500 text-blue-300' : 'bg-gray-800/50 border border-transparent hover:bg-gray-700/70 text-gray-400'}`}>
        {icon} <span className="text-sm font-semibold">{label}</span>
    </button>
  );
  
  const inputStyles = "w-full bg-gray-800/80 border border-[var(--border-color)] text-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow";
  
  const renderFormFields = () => (
    <div className="space-y-6 animate-fade-in-up">
        {itemType !== 'workout' && (
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">כותרת</label>
              <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputStyles} required={itemType !== 'spark'} />
            </div>
        )}

        {itemType === 'book' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="author" className="block text-sm font-medium text-gray-400 mb-1">סופר</label>
                <input type="text" id="author" value={author} onChange={(e) => setAuthor(e.target.value)} className={inputStyles} />
              </div>
              <div>
                <label htmlFor="totalPages" className="block text-sm font-medium text-gray-400 mb-1">סה"כ עמודים</label>
                <input type="number" id="totalPages" value={totalPages} onChange={(e) => setTotalPages(e.target.value)} className={inputStyles} />
              </div>
            </div>
        )}

        {itemType !== 'workout' && (
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">תוכן</label>
              <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={5} className={inputStyles} />
            </div>
        )}

        {itemType === 'task' && (
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-400 mb-1">תאריך יעד</label>
                  <input type="date" id="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputStyles} style={{colorScheme: 'dark'}}/>
              </div>
              <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-400 mb-1">עדיפות</label>
                  <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as any)} className={inputStyles}>
                      <option value="low">נמוכה</option>
                      <option value="medium">בינונית</option>
                      <option value="high">גבוהה</option>
                  </select>
              </div>
          </div>
        )}

        {/* Other fields... */}
    </div>
  );

  return (
    <div className="pt-4 pb-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-100">הוספה מהירה</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label htmlFor="command-input" className="block text-sm font-medium text-gray-400 mb-1">התחל כאן</label>
          <input
            id="command-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="הדבק קישור, כתוב משימה, או רשום רעיון..."
            className={`${inputStyles} text-lg`}
          />
        </div>

        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">סוג הפריט</h3>
                {itemType !== 'spark' && (
                    <button type="button" onClick={() => setShowTemplates(true)} className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                        <TemplateIcon className="w-4 h-4" />
                        השתמש בתבנית
                    </button>
                )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" style={{'scrollbarWidth': 'none'}}>
                <TypeButton type="spark" label="ספארק" icon={<FlameIcon className="w-8 h-8"/>} />
                <TypeButton type="task" label="משימה" icon={<CheckCircleIcon className="w-8 h-8"/>} />
                <TypeButton type="link" label="קישור" icon={<LinkIcon className="w-8 h-8"/>} />
                <TypeButton type="note" label="פתק" icon={<ClipboardListIcon className="w-8 h-8"/>} />
                <TypeButton type="book" label="ספר" icon={<BookOpenIcon className="w-8 h-8"/>} />
                <TypeButton type="workout" label="אימון" icon={<DumbbellIcon className="w-8 h-8"/>} />
            </div>
        </div>

        {renderFormFields()}

        <div className="flex gap-2 pt-4">
            <button type="submit" disabled={isSubmitting || isFetchingMetadata} className="relative overflow-hidden flex-1 w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-lg disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-100 shadow-lg shadow-blue-900/30">
              <span className={`transition-opacity duration-200 ${isSubmitting ? 'opacity-0' : 'opacity-100'}`}>
                שמור פריט
              </span>
              <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isSubmitting ? 'opacity-100' : 'opacity-0'}`}>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                שומר...
              </span>
            </button>
            {itemType !== 'spark' && (
                 <button type="button" onClick={handleSaveAsTemplate} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center gap-2">
                    <TemplateIcon className="w-5 h-5" />
                </button>
            )}
        </div>
      </form>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setShowTemplates(false)}>
            <div className="bg-gray-800 rounded-lg p-4 w-11/12 max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="font-semibold mb-3">בחר תבנית</h3>
                <div className="space-y-2">
                    {templates.filter(t => t.type === itemType).map(t => (
                        <button key={t.id} onClick={() => handleApplyTemplate(t)} className="w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded-md">
                            {t.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AddScreen;