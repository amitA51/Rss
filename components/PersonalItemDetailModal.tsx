import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import type { PersonalItem, Attachment, RoadmapStep, SubTask } from '../types';
import { 
    CloseIcon, DumbbellIcon, SummarizeIcon, ClipboardListIcon, LinkIcon, CheckCircleIcon, 
    FlameIcon, TargetIcon, BookOpenIcon, TrashIcon, StarIcon, LightbulbIcon, UserIcon, 
    EditIcon, PlayIcon, PauseIcon, 
    RoadmapIcon, DragHandleIcon, AddIcon, SparklesIcon, BoldIcon, ItalicIcon, CodeIcon, 
    ListIcon, Heading1Icon, Heading2Icon, QuoteIcon, StrikethroughIcon, getFileIcon
} from './icons';
import MarkdownRenderer from './MarkdownRenderer';
import { getPersonalItemsByProjectId } from '../services/dataService';
import { AppContext } from '../state/AppContext';
import SessionTimer from './SessionTimer';
import { getIconForName } from './IconMap';
import { AVAILABLE_ICONS } from '../constants';
import * as geminiService from '../services/geminiService';


// --- Helper Components ---

const MarkdownToolbar: React.FC<{ onInsert: (syntax: string, endSyntax?: string) => void }> = ({ onInsert }) => (
    <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-t-lg border-b border-[var(--border-primary)] overflow-x-auto">
        <button type="button" onClick={() => onInsert('**', '**')} className="p-2 hover:bg-white/10 rounded-md"><BoldIcon className="w-5 h-5"/></button>
        <button type="button" onClick={() => onInsert('*', '*')} className="p-2 hover:bg-white/10 rounded-md"><ItalicIcon className="w-5 h-5"/></button>
        <button type="button" onClick={() => onInsert('~~', '~~')} className="p-2 hover:bg-white/10 rounded-md"><StrikethroughIcon className="w-5 h-5"/></button>
        <div className="w-px h-6 bg-[var(--border-primary)] mx-1"></div>
        <button type="button" onClick={() => onInsert('\n# ')} className="p-2 hover:bg-white/10 rounded-md"><Heading1Icon className="w-5 h-5"/></button>
        <button type="button" onClick={() => onInsert('\n## ')} className="p-2 hover:bg-white/10 rounded-md"><Heading2Icon className="w-5 h-5"/></button>
        <button type="button" onClick={() => onInsert('\n> ')} className="p-2 hover:bg-white/10 rounded-md"><QuoteIcon className="w-5 h-5"/></button>
        <div className="w-px h-6 bg-[var(--border-primary)] mx-1"></div>
        <button type="button" onClick={() => onInsert('\n- ')} className="p-2 hover:bg-white/10 rounded-md"><ListIcon className="w-5 h-5"/></button>
        <button type="button" onClick={() => onInsert('\n[ ] ')} className="p-2 hover:bg-white/10 rounded-md"><CheckCircleIcon className="w-5 h-5"/></button>
        <button type="button" onClick={() => onInsert('`', '`')} className="p-2 hover:bg-white/10 rounded-md"><CodeIcon className="w-5 h-5"/></button>
    </div>
);


const IconPicker: React.FC<{ selected: string; onSelect: (icon: string) => void }> = ({ selected, onSelect }) => (
    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
        {AVAILABLE_ICONS.map(iconName => {
            const Icon = getIconForName(iconName);
            return (
                <button
                    key={iconName}
                    type="button"
                    onClick={() => onSelect(iconName)}
                    className={`h-12 w-12 flex items-center justify-center rounded-lg transition-all ${selected === iconName ? 'bg-[var(--accent-start)] text-white ring-2 ring-offset-2 ring-offset-[var(--bg-card)] ring-[var(--accent-start)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-white/10'}`}
                >
                    <Icon className="h-6 w-6" />
                </button>
            );
        })}
    </div>
);

// --- Habit Calendar View ---
const HabitCalendarView: React.FC<{item: PersonalItem}> = ({ item }) => {
    const [date, setDate] = useState(new Date());

    const completionDates = useMemo(() => 
        new Set(item.completionHistory?.map(h => new Date(h.date).toDateString()) || [])
    , [item.completionHistory]);

    const { month, year, daysInMonth, firstDayOfMonth } = useMemo(() => {
        const d = new Date(date);
        const month = d.getMonth();
        const year = d.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        return { month, year, daysInMonth, firstDayOfMonth };
    }, [date]);

    const completionsThisMonth = useMemo(() => {
        return (item.completionHistory || []).filter(h => {
            const d = new Date(h.date);
            return d.getMonth() === month && d.getFullYear() === year;
        }).length;
    }, [item.completionHistory, month, year]);

    const longestStreak = useMemo(() => {
        if (!item.completionHistory || item.completionHistory.length === 0) return 0;
        const sortedDates = item.completionHistory.map(h => new Date(h.date)).sort((a,b) => a.getTime() - b.getTime());
        let maxStreak = 0;
        let currentStreak = 0;
        for (let i = 0; i < sortedDates.length; i++) {
            if (i === 0) {
                currentStreak = 1;
            } else {
                const diff = (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 3600 * 24);
                if (diff <= 1.5) { // Allow for some timezone flexibility
                    currentStreak++;
                } else {
                    maxStreak = Math.max(maxStreak, currentStreak);
                    currentStreak = 1;
                }
            }
        }
        maxStreak = Math.max(maxStreak, currentStreak);
        return maxStreak;
    }, [item.completionHistory]);

    return (
        <div className="bg-[var(--bg-card)] p-4 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
                <button onClick={() => setDate(new Date(year, month - 1, 1))}>&lt;</button>
                <h4 className="font-semibold text-lg">{date.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}</h4>
                <button onClick={() => setDate(new Date(year, month + 1, 1))}>&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--text-secondary)]">
                {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const d = new Date(year, month, day);
                    const isCompleted = completionDates.has(d.toDateString());
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                        <div key={day} className={`w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'border-2 border-[var(--dynamic-accent-start)]' : ''} ${isCompleted ? 'bg-[var(--dynamic-accent-start)] text-white font-bold' : ''}`}>
                            {day}
                        </div>
                    )
                })}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div><p className="font-bold text-lg text-[var(--accent-highlight)]">{item.streak || 0}</p><p className="text-xs text-[var(--text-secondary)]">רצף נוכחי</p></div>
                <div><p className="font-bold text-lg text-[var(--accent-highlight)]">{completionsThisMonth}</p><p className="text-xs text-[var(--text-secondary)]">החודש</p></div>
                <div><p className="font-bold text-lg text-[var(--accent-highlight)]">{longestStreak}</p><p className="text-xs text-[var(--text-secondary)]">הרצף הארוך</p></div>
            </div>
        </div>
    );
};

const Flashcard: React.FC<{ card: { id: string; question: string; answer: string; }; isFlipped: boolean; onFlip: () => void; }> = ({ card, isFlipped, onFlip }) => {
    return (
        <div className="perspective-1000">
            <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-preserve-3d { transform-style: preserve-3d; } .rotate-y-180 { transform: rotateY(180deg); } .backface-hidden { backface-visibility: hidden; }`}</style>
            <div onClick={onFlip} className={`relative w-full h-32 rounded-xl cursor-pointer transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                <div className="absolute w-full h-full backface-hidden bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl flex items-center justify-center p-4 text-center">
                    <div>
                        <p className="text-xs text-[var(--text-secondary)]">שאלה</p>
                        <p className="text-white">{card.question}</p>
                    </div>
                </div>
                <div className="absolute w-full h-full backface-hidden bg-white/5 border border-[var(--border-primary)] rounded-xl flex items-center justify-center p-4 text-center rotate-y-180">
                    <div>
                        <p className="text-xs text-[var(--text-secondary)]">תשובה</p>
                        <p className="text-white">{card.answer}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface PersonalItemDetailModalProps {
  item: PersonalItem | null;
  onClose: (nextItem?: PersonalItem) => void;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
}

const PersonalItemDetailModal: React.FC<PersonalItemDetailModalProps> = ({ item, onClose, onUpdate }) => {
  const { state } = useContext(AppContext);
  const [isClosing, setIsClosing] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'session'>('details');

  // Unified edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item?.title || '');
  const [editedContent, setEditedContent] = useState(item?.content || '');
  const [editedIcon, setEditedIcon] = useState(item?.icon || '');
  const [editedAttachments, setEditedAttachments] = useState<Attachment[]>(item?.attachments || []);
  const [editedSteps, setEditedSteps] = useState<RoadmapStep[]>(item?.steps || []);
  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const [newSubTaskTitles, setNewSubTaskTitles] = useState<Record<string, string>>({});

  // Flashcard state
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flippedFlashcards, setFlippedFlashcards] = useState<string[]>([]);

  const [currentPageInput, setCurrentPageInput] = useState(item?.currentPage?.toString() || '');
  const [newQuote, setNewQuote] = useState('');
  const [childItems, setChildItems] = useState<PersonalItem[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [newSubTask, setNewSubTask] = useState('');
  
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const roadmapStepDragItem = useRef<number | null>(null);
  const roadmapStepDragOverItem = useRef<number | null>(null);
  const subTaskDragItem = useRef<number | null>(null);
  const subTaskDragOverItem = useRef<number | null>(null);

  useEffect(() => {
    if (item?.type === 'goal') {
      const fetchChildren = async () => {
        setIsLoadingChildren(true);
        const children = await getPersonalItemsByProjectId(item.id);
        setChildItems(children);
        setIsLoadingChildren(false);
      }
      fetchChildren();
    } else {
      setChildItems([]);
    }
  }, [item]);

  useEffect(() => {
    if (item) {
        setCurrentPageInput(item.currentPage?.toString() || '0');
        setEditedTitle(item.title);
        setEditedContent(item.content);
        setEditedIcon(item.icon || '');
        setEditedAttachments(item.attachments || []);
        setEditedSteps(item.steps || []);
        // Reset view and editing states when item changes
        setViewMode('details');
        setIsEditing(false);
        setExpandedSteps([]);
    }
  }, [item]);

  // --- Accessibility: Focus Trap ---
  useEffect(() => {
    if (item && modalRef.current && viewMode === 'details') {
      triggerRef.current = document.activeElement as HTMLElement;
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, textarea, input, select'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      firstElement?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      };
      
      const modal = modalRef.current;
      modal.addEventListener('keydown', handleKeyDown);
      return () => {
          modal.removeEventListener('keydown', handleKeyDown);
          triggerRef.current?.focus();
      };
    }
  }, [item, viewMode]);

  const totalFocusTime = useMemo(() => {
    if (!item?.focusSessions) return 0;
    return item.focusSessions.reduce((total, session) => total + session.duration, 0);
  }, [item?.focusSessions]);

  if (!item) return null;

  if (viewMode === 'session') {
      return <SessionTimer item={item} onEndSession={() => setViewMode('details')} />;
  }
  
  const editableContentTypes = ['note', 'idea', 'journal', 'learning', 'goal', 'workout', 'book', 'link', 'task', 'roadmap'];
  const showIconPicker = ['note', 'idea', 'journal', 'learning', 'goal', 'book', 'workout', 'roadmap'].includes(item.type);


  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 400);
  };
  
  const handleToggleImportant = () => {
    if (item) {
        onUpdate(item.id, { isImportant: !item.isImportant });
    }
  };

  const handleSave = () => {
    const updates: Partial<PersonalItem> = {};
    if (item && editedTitle.trim() && editedTitle !== item.title) {
        updates.title = editedTitle;
    }
     if (item && editedIcon !== (item.icon || '')) {
        updates.icon = editedIcon;
    }
    if (item && editableContentTypes.includes(item.type) && editedContent !== item.content) {
        updates.content = editedContent;
    }
     if (item && JSON.stringify(editedAttachments) !== JSON.stringify(item.attachments || [])) {
        updates.attachments = editedAttachments;
    }
    if (item && item.type === 'roadmap' && JSON.stringify(editedSteps) !== JSON.stringify(item.steps || [])) {
        updates.steps = editedSteps;
    }
    
    if (Object.keys(updates).length > 0) {
        onUpdate(item.id, updates);
    }
    setIsEditing(false);
  };

    const handleToggleRoadmapStep = (stepId: string) => {
        const newSteps = editedSteps.map(step =>
            step.id === stepId ? { ...step, isCompleted: !step.isCompleted } : step
        );
        setEditedSteps(newSteps);
        onUpdate(item.id, { steps: newSteps });
    };

    const handleAddRoadmapSubTask = (stepId: string) => {
        const title = newSubTaskTitles[stepId];
        if (!title || !title.trim()) return;
        const newSteps = editedSteps.map(step => {
            if (step.id === stepId) {
                const newSubTask: SubTask = { id: `sub-${Date.now()}`, title: title.trim(), isCompleted: false };
                return { ...step, subTasks: [...(step.subTasks || []), newSubTask] };
            }
            return step;
        });
        setEditedSteps(newSteps);
        onUpdate(item.id, { steps: newSteps });
        setNewSubTaskTitles(prev => ({ ...prev, [stepId]: '' }));
    };

    const handleToggleRoadmapSubTask = (stepId: string, subTaskId: string) => {
        const newSteps = editedSteps.map(step => {
            if (step.id === stepId) {
                return { ...step, subTasks: step.subTasks?.map(st => st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st) };
            }
            return step;
        });
        setEditedSteps(newSteps);
        onUpdate(item.id, { steps: newSteps });
    };

    const handleStepDrop = () => {
        if (roadmapStepDragItem.current !== null && roadmapStepDragOverItem.current !== null) {
            const newSteps = [...editedSteps];
            const dragItemContent = newSteps[roadmapStepDragItem.current];
            newSteps.splice(roadmapStepDragItem.current, 1);
            newSteps.splice(roadmapStepDragOverItem.current, 0, dragItemContent);
            setEditedSteps(newSteps);
            onUpdate(item.id, { steps: newSteps });
        }
        roadmapStepDragItem.current = null;
        roadmapStepDragOverItem.current = null;
    };


  const handleUpdateCurrentPage = () => {
      const page = parseInt(currentPageInput, 10);
      if (!isNaN(page) && item && typeof item.totalPages === 'number') {
          const clampedPage = Math.max(0, Math.min(page, item.totalPages));
          onUpdate(item.id, { currentPage: clampedPage });
          setCurrentPageInput(clampedPage.toString());
      }
  };
  
  const handleAddQuote = () => {
      if (newQuote.trim() && item) {
          const updatedQuotes = [...(item.quotes || []), newQuote.trim()];
          onUpdate(item.id, { quotes: updatedQuotes });
          setNewQuote('');
      }
  };

  const handleRemoveQuote = (index: number) => {
      if(item) {
        const updatedQuotes = item.quotes?.filter((_, i) => i !== index) || [];
        onUpdate(item.id, { quotes: updatedQuotes });
      }
  };

    const handleAddSubTask = () => {
        if (!newSubTask.trim()) return;
        const updatedSubTasks = [
            ...(item.subTasks || []),
            { id: `sub-${Date.now()}`, title: newSubTask.trim(), isCompleted: false }
        ];
        onUpdate(item.id, { subTasks: updatedSubTasks });
        setNewSubTask('');
    };

    const handleToggleSubTask = (id: string) => {
        const updatedSubTasks = item.subTasks?.map(st =>
            st.id === id ? { ...st, isCompleted: !st.isCompleted } : st
        );
        onUpdate(item.id, { subTasks: updatedSubTasks });
    };

    const handleRemoveSubTask = (id: string) => {
        const updatedSubTasks = item.subTasks?.filter(st => st.id !== id);
        onUpdate(item.id, { subTasks: updatedSubTasks });
    };

    const handleSubTaskDrop = () => {
        if (subTaskDragItem.current !== null && subTaskDragOverItem.current !== null) {
            const currentSubTasks = [...(item.subTasks || [])];
            const draggedItemContent = currentSubTasks.splice(subTaskDragItem.current, 1)[0];
            currentSubTasks.splice(subTaskDragOverItem.current, 0, draggedItemContent);
            onUpdate(item.id, { subTasks: currentSubTasks });
        }
        subTaskDragItem.current = null;
        subTaskDragOverItem.current = null;
    };
  
    const handleGenerateFlashcards = async () => {
        if (!item || item.type !== 'learning' || !item.content) return;
        setIsGeneratingFlashcards(true);
        try {
            const newFlashcards = await geminiService.generateFlashcards(item.content);
            onUpdate(item.id, { flashcards: newFlashcards });
        } catch (error) {
            console.error("Failed to generate flashcards:", error);
            // TODO: Show status message
        } finally {
            setIsGeneratingFlashcards(false);
        }
    };

  const getIcon = () => {
    const iconClass = "h-6 w-6 text-[var(--accent-highlight)]";
    if (item.icon) {
      const Icon = getIconForName(item.icon);
      return <Icon className={iconClass} />;
    }
    switch (item.type) {
      case 'workout': return <DumbbellIcon className={iconClass} />;
      case 'learning': return <SummarizeIcon className={iconClass} />;
      case 'note': return <ClipboardListIcon className={iconClass} />;
      case 'link': return <LinkIcon className={iconClass} />;
      case 'task': return <CheckCircleIcon className={iconClass} />;
      case 'habit': return <FlameIcon className={iconClass} />;
      case 'goal': return <TargetIcon className={iconClass} />;
      case 'journal': return <UserIcon className={iconClass} />;
      case 'book': return <BookOpenIcon className={iconClass} />;
      case 'idea': return <LightbulbIcon className={iconClass} />;
      case 'roadmap': return <RoadmapIcon className={iconClass} />;
      default: return null;
    }
  };

  const getStatusBadge = (status: 'to-learn' | 'learning' | 'learned' | undefined) => {
    switch (status) {
      case 'to-learn': return <span className="text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">ללמוד</span>;
      case 'learning': return <span className="text-xs bg-blue-600/50 text-white px-2 py-0.5 rounded-full">לומד</span>;
      case 'learned': return <span className="text-xs bg-green-600/50 text-white px-2 py-0.5 rounded-full">נלמד</span>;
      default: return null;
    }
  };
  
  const renderChildItem = (child: PersonalItem) => (
      <div key={child.id} onClick={() => onClose(child)} className="bg-[var(--bg-card)] hover:bg-white/5 p-3 rounded-xl transition-all border border-[var(--border-primary)] hover:border-[var(--dynamic-accent-start)]/50 cursor-pointer active:scale-95">
          <p className="font-semibold text-[var(--text-primary)] truncate">{child.title}</p>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{child.content.split('\n')[0]}</p>
      </div>
  );

  const renderFocusSessions = () => {
    if (!item.focusSessions || item.focusSessions.length === 0) return null;
    
    return (
        <div className="border-t border-[var(--border-primary)] pt-6 mt-6">
            <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-3 uppercase tracking-wider">
                סשנים של פוקוס ({totalFocusTime} דקות)
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {item.focusSessions.map((session, index) => (
                    <div key={index} className="flex justify-between items-center bg-[var(--bg-card)] p-2 rounded-lg text-sm">
                        <span className="text-[var(--text-primary)]">
                            {new Date(session.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                        <span className="text-[var(--text-secondary)]">{session.duration} דקות</span>
                    </div>
                ))}
            </div>
        </div>
    );
  };
  
   const renderAttachments = () => {
        const attachments = isEditing ? editedAttachments : item.attachments;
        if (!attachments || attachments.length === 0) return null;
        return (
            <div className="border-t border-[var(--border-primary)] pt-6 mt-6">
                <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-3 uppercase tracking-wider">קבצים מצורפים</h3>
                <div className="space-y-2">
                    {attachments.map((file, index) => {
                        if (file.mimeType.startsWith('image/')) {
                            return <img key={index} src={file.url} alt={file.name} className="max-w-full rounded-lg" />;
                        }
                        if (file.mimeType.startsWith('audio/')) {
                            return <audio key={index} controls src={file.url} className="w-full" />;
                        }
                        return (
                            <a key={index} href={file.url} download={file.name} className="flex items-center gap-3 bg-[var(--bg-card)] hover:bg-white/5 p-3 rounded-xl transition-all border border-[var(--border-primary)] hover:border-[var(--dynamic-accent-start)]/50 active:scale-95">
                                {getFileIcon(file.mimeType)}
                                <span className="text-[var(--text-primary)] font-medium truncate">{file.name}</span>
                            </a>
                        );
                    })}
                </div>
            </div>
        );
    };

  const renderContent = () => {
    switch (item.type) {
        case 'workout':
            return (
                <div>
                    {item.exercises && item.exercises.length > 0 && (
                        <div className="space-y-4">
                            {item.exercises.map((ex) => (
                                <div key={ex.id}>
                                    <h4 className="font-semibold text-[var(--text-primary)] mb-2">{ex.name}</h4>
                                    <div className="space-y-2">
                                        {ex.sets.map((set, index) => (
                                            <div key={index} className="bg-[var(--bg-card)] p-3 rounded-lg border-l-2 border-[var(--border-primary)]">
                                                <div className="flex justify-around text-center">
                                                    <div><span className="text-xs text-[var(--text-secondary)]">סט</span><p className="font-semibold">{index + 1}</p></div>
                                                    <div><span className="text-xs text-[var(--text-secondary)]">חזרות</span><p className="font-semibold">{set.reps}</p></div>
                                                    <div><span className="text-xs text-[var(--text-secondary)]">משקל (ק"ג)</span><p className="font-semibold">{set.weight}</p></div>
                                                </div>
                                                {set.notes && <p className="text-xs text-center mt-2 pt-2 border-t border-[var(--border-primary)] text-[var(--text-secondary)] italic">"{set.notes}"</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                     {item.content && <div className="mt-6 border-t border-[var(--border-primary)] pt-4"><h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">הערות</h4><p className="text-[var(--text-primary)] whitespace-pre-wrap">{item.content}</p></div>}
                     {renderAttachments()}
                </div>
            );
        case 'book':
            const bookProgress = (item.totalPages && item.currentPage) ? Math.round((item.currentPage / item.totalPages) * 100) : 0;
            return (
                 <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">התקדמות</h4>
                         <div className="w-full bg-[var(--bg-card)] rounded-full h-2.5 mb-2 border border-[var(--border-primary)]">
                            <div className="bg-[var(--accent-gradient)] h-2 rounded-full" style={{width: `${bookProgress}%`}}></div>
                        </div>
                        <div className="flex items-center gap-2">
                           <input type="number" value={currentPageInput} onChange={e => setCurrentPageInput(e.target.value)} onBlur={handleUpdateCurrentPage} className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-2 w-24 text-center"/>
                           <span className="text-[var(--text-secondary)]">/ {item.totalPages} עמודים</span>
                           <button onClick={handleUpdateCurrentPage} className="bg-[var(--accent-gradient)] text-white px-4 py-2 rounded-xl text-sm font-semibold">עדכן</button>
                        </div>
                    </div>
                     {item.content && (
                        <div>
                            <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">תקציר / הערות</h4>
                            <p className="text-[var(--text-primary)] whitespace-pre-wrap">{item.content}</p>
                        </div>
                     )}
                     <div>
                        <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">ציטוטים</h4>
                        <div className="space-y-2">
                            {item.quotes && item.quotes.map((quote, index) => (
                                <div key={index} className="group flex items-start gap-2 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-primary)]">
                                    <p className="flex-1 text-[var(--text-primary)] italic">"{quote}"</p>
                                    <button onClick={() => handleRemoveQuote(index)} className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-[var(--danger)] transition-opacity">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                             <div className="flex items-center gap-2 pt-2">
                                <textarea dir="auto" value={newQuote} onChange={e => setNewQuote(e.target.value)} placeholder="הוסף ציטוט חדש..." rows={2} className="flex-1 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-2"/>
                                <button onClick={handleAddQuote} className="bg-[var(--accent-gradient)] text-white px-4 py-2 rounded-xl text-sm font-semibold self-stretch">הוסף</button>
                            </div>
                        </div>
                     </div>
                      {renderAttachments()}
                </div>
            );
        case 'roadmap':
            const totalSteps = editedSteps?.length || 0;
            const completedSteps = editedSteps?.filter(s => s.isCompleted).length || 0;
            const roadmapProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
            return (
                 <div className="space-y-6">
                     {item.content && !isEditing && <MarkdownRenderer content={item.content} />}
                     <div>
                        <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">התקדמות</h4>
                        <div className="w-full bg-[var(--bg-card)] rounded-full h-2.5 border border-[var(--border-primary)]">
                            <div className="bg-[var(--accent-gradient)] h-2 rounded-full transition-all" style={{width: `${roadmapProgress}%`}}></div>
                        </div>
                    </div>
                     <div className="space-y-3">
                        {editedSteps?.map((step, index) => {
                            const stepSubTasks = step.subTasks || [];
                            const completedSubTasks = stepSubTasks.filter(st => st.isCompleted).length;
                            return(
                            <div key={step.id} 
                                className={`p-3 rounded-xl border border-[var(--border-primary)] transition-all ${step.isCompleted ? 'opacity-50' : ''} ${isEditing ? 'bg-[var(--bg-card)]' : ''}`}
                                draggable={isEditing}
                                onDragStart={() => roadmapStepDragItem.current = index}
                                onDragEnter={() => roadmapStepDragOverItem.current = index}
                                onDragEnd={handleStepDrop}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                <div className="flex items-start gap-3">
                                    {isEditing && <div className="cursor-grab text-gray-500 pt-1"><DragHandleIcon className="w-5 h-5"/></div>}
                                    <input 
                                        type="checkbox" 
                                        checked={step.isCompleted}
                                        onChange={() => handleToggleRoadmapStep(step.id)}
                                        className="h-5 w-5 mt-1 rounded bg-black/30 border-gray-600 text-[var(--dynamic-accent-start)] focus:ring-[var(--dynamic-accent-start)] cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <p className={`font-semibold ${step.isCompleted ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>{step.title}</p>
                                        <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {step.duration && <p className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">{step.duration}</p>}
                                            {stepSubTasks.length > 0 && <p className="text-xs bg-gray-500/20 text-gray-300 px-2 py-0.5 rounded-full">{completedSubTasks}/{stepSubTasks.length}</p>}
                                        </div>
                                    </div>
                                    <button onClick={() => setExpandedSteps(e => e.includes(step.id) ? e.filter(id => id !== step.id) : [...e, step.id])} className="text-gray-400 p-1">
                                        <svg className={`w-4 h-4 transition-transform ${expandedSteps.includes(step.id) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                </div>
                                {expandedSteps.includes(step.id) && (
                                    <div className="pt-3 mt-3 ml-4 border-t border-[var(--border-primary)] space-y-2">
                                        {stepSubTasks.map(st => (
                                             <div key={st.id} className="flex items-center gap-2">
                                                <input type="checkbox" checked={st.isCompleted} onChange={() => handleToggleRoadmapSubTask(step.id, st.id)} className="h-4 w-4 rounded bg-black/30 border-gray-600 text-[var(--dynamic-accent-start)] focus:ring-[var(--dynamic-accent-start)] cursor-pointer" />
                                                <span className={`text-sm ${st.isCompleted ? 'line-through text-gray-500' : 'text-gray-200'}`}>{st.title}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2">
                                            <input type="text" value={newSubTaskTitles[step.id] || ''} onChange={e => setNewSubTaskTitles(p => ({...p, [step.id]: e.target.value}))} onKeyPress={e => e.key === 'Enter' && handleAddRoadmapSubTask(step.id)} placeholder="הוסף תת-משימה..." className="flex-1 text-sm bg-transparent border-b border-[var(--border-primary)] focus:border-[var(--accent-start)] focus:outline-none"/>
                                            <button onClick={() => handleAddRoadmapSubTask(step.id)}><AddIcon className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )})}
                     </div>
                     {renderAttachments()}
                </div>
            )
        case 'learning':
            return (
                <div className="space-y-6">
                    {item.metadata?.source && (
                        <div>
                             <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">מקור</h4>
                             <a href={item.metadata.source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--accent-highlight)] transition-colors">
                                <LinkIcon className="h-4 w-4"/>
                                <span>{item.metadata.source}</span>
                             </a>
                        </div>
                    )}
                    {item.content && (
                        <div>
                            <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">סיכום אישי</h4>
                            <MarkdownRenderer content={item.content} />
                        </div>
                    )}
                    {item.metadata?.key_takeaways && item.metadata.key_takeaways.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">תובנות מרכזיות</h4>
                            <ul className="list-disc list-inside text-[var(--text-primary)] space-y-1 pl-2">
                                {item.metadata.key_takeaways.map((takeaway, i) => <li key={i}>{takeaway}</li>)}
                            </ul>
                        </div>
                    )}
                    <div>
                        <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">כרטיסיות זיכרון</h4>
                        {isGeneratingFlashcards && <p className="text-sm text-center py-4 text-[var(--text-secondary)]">יוצר כרטיסיות...</p>}
                        {(!item.flashcards || item.flashcards.length === 0) && !isGeneratingFlashcards && (
                            <button onClick={handleGenerateFlashcards} disabled={!item.content} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-card)] border border-dashed border-[var(--border-primary)] text-white font-semibold py-3 px-4 rounded-xl hover:border-[var(--dynamic-accent-start)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <SparklesIcon className="w-5 h-5"/> צור כרטיסיות עם AI
                            </button>
                        )}
                        {item.flashcards && item.flashcards.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {item.flashcards.map(card => (
                                    <Flashcard 
                                        key={card.id} 
                                        card={card}
                                        isFlipped={flippedFlashcards.includes(card.id)} 
                                        onFlip={() => setFlippedFlashcards(f => f.includes(card.id) ? f.filter(id => id !== card.id) : [...f, card.id])}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {renderAttachments()}
                </div>
            );
        case 'note':
        case 'idea':
            return (
                <div>
                  <MarkdownRenderer content={item.content} />
                  {renderAttachments()}
                </div>
            );
         case 'link':
            return (
                 <div className="space-y-6">
                    {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-lg bg-gray-800" />
                    )}
                    <div>
                        <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">סיכום</h4>
                        <MarkdownRenderer content={item.content} />
                    </div>
                     {renderAttachments()}
                </div>
            );
        case 'task':
            const subTasks = item.subTasks || [];
            const completedCount = subTasks.filter(s => s.isCompleted).length;
            const totalCount = subTasks.length;
            const taskProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className={`px-3 py-1 text-sm rounded-full ${item.isCompleted ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-[var(--bg-card)] text-[var(--text-primary)]'}`}>{item.isCompleted ? 'הושלם' : 'לביצוע'}</span>
                        <span className={`capitalize px-3 py-1 text-sm rounded-full bg-[var(--bg-card)] text-[var(--text-primary)]`}>עדיפות: {item.priority === 'low' ? 'נמוכה' : item.priority === 'medium' ? 'בינונית' : 'גבוהה'}</span>
                         {item.dueDate && <span className="px-3 py-1 text-sm rounded-full bg-[var(--bg-card)] text-[var(--text-primary)]">תאריך יעד: {new Date(item.dueDate).toLocaleDateString('he-IL')}</span>}
                    </div>
                    
                    <div className="border-t border-[var(--border-primary)] pt-6 mt-6">
                        <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-3 uppercase tracking-wider">תת-משימות</h3>
                        {totalCount > 0 && (
                            <div className="w-full bg-[var(--bg-card)] rounded-full h-2.5 mb-4 border border-[var(--border-primary)]">
                                <div className="bg-[var(--accent-gradient)] h-2 rounded-full" style={{width: `${taskProgress}%`}}></div>
                            </div>
                        )}
                        <div className="space-y-2">
                            {subTasks.map((st, index) => (
                                <div 
                                    key={st.id} 
                                    className="group flex items-center gap-2 bg-[var(--bg-card)] p-2 rounded-lg"
                                    draggable
                                    onDragStart={() => subTaskDragItem.current = index}
                                    onDragEnter={() => subTaskDragOverItem.current = index}
                                    onDragEnd={handleSubTaskDrop}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <div className="cursor-grab text-gray-500 group-hover:text-white"><DragHandleIcon className="w-5 h-5"/></div>
                                    <input 
                                        type="checkbox"
                                        checked={st.isCompleted}
                                        onChange={() => handleToggleSubTask(st.id)}
                                        className="h-5 w-5 rounded bg-black/30 border-gray-600 text-[var(--dynamic-accent-start)] focus:ring-[var(--dynamic-accent-start)] cursor-pointer"
                                    />
                                    <span className={`flex-1 ${st.isCompleted ? 'line-through text-gray-500' : 'text-gray-200'}`}>{st.title}</span>
                                    <button onClick={() => handleRemoveSubTask(st.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <input 
                                type="text"
                                value={newSubTask}
                                onChange={e => setNewSubTask(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleAddSubTask()}
                                placeholder="הוסף תת-משימה חדשה..."
                                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg p-2"
                            />
                            <button onClick={handleAddSubTask} className="bg-white/10 text-white p-2 rounded-lg"><AddIcon className="w-5 h-5"/></button>
                        </div>
                    </div>

                    {item.content && <div className="mt-6 border-t border-[var(--border-primary)] pt-4"><h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">הערות</h4><MarkdownRenderer content={item.content} /></div>}
                    {renderAttachments()}
                    {renderFocusSessions()}
                </div>
            );
        case 'habit':
             return (
                 <div className="space-y-4">
                     <HabitCalendarView item={item} />
                     {item.content && <div className="mt-6 border-t border-[var(--border-primary)] pt-4"><h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">תיאור</h4><MarkdownRenderer content={item.content} /></div>}
                 </div>
            );
        case 'goal':
             return (
                 <div className="space-y-6">
                     {item.metadata?.targetDate && <p className="text-[var(--text-primary)]"><strong>תאריך יעד:</strong> {new Date(item.metadata.targetDate).toLocaleDateString('he-IL')}</p>}
                     {item.content && <MarkdownRenderer content={item.content} />}
                     {renderAttachments()}
                     {renderFocusSessions()}
                     <div className="border-t border-[var(--border-primary)] pt-6 mt-6">
                        <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-3 uppercase tracking-wider">פריטים מקושרים</h3>
                        {isLoadingChildren && <p className="text-[var(--text-secondary)]">טוען פריטים...</p>}
                        <div className="space-y-2">
                            {childItems.length > 0 ? (
                                childItems.map(renderChildItem)
                            ) : (
                                !isLoadingChildren && <p className="text-[var(--text-secondary)] text-center py-4">אין פריטים המשויכים לפרויקט זה.</p>
                            )}
                        </div>
                    </div>
                 </div>
             );
        case 'journal':
            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        {item.metadata?.mood && <p className="capitalize px-3 py-1 text-sm rounded-full bg-[var(--bg-card)] text-[var(--text-primary)]"><strong>מצב רוח:</strong> {item.metadata.mood}</p>}
                    </div>
                    <div className="prose-custom whitespace-pre-wrap border-t border-[var(--border-primary)] pt-4 mt-4">
                        <MarkdownRenderer content={item.content} />
                    </div>
                    {renderAttachments()}
                </div>
            );
        default: return <MarkdownRenderer content={item.content} />;
    }
  };
  
  const showSessionButton = item.type === 'workout' || (item.type === 'learning' && state.settings.enableIntervalTimer);

  const handleInsertMarkdown = (startSyntax: string, endSyntax: string = '') => {
    const textarea = contentRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let newText;
    let selectionStart;
    let selectionEnd;

    if (selectedText) {
        newText = `${text.substring(0, start)}${startSyntax}${selectedText}${endSyntax}${text.substring(end)}`;
        selectionStart = start + startSyntax.length;
        selectionEnd = end + startSyntax.length;
    } else {
        newText = `${text.substring(0, start)}${startSyntax}${endSyntax}${text.substring(start)}`;
        selectionStart = start + startSyntax.length;
        selectionEnd = selectionStart;
    }
    
    setEditedContent(newText);
    
    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = selectionStart;
        textarea.selectionEnd = selectionEnd;
    }, 0);
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={handleClose}>
      <div 
        ref={modalRef}
        className={`bg-[var(--bg-secondary)] w-full max-w-2xl max-h-[90vh] rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] ${isClosing ? 'animate-slide-down-out' : 'animate-modal-expand-in'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-item-detail-title"
      >
        <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 overflow-hidden">
              {getIcon()}
              {isEditing ? (
                  <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="bg-[var(--bg-card)] text-xl font-bold text-[var(--text-primary)] focus:outline-none rounded-md px-1 -mx-1 flex-1 w-full"
                      autoFocus
                  />
              ) : (
                  <h2 id="personal-item-detail-title" className="text-xl font-bold text-[var(--text-primary)] truncate">{item.title}</h2>
              )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
                 <button onClick={handleSave} className="flex items-center gap-1.5 text-sm bg-[var(--success)]/20 text-[var(--success)] font-semibold px-3 py-1.5 rounded-lg">
                    <CheckCircleIcon className="w-5 h-5"/>
                    <span>שמור</span>
                </button>
            ) : (
                <button onClick={() => setIsEditing(true)} className="text-[var(--text-secondary)] hover:text-white transition-colors p-2 rounded-full active:scale-95">
                    <EditIcon className="w-5 h-5"/>
                </button>
            )}
            <button onClick={handleToggleImportant} className={`p-1 rounded-full transition-colors active:scale-95 ${item.isImportant ? 'text-yellow-400' : 'text-[var(--text-secondary)] hover:text-yellow-400'}`}>
                <StarIcon filled={!!item.isImportant} className="h-6 w-6" />
            </button>
            <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 rounded-full active:scale-95">
                <CloseIcon className="h-6 w-6" />
            </button>
          </div>
        </header>
        
        <div className="p-6 overflow-y-auto flex-grow relative space-y-4">
            <div className="flex items-center gap-4">
                {item.type === 'learning' && getStatusBadge(item.metadata?.status)}
                {item.type === 'workout' && item.metadata?.duration && (
                    <span className="text-sm bg-[var(--bg-card)] text-[var(--text-primary)] px-3 py-1 rounded-full">{item.metadata.duration} דקות</span>
                )}
            </div>

            {isEditing ? (
                 <div className="space-y-4">
                    {showIconPicker && (
                         <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">אייקון</label>
                            <IconPicker selected={editedIcon} onSelect={setEditedIcon} />
                        </div>
                    )}
                    {editableContentTypes.includes(item.type) && (
                         <div className="border border-[var(--border-primary)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--dynamic-accent-start)]/50 focus-within:border-[var(--dynamic-accent-start)]">
                            <MarkdownToolbar onInsert={handleInsertMarkdown} />
                            <textarea ref={contentRef} dir="auto" value={editedContent} onChange={e => setEditedContent(e.target.value)} rows={10} className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] p-3 focus:outline-none"/>
                        </div>
                    )}
                 </div>
            ) : (
                 renderContent()
            )}
        </div>
        
        <footer className="p-4 border-t border-[var(--border-primary)] sticky bottom-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm flex justify-center items-center">
            {showSessionButton && (
                <button onClick={() => setViewMode('session')} className="bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-6 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-[var(--dynamic-accent-start)]/20 hover:shadow-[0_0_20px_var(--dynamic-accent-glow)] flex items-center gap-2">
                    <PlayIcon className="w-5 h-5"/>
                    <span>התחל סשן</span>
                </button>
            )}
            {item.type === 'link' && item.url && !showSessionButton && (
                 <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-[var(--dynamic-accent-start)]/20 hover:shadow-[0_0_20px_var(--dynamic-accent-glow)]"
                >
                    <LinkIcon className="h-5 w-5 ml-2" />
                    פתח קישור מקורי
                </a>
            )}
        </footer>
      </div>
    </div>
  );
};

export default PersonalItemDetailModal;