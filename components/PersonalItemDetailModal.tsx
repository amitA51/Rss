import React, { useState, useEffect, useRef, useMemo, useContext } from 'react';
import type { PersonalItem, Attachment, RoadmapStep, SubTask, Exercise, WorkoutSet, Space } from '../types';
import { 
    CloseIcon, DumbbellIcon, SummarizeIcon, ClipboardListIcon, LinkIcon, CheckCircleIcon, 
    FlameIcon, TargetIcon, BookOpenIcon, TrashIcon, StarIcon, LightbulbIcon, UserIcon, 
    EditIcon, PlayIcon, PauseIcon, 
    RoadmapIcon, DragHandleIcon, AddIcon, SparklesIcon, BoldIcon, ItalicIcon, CodeIcon, 
    ListIcon, Heading1Icon, Heading2Icon, QuoteIcon, StrikethroughIcon, getFileIcon,
    UploadIcon, MicrophoneIcon
} from './icons';
import MarkdownRenderer from './MarkdownRenderer';
import { getPersonalItemsByProjectId } from '../services/dataService';
import { AppContext } from '../state/AppContext';
import SessionTimer from './SessionTimer';
import { getIconForName } from './IconMap';
import { AVAILABLE_ICONS } from '../constants';
import * as geminiService from '../services/geminiService';
import ToggleSwitch from './ToggleSwitch';


// --- Helper Components ---

const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow";
const smallInputStyles = "w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[var(--dynamic-accent-start)] focus:border-[var(--dynamic-accent-start)]";

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

const AttachmentManager: React.FC<{attachments: Attachment[]; onAttachmentsChange: (attachments: Attachment[]) => void;}> = ({ attachments, onAttachmentsChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            onAttachmentsChange([...attachments, { name: file.name, type: 'local', url: reader.result as string, mimeType: file.type }]);
        };
        reader.readAsDataURL(file);
    };

    const handleRecord = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            mediaRecorderRef.current.ondataavailable = e => chunks.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                    const name = `הקלטה - ${new Date().toLocaleString()}.webm`;
                    onAttachmentsChange([...attachments, { name, type: 'local', url: reader.result as string, mimeType: 'audio/webm' }]);
                };
                reader.readAsDataURL(blob);
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
        }
    };

    useEffect(() => {
        let timer: number;
        if (isRecording) {
            timer = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [isRecording]);

    const removeAttachment = (index: number) => {
        onAttachmentsChange(attachments.filter((_, i) => i !== index));
    };

    return (
        <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">קבצים מצורפים</label>
            <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] p-3 rounded-lg hover:border-[var(--dynamic-accent-start)]"><UploadIcon className="w-5 h-5"/> העלאת קובץ</button>
                <button type="button" onClick={handleRecord} className={`flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed transition-colors ${isRecording ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-[var(--dynamic-accent-start)]'}`}>
                    <MicrophoneIcon className="w-5 h-5"/> {isRecording ? `עצור (${recordingTime}s)` : 'הקלט'}
                </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                    {attachments.map((att, i) => (
                        <div key={i} className="flex items-center justify-between bg-[var(--bg-primary)] p-2 rounded-lg">
                            <div className="flex items-center gap-2 truncate">
                                {getFileIcon(att.mimeType)}
                                <span className="text-sm truncate">{att.name}</span>
                            </div>
                            <button type="button" onClick={() => removeAttachment(i)} className="text-[var(--text-secondary)] hover:text-[var(--danger)] p-1"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


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
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
}

const PersonalItemDetailModal: React.FC<PersonalItemDetailModalProps> = ({ item, onClose, onUpdate, onDelete }) => {
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
  const [editedDueDate, setEditedDueDate] = useState(item?.dueDate || '');
  const [editedPriority, setEditedPriority] = useState(item?.priority || 'medium');
  const [editedAuthor, setEditedAuthor] = useState(item?.author || '');
  const [editedTotalPages, setEditedTotalPages] = useState(item?.totalPages?.toString() || '');
  const [editedExercises, setEditedExercises] = useState<Exercise[]>([]);
  const [editedUrl, setEditedUrl] = useState(item?.url || '');
  const [editedSpaceId, setEditedSpaceId] = useState(item?.spaceId || '');
  const [editedProjectId, setEditedProjectId] = useState(item?.projectId || '');
  const [editedReminderEnabled, setEditedReminderEnabled] = useState(item?.reminderEnabled || false);
  const [editedReminderTime, setEditedReminderTime] = useState(item?.reminderTime || '18:00');

  const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
  const [newSubTaskTitles, setNewSubTaskTitles] = useState<Record<string, string>>({});

  // Flashcard state
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flippedFlashcards, setFlippedFlashcards] = useState<string[]>([]);

  const [currentPageInput, setCurrentPageInput] = useState(item?.currentPage?.toString() || '');
  const [newQuote, setNewQuote] = useState('');
  const [childItems, setChildItems] = useState<PersonalItem[]>([]);
  const [project, setProject] = useState<PersonalItem | null>(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [newSubTask, setNewSubTask] = useState('');
  
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const roadmapStepDragItem = useRef<number | null>(null);
  const roadmapStepDragOverItem = useRef<number | null>(null);
  const subTaskDragItem = useRef<number | null>(null);
  const subTaskDragOverItem = useRef<number | null>(null);

  const personalSpaces = useMemo(() => state.spaces.filter(s => s.type === 'personal'), [state.spaces]);
  const projects = useMemo(() => state.personalItems.filter(i => i.type === 'goal'), [state.personalItems]);


  useEffect(() => {
    if (item?.projectId) {
        const parentProject = state.personalItems.find(p => p.id === item.projectId);
        setProject(parentProject || null);
    } else {
        setProject(null);
    }
  }, [item, state.personalItems]);


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
        // Reset view and editing states when item changes
        setViewMode('details');
        setIsEditing(false);
        setIsClosing(false);
        setExpandedSteps([]);
        setFlippedFlashcards([]);
        setNewQuote('');
        setNewSubTask('');
        setNewSubTaskTitles({});
        
        // Populate edit states
        setEditedTitle(item.title);
        setEditedContent(item.content || '');
        setEditedIcon(item.icon || '');
        setEditedAttachments(item.attachments || []);
        setEditedSteps(item.steps || []);
        setEditedDueDate(item.dueDate || '');
        setEditedPriority(item.priority || 'medium');
        setEditedAuthor(item.author || '');
        setEditedTotalPages(item.totalPages?.toString() || '');
        setEditedExercises(JSON.parse(JSON.stringify(item.exercises || []))); // deep copy
        setEditedUrl(item.url || '');
        setEditedSpaceId(item.spaceId || '');
        setEditedProjectId(item.projectId || '');
        setEditedReminderEnabled(item.reminderEnabled || false);
        setEditedReminderTime(item.reminderTime || '18:00');
        setCurrentPageInput(item.currentPage?.toString() || '0');

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
  }, [item, viewMode, isEditing]);

  const totalFocusTime = useMemo(() => {
    if (!item?.focusSessions) return 0;
    return item.focusSessions.reduce((total, session) => total + session.duration, 0);
  }, [item?.focusSessions]);

  if (!item) return null;

  if (viewMode === 'session') {
      return <SessionTimer item={item} onEndSession={() => setViewMode('details')} />;
  }
  
  const showIconPicker = ['note', 'idea', 'journal', 'learning', 'goal', 'book', 'workout', 'roadmap'].includes(item.type);


   const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      // Reset all state when closing
      setIsEditing(false);
      setViewMode('details');
    }, 400);
  };
  
  const handleToggleImportant = () => {
    if (item) {
        onUpdate(item.id, { isImportant: !item.isImportant });
    }
  };

  const handleDelete = () => {
    onDelete(item!.id);
    // No need to call handleClose, parent will do it after confirmation
  };

  const handleSave = () => {
    if (!item) return;
    const updates: Partial<PersonalItem> = {};
    if (editedTitle.trim() && editedTitle !== item.title) updates.title = editedTitle;
    if (editedIcon !== (item.icon || '')) updates.icon = editedIcon;
    if (editedContent !== (item.content || '')) updates.content = editedContent;
    if (JSON.stringify(editedAttachments) !== JSON.stringify(item.attachments || [])) updates.attachments = editedAttachments;
    if (editedSpaceId !== (item.spaceId || '')) updates.spaceId = editedSpaceId || undefined;
    if (editedProjectId !== (item.projectId || '')) updates.projectId = editedProjectId || undefined;
    
    // Type-specific updates
    switch(item.type) {
        case 'task':
            if (editedDueDate !== (item.dueDate || '')) updates.dueDate = editedDueDate;
            if (editedPriority !== (item.priority || 'medium')) updates.priority = editedPriority;
            break;
        case 'link':
            if (editedUrl !== (item.url || '')) updates.url = editedUrl;
            break;
        case 'book':
            if (editedAuthor !== (item.author || '')) updates.author = editedAuthor;
            const newTotalPages = parseInt(editedTotalPages, 10);
            if (editedTotalPages && !isNaN(newTotalPages) && newTotalPages !== (item.totalPages || 0)) updates.totalPages = newTotalPages;
            break;
        case 'workout':
            if (JSON.stringify(editedExercises) !== JSON.stringify(item.exercises || [])) updates.exercises = editedExercises;
            break;
        case 'roadmap':
            if (JSON.stringify(editedSteps) !== JSON.stringify(item.steps || [])) updates.steps = editedSteps;
            break;
        case 'habit':
            if (editedReminderEnabled !== (item.reminderEnabled || false)) updates.reminderEnabled = editedReminderEnabled;
            if (editedReminderTime !== (item.reminderTime || '18:00')) updates.reminderTime = editedReminderTime;
            break;
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
    
    // --- Workout Edit Handlers ---
    const handleUpdateExercise = (exIndex: number, field: keyof Exercise, value: any) => {
        const newExercises = [...editedExercises];
        (newExercises[exIndex] as any)[field] = value;
        setEditedExercises(newExercises);
    };
    const handleAddExercise = () => setEditedExercises([...editedExercises, {id: `ex-${Date.now()}`, name: '', sets: [{reps:0, weight: 0}]}]);
    const handleRemoveExercise = (exIndex: number) => setEditedExercises(editedExercises.filter((_, i) => i !== exIndex));
    const handleUpdateSet = (exIndex: number, setIndex: number, field: keyof WorkoutSet, value: any) => {
        const newExercises = [...editedExercises];
        (newExercises[exIndex].sets[setIndex] as any)[field] = value;
        setEditedExercises(newExercises);
    };
    const handleAddSet = (exIndex: number) => {
        const newExercises = [...editedExercises];
        newExercises[exIndex].sets.push({reps: 0, weight: 0});
        setEditedExercises(newExercises);
    };
    const handleRemoveSet = (exIndex: number, setIndex: number) => {
        const newExercises = [...editedExercises];
        newExercises[exIndex].sets = newExercises[exIndex].sets.filter((_, i) => i !== setIndex);
        setEditedExercises(newExercises);
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
  
   const renderAttachmentsView = () => {
        const attachments = item.attachments;
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

    const renderContentEditor = () => (
        <div className="border border-[var(--border-primary)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--dynamic-accent-start)]/50 focus-within:border-[var(--dynamic-accent-start)]">
            <MarkdownToolbar onInsert={handleInsertMarkdown} />
            <textarea ref={contentRef} dir="auto" value={editedContent} onChange={e => setEditedContent(e.target.value)} rows={10} className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] p-3 focus:outline-none"/>
        </div>
    );

  const renderContent = () => {
    return (
        <div className="space-y-6">
            {isEditing && (
                <div className="space-y-4">
                    {showIconPicker && (
                         <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">אייקון</label>
                            <IconPicker selected={editedIcon} onSelect={setEditedIcon} />
                        </div>
                    )}
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="spaceId" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">מרחב</label>
                            <select id="spaceId" value={editedSpaceId} onChange={(e) => setEditedSpaceId(e.target.value)} className={inputStyles}>
                                <option value="">ללא</option>
                                {personalSpaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="projectId" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">פרויקט</label>
                            <select id="projectId" value={editedProjectId} onChange={(e) => setEditedProjectId(e.target.value)} className={inputStyles}>
                                <option value="">ללא</option>
                                {projects.filter(p => p.id !== item.id).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}
            
            {(() => {
                switch (item.type) {
                    case 'task': return isEditing && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="dueDate" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">תאריך יעד</label>
                                <input type="date" id="dueDate" value={editedDueDate} onChange={(e) => setEditedDueDate(e.target.value)} className={inputStyles} style={{colorScheme: 'dark'}}/>
                            </div>
                            <div>
                                <label htmlFor="priority" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">עדיפות</label>
                                <select id="priority" value={editedPriority} onChange={(e) => setEditedPriority(e.target.value as any)} className={inputStyles}>
                                    <option value="low">נמוכה</option>
                                    <option value="medium">בינונית</option>
                                    <option value="high">גבוהה</option>
                                </select>
                            </div>
                        </div>
                    );
                    case 'link': return isEditing && (
                        <div>
                            <label htmlFor="url" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">כתובת URL</label>
                            <input type="url" id="url" value={editedUrl} onChange={(e) => setEditedUrl(e.target.value)} className={inputStyles} placeholder="https://example.com" required />
                        </div>
                    );
                    case 'workout':
                        return isEditing ? (
                             <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">תרגילים</label>
                                <div className="space-y-4">
                                    {editedExercises.map((ex, exIndex) => (
                                        <div key={ex.id || exIndex} className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-primary)] space-y-3">
                                            <div className="flex items-center gap-2">
                                                <input type="text" value={ex.name} onChange={(e) => handleUpdateExercise(exIndex, 'name', e.target.value)} placeholder="שם התרגיל" className={smallInputStyles + " flex-grow"} />
                                                <button type="button" onClick={() => handleRemoveExercise(exIndex)} className="text-[var(--text-secondary)] hover:text-[var(--danger)]"><TrashIcon className="w-5 h-5"/></button>
                                            </div>
                                            <div className="space-y-2">
                                                {ex.sets.map((set, setIndex) => (
                                                    <div key={setIndex} className="grid grid-cols-4 gap-2 items-center text-sm">
                                                        <span className="text-center text-[var(--text-secondary)]">סט {setIndex + 1}</span>
                                                        <input type="number" value={set.reps} onChange={(e) => handleUpdateSet(exIndex, setIndex, 'reps', e.target.valueAsNumber || 0)} placeholder="חזרות" className={smallInputStyles + " text-center"} />
                                                        <input type="number" value={set.weight} onChange={(e) => handleUpdateSet(exIndex, setIndex, 'weight', e.target.valueAsNumber || 0)} placeholder="משקל" className={smallInputStyles + " text-center"} />
                                                        <button type="button" onClick={() => handleRemoveSet(exIndex, setIndex)} className="text-[var(--text-secondary)] hover:text-[var(--danger)] justify-self-center"><TrashIcon className="w-4 h-4"/></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button type="button" onClick={() => handleAddSet(exIndex)} className="w-full text-sm text-[var(--accent-highlight)] font-semibold flex items-center justify-center gap-1"><AddIcon className="w-4 h-4"/> הוסף סט</button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={handleAddExercise} className="mt-4 w-full text-sm text-[var(--accent-highlight)] font-semibold flex items-center justify-center gap-1"><AddIcon className="w-4 h-4"/> הוסף תרגיל</button>
                            </div>
                        ) : (
                             <div className="space-y-4">
                                {item.exercises?.map((ex) => (
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
                        );
                    case 'book':
                        const bookProgress = (item.totalPages && item.currentPage) ? Math.round((item.currentPage / item.totalPages) * 100) : 0;
                        return (
                             <div className="space-y-6">
                                {isEditing ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-sm text-[var(--text-secondary)]">מחבר</label><input type="text" value={editedAuthor} onChange={e => setEditedAuthor(e.target.value)} className={inputStyles}/></div>
                                        <div><label className="text-sm text-[var(--text-secondary)]">סה"כ עמודים</label><input type="number" value={editedTotalPages} onChange={e => setEditedTotalPages(e.target.value)} className={inputStyles}/></div>
                                    </div>
                                ) : (
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
                                )}
                                {(item.content || isEditing) && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">תקציר / הערות</h4>
                                        {isEditing ? renderContentEditor() : <MarkdownRenderer content={item.content || ''} />}
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
                            </div>
                        );
                    case 'roadmap':
                        const totalSteps = editedSteps?.length || 0;
                        const completedSteps = editedSteps?.filter(s => s.isCompleted).length || 0;
                        const roadmapProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
                        return (
                            <div className="space-y-6">
                                {(item.content || isEditing) && (isEditing ? renderContentEditor() : <MarkdownRenderer content={item.content} />)}
                                <div>
                                    <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">התקדמות</h4>
                                    <div className="w-full bg-[var(--bg-card)] rounded-full h-2.5 border border-[var(--border-primary)]">
                                        <div className="bg-[var(--accent-gradient)] h-2 rounded-full transition-all" style={{width: `${roadmapProgress}%`}}></div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {/* ... roadmap steps rendering, which already uses isEditing */}
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
                            </div>
                        );
                    case 'habit':
                        return (
                            <div className="space-y-4">
                                <HabitCalendarView item={item} />
                                 {!isEditing && item.reminderEnabled && item.reminderTime && (
                                    <div className="text-sm text-center bg-white/5 p-2 rounded-lg text-[var(--text-secondary)]">
                                        תזכורת יומית מופעלת לשעה {item.reminderTime}
                                    </div>
                                )}
                                {(item.content || isEditing) && <div className="mt-6 border-t border-[var(--border-primary)] pt-4">
                                    <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">תיאור</h4>
                                    {isEditing ? renderContentEditor() : <MarkdownRenderer content={item.content || ''} />}
                                </div>}
                                {isEditing && (
                                    <div className="mt-4 pt-4 border-t border-[var(--border-primary)] space-y-3">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[var(--text-primary)] font-medium">הפעל תזכורת</p>
                                            <ToggleSwitch checked={editedReminderEnabled} onChange={setEditedReminderEnabled} />
                                        </div>
                                        {editedReminderEnabled && (
                                            <div>
                                                <label htmlFor="reminderTime" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">שעת תזכורת</label>
                                                <input type="time" id="reminderTime" value={editedReminderTime} onChange={(e) => setEditedReminderTime(e.target.value)} className={inputStyles} style={{colorScheme: 'dark'}}/>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    default:
                        return (item.content || isEditing) ? (isEditing ? renderContentEditor() : <MarkdownRenderer content={item.content} />) : null;
                }
            })()}

            {isEditing 
                ? <AttachmentManager attachments={editedAttachments} onAttachmentsChange={setEditedAttachments} />
                : renderAttachmentsView()
            }
        </div>
    )
  };
  
  const showSessionButton = item.type === 'workout' || (item.type === 'learning' && state.settings.enableIntervalTimer);

   return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" 
      onClick={handleClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        ref={modalRef}
        className={`bg-[var(--bg-secondary)] w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-item-detail-title"
      >
        <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm z-10 rounded-t-3xl">
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
                 <button onClick={handleSave} className="flex items-center gap-1.5 text-sm bg-[var(--success)]/20 text-[var(--success)] font-semibold px-3 py-1.5 rounded-lg" aria-label="שמור שינויים">
                    <CheckCircleIcon className="w-5 h-5"/>
                    <span>שמור</span>
                </button>
            ) : (
                <button onClick={() => setIsEditing(true)} className="text-[var(--text-secondary)] hover:text-white transition-colors p-2 rounded-full active:scale-95" aria-label="ערוך פריט">
                    <EditIcon className="w-5 h-5"/>
                </button>
            )}
            <button onClick={handleToggleImportant} className={`p-1 rounded-full transition-colors active:scale-95 ${item.isImportant ? 'text-yellow-400' : 'text-[var(--text-secondary)] hover:text-yellow-400'}`} aria-label={item.isImportant ? "הסר חשיבות" : "סמן כחשוב"}>
                <StarIcon filled={!!item.isImportant} className="h-6 w-6" />
            </button>
             {!isEditing && (
              <button onClick={handleDelete} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-2 rounded-full active:scale-95" aria-label="מחק פריט">
                  <TrashIcon className="w-5 h-5"/>
              </button>
            )}
            <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 rounded-full active:scale-95" aria-label="סגור חלון">
                <CloseIcon className="h-6 w-6" />
            </button>
          </div>
        </header>
        
        {project && !isEditing && (
            <div className="px-6 pt-4">
                <button onClick={() => onClose(project)} className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full flex items-center gap-2 transition-colors">
                    <TargetIcon className="w-4 h-4" />
                    <span>פרויקט: {project.title}</span>
                </button>
            </div>
        )}

        <div className="p-6 overflow-y-auto flex-grow relative space-y-4">
            <div className="flex items-center gap-4">
                {item.type === 'learning' && getStatusBadge(item.metadata?.status)}
                {item.type === 'workout' && item.metadata?.duration && (
                    <span className="text-sm bg-[var(--bg-card)] text-[var(--text-primary)] px-3 py-1 rounded-full">{item.metadata.duration} דקות</span>
                )}
            </div>

            {renderContent()}
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
                    <LinkIcon className="h-5 h-5 ml-2" />
                    פתח קישור מקורי
                </a>
            )}
        </footer>
      </div>
    </div>
  );
};

export default PersonalItemDetailModal;