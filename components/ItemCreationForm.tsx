import React, { useState, useEffect, useReducer, useContext, useRef } from 'react';
import type { Tag, PersonalItem, Exercise, Template, ItemType, PersonalItemType, WorkoutSet, Space, AddableType, Screen, RoadmapStep, Attachment } from '../types';
import * as dataService from '../services/dataService';
import * as geminiService from '../services/geminiService';
import { 
    FlameIcon, CheckCircleIcon, LinkIcon, ClipboardListIcon, BookOpenIcon, 
    DumbbellIcon, TemplateIcon, TrashIcon, AddIcon, TargetIcon, ChartBarIcon, CloseIcon, SparklesIcon, RoadmapIcon,
    UploadIcon, MicrophoneIcon, BoldIcon, ItalicIcon, CodeIcon, ListIcon, Heading1Icon, 
    Heading2Icon, QuoteIcon, StrikethroughIcon, getFileIcon
} from '../components/icons';
import { AppContext } from '../state/AppContext';
import StatusMessage, { StatusMessageType } from './StatusMessage';
import { useDebounce } from '../hooks/useDebounce';
import { getIconForName } from './IconMap';
import { AVAILABLE_ICONS } from '../constants';
import LoadingSpinner from './LoadingSpinner';
import { useHaptics } from '../hooks/useHaptics';

// --- Reducer for Complex State Management ---
type SubmissionStatus = 'idle' | 'submitting';

interface State {
    title: string;
    content: string;
    url: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    author: string;
    totalPages: string;
    exercises: Exercise[];
    steps: Omit<RoadmapStep, 'isCompleted' | 'notes'>[];
    attachments: Attachment[];
    icon: string;
    projectId: string;
    spaceId: string;
    isFetchingMetadata: boolean;
    submissionStatus: SubmissionStatus;
    status?: 'todo' | 'doing' | 'done';
}

type Action =
  | { type: 'SET_FIELD'; payload: { field: keyof State; value: any } }
  | { type: 'ADD_EXERCISE' }
  | { type: 'UPDATE_EXERCISE'; payload: { index: number; name: string } }
  | { type: 'REMOVE_EXERCISE'; payload: { index: number } }
  | { type: 'ADD_SET'; payload: { exerciseIndex: number } }
  | { type: 'UPDATE_SET'; payload: { exerciseIndex: number; setIndex: number; field: keyof WorkoutSet; value: any } }
  | { type: 'REMOVE_SET'; payload: { exerciseIndex: number; setIndex: number } }
  | { type: 'ADD_STEP' }
  | { type: 'UPDATE_STEP'; payload: { index: number; field: keyof Omit<RoadmapStep, 'isCompleted' | 'id' | 'notes'>; value: string } }
  | { type: 'REMOVE_STEP'; payload: { index: number } }
  | { type: 'APPLY_TEMPLATE'; payload: Template }
  | { type: 'SET_METADATA_RESULT'; payload: Partial<PersonalItem> }
  | { type: 'RESET_FORM' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_DONE' }
  | { type: 'SET_GENERATED_STEPS'; payload: Omit<RoadmapStep, 'isCompleted' | 'id' | 'notes'>[] };
  
const initialState: State = {
    title: '',
    content: '',
    url: '',
    dueDate: '',
    priority: 'medium',
    author: '',
    totalPages: '',
    exercises: [{ id: `ex-${Date.now()}`, name: '', sets: [{ reps: 0, weight: 0, notes: '' }] }],
    steps: [{ id: `step-${Date.now()}`, title: '', description: '', duration: '' }],
    attachments: [],
    icon: '',
    projectId: '',
    spaceId: '',
    isFetchingMetadata: false,
    submissionStatus: 'idle',
    status: 'todo',
};

const formReducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.payload.field]: action.payload.value };
        case 'ADD_EXERCISE':
             return { ...state, exercises: [...state.exercises, { id: `ex-${Date.now()}`, name: '', sets: [{ reps: 0, weight: 0, notes: '' }] }] };
        case 'UPDATE_EXERCISE':
            return { ...state, exercises: state.exercises.map((ex, i) => i === action.payload.index ? { ...ex, name: action.payload.name } : ex) };
        case 'REMOVE_EXERCISE':
            return { ...state, exercises: state.exercises.filter((_, i) => i !== action.payload.index) };
        case 'ADD_SET':
            return { ...state, exercises: state.exercises.map((ex, i) => i === action.payload.exerciseIndex ? { ...ex, sets: [...ex.sets, { reps: 0, weight: 0, notes: '' }] } : ex) };
        case 'UPDATE_SET':
            return { ...state, exercises: state.exercises.map((ex, i) => i === action.payload.exerciseIndex ? { ...ex, sets: ex.sets.map((set, si) => si === action.payload.setIndex ? { ...set, [action.payload.field]: action.payload.value } : set) } : ex) };
        case 'REMOVE_SET':
             return { ...state, exercises: state.exercises.map((ex, i) => i === action.payload.exerciseIndex ? { ...ex, sets: ex.sets.filter((_, si) => si !== action.payload.setIndex) } : ex) };
        case 'ADD_STEP':
            return { ...state, steps: [...state.steps, { id: `step-${Date.now()}`, title: '', description: '', duration: '' }] };
        case 'UPDATE_STEP':
            return { ...state, steps: state.steps.map((step, i) => i === action.payload.index ? { ...step, [action.payload.field]: action.payload.value } : step) };
        case 'REMOVE_STEP':
            return { ...state, steps: state.steps.filter((_, i) => i !== action.payload.index) };
        case 'APPLY_TEMPLATE':
            const { title, content, exercises, icon } = action.payload.content;
            return {
                ...state,
                title: title ? title.replace('{DATE}', new Date().toLocaleDateString('he-IL')) : '',
                content: content || '',
                exercises: exercises ? JSON.parse(JSON.stringify(exercises)) : state.exercises,
                icon: icon || '',
            };
        case 'SET_METADATA_RESULT':
            return {
                ...state,
                title: action.payload.title || '',
                content: action.payload.content || '',
                isFetchingMetadata: false,
            };
        case 'SET_GENERATED_STEPS':
             return { ...state, steps: action.payload.map(s => ({ ...s, id: `step-${Date.now()}-${Math.random()}` })) };
        case 'RESET_FORM': return initialState;
        case 'SUBMIT_START': return { ...state, submissionStatus: 'submitting' };
        case 'SUBMIT_DONE': return { ...initialState, submissionStatus: 'idle' };
        default: return state;
    }
};


// --- Sub-components for form fields ---
const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow";
const smallInputStyles = "w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[var(--dynamic-accent-start)] focus:border-[var(--dynamic-accent-start)]";

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

const SimpleFormFields: React.FC<{title: string; setTitle: (v: string) => void; content: string; setContent: (v: string) => void; titlePlaceholder?: string; contentPlaceholder?: string, titleRequired?: boolean; contentRequired?: boolean, isSpark?: boolean; }> = 
({ title, setTitle, content, setContent, titlePlaceholder="כותרת", contentPlaceholder="תוכן...", titleRequired=true, contentRequired=true, isSpark=false }) => {
    const contentRef = useRef<HTMLTextAreaElement>(null);
    
    const handleInsert = (startSyntax: string, endSyntax: string = '') => {
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
        
        setContent(newText);
        
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = selectionStart;
            textarea.selectionEnd = selectionEnd;
        }, 0);
    };
    
    return (
    <>
        <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">כותרת</label>
            <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputStyles} placeholder={titlePlaceholder + (isSpark ? " (אופציונלי)" : "")} required={!isSpark} />
        </div>
        <div>
            <label htmlFor="content" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">תוכן</label>
            <div className="border border-[var(--border-primary)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--dynamic-accent-start)]/50 focus-within:border-[var(--dynamic-accent-start)]">
                <MarkdownToolbar onInsert={handleInsert} />
                <textarea dir="auto" ref={contentRef} id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] p-3 focus:outline-none" placeholder={contentPlaceholder} required={contentRequired} />
            </div>
        </div>
    </>
    );
};
const TaskFormFields: React.FC<{state: State, dispatch: React.Dispatch<Action>}> = ({ state, dispatch }) => (
    <>
        <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">כותרת המשימה</label>
            <input type="text" id="title" value={state.title} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: e.target.value } })} className={inputStyles} required />
        </div>
        <div>
            <label htmlFor="content" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">הערות</label>
            <textarea dir="auto" id="content" value={state.content} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: e.target.value } })} rows={3} className={inputStyles} />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">תאריך יעד</label>
                <input type="date" id="dueDate" value={state.dueDate} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'dueDate', value: e.target.value } })} className={inputStyles} style={{colorScheme: 'dark'}}/>
            </div>
            <div>
                <label htmlFor="priority" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">עדיפות</label>
                <select id="priority" value={state.priority} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'priority', value: e.target.value } })} className={inputStyles}>
                    <option value="low">נמוכה</option>
                    <option value="medium">בינונית</option>
                    <option value="high">גבוהה</option>
                </select>
            </div>
        </div>
    </>
);
const LinkFormFields: React.FC<{state: State, dispatch: React.Dispatch<Action>}> = ({ state, dispatch }) => {
    const debouncedUrl = useDebounce(state.url, 500);

    useEffect(() => {
        const fetchMetadata = async () => {
            if (debouncedUrl && (debouncedUrl.startsWith('http://') || debouncedUrl.startsWith('https://'))) {
                dispatch({type: 'SET_FIELD', payload: {field: 'isFetchingMetadata', value: true}});
                try {
                    const metadata = await geminiService.getUrlMetadata(debouncedUrl);
                    dispatch({type: 'SET_METADATA_RESULT', payload: metadata});
                } catch (e) {
                    dispatch({type: 'SET_FIELD', payload: {field: 'isFetchingMetadata', value: false}});
                }
            }
        };
        fetchMetadata();
    }, [debouncedUrl, dispatch]);

    return (
    <>
        <div>
            <label htmlFor="url" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">כתובת URL</label>
            <input type="url" id="url" value={state.url} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'url', value: e.target.value } })} className={inputStyles} placeholder="https://example.com" required />
        </div>
        {state.isFetchingMetadata && <p className="text-sm text-[var(--text-secondary)] text-center">שולף מידע מהקישור...</p>}
        <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">כותרת</label>
            <input type="text" id="title" value={state.title} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: e.target.value } })} className={inputStyles} required />
        </div>
        <div>
            <label htmlFor="content" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">תקציר / הערות</label>
            <textarea dir="auto" id="content" value={state.content} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: e.target.value } })} rows={3} className={inputStyles} />
        </div>
    </>
    )
};
const BookFormFields: React.FC<{state: State, dispatch: React.Dispatch<Action>}> = ({ state, dispatch }) => (
     <>
        <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">שם הספר</label>
            <input type="text" id="title" value={state.title} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: e.target.value } })} className={inputStyles} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="author" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">מחבר</label>
                <input type="text" id="author" value={state.author} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'author', value: e.target.value } })} className={inputStyles} />
            </div>
             <div>
                <label htmlFor="totalPages" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">סה"כ עמודים</label>
                <input type="number" id="totalPages" value={state.totalPages} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'totalPages', value: e.target.value } })} className={inputStyles} />
            </div>
        </div>
        <div>
            <label htmlFor="content" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">תקציר / הערות</label>
            <textarea dir="auto" id="content" value={state.content} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: e.target.value } })} rows={3} className={inputStyles} />
        </div>
    </>
);
const WorkoutFormFields: React.FC<{state: State, dispatch: React.Dispatch<Action>}> = ({ state, dispatch }) => (
    <>
        <div className="flex justify-between items-end gap-2">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">שם האימון</label>
                <input type="text" id="title" value={state.title} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: e.target.value } })} className={inputStyles} required />
            </div>
            <TemplateSelector onSelectTemplate={(template) => dispatch({ type: 'APPLY_TEMPLATE', payload: template })} itemType="workout" />
        </div>
        <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">תרגילים</label>
            <div className="space-y-4">
                {state.exercises.map((ex, exIndex) => (
                    <div key={ex.id} className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-primary)] space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={ex.name}
                                onChange={(e) => dispatch({ type: 'UPDATE_EXERCISE', payload: { index: exIndex, name: e.target.value } })}
                                placeholder="שם התרגיל"
                                className={smallInputStyles + " flex-grow"}
                            />
                            <button type="button" onClick={() => dispatch({ type: 'REMOVE_EXERCISE', payload: { index: exIndex } })} className="text-[var(--text-secondary)] hover:text-[var(--danger)]"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="space-y-2">
                            {ex.sets.map((set, setIndex) => (
                                <div key={setIndex} className="grid grid-cols-4 gap-2 items-center text-sm">
                                    <span className="text-center text-[var(--text-secondary)]">סט {setIndex + 1}</span>
                                    <input type="number" value={set.reps} onChange={(e) => dispatch({ type: 'UPDATE_SET', payload: { exerciseIndex: exIndex, setIndex, field: 'reps', value: e.target.valueAsNumber || 0 }})} placeholder="חזרות" className={smallInputStyles + " text-center"} />
                                    <input type="number" value={set.weight} onChange={(e) => dispatch({ type: 'UPDATE_SET', payload: { exerciseIndex: exIndex, setIndex, field: 'weight', value: e.target.valueAsNumber || 0 }})} placeholder="משקל" className={smallInputStyles + " text-center"} />
                                    <button type="button" onClick={() => dispatch({ type: 'REMOVE_SET', payload: { exerciseIndex: exIndex, setIndex } })} className="text-[var(--text-secondary)] hover:text-[var(--danger)] justify-self-center"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => dispatch({ type: 'ADD_SET', payload: { exerciseIndex: exIndex } })} className="w-full text-sm text-[var(--accent-highlight)] font-semibold flex items-center justify-center gap-1"><AddIcon className="w-4 h-4"/> הוסף סט</button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={() => dispatch({ type: 'ADD_EXERCISE' })} className="mt-4 w-full text-sm text-[var(--accent-highlight)] font-semibold flex items-center justify-center gap-1"><AddIcon className="w-4 h-4"/> הוסף תרגיל</button>
        </div>
        <div>
            <label htmlFor="content" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">הערות אימון</label>
            <textarea dir="auto" id="content" value={state.content} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: e.target.value } })} rows={3} className={inputStyles} />
        </div>
    </>
);

const RoadmapFormFields: React.FC<{state: State, dispatch: React.Dispatch<Action>, onGenerate: () => void, isGenerating: boolean}> = ({ state, dispatch, onGenerate, isGenerating }) => (
     <>
        <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">המטרה</label>
            <div className="flex gap-2">
                <input type="text" id="title" value={state.title} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: e.target.value } })} className={inputStyles} required />
                 <button type="button" onClick={onGenerate} disabled={isGenerating || !state.title.trim()} className="bg-[var(--accent-gradient)] text-white p-3 rounded-xl disabled:opacity-50">
                    <SparklesIcon className={`w-6 h-6 ${isGenerating ? 'animate-pulse' : ''}`}/>
                </button>
            </div>
        </div>
        <div>
            <label htmlFor="content" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">תיאור כללי</label>
            <textarea dir="auto" id="content" value={state.content} onChange={(e) => dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: e.target.value } })} rows={3} className={inputStyles} />
        </div>
         <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">שלבים</label>
            <div className="space-y-3">
                 {state.steps.map((step, index) => (
                    <div key={index} className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-primary)] space-y-2">
                        <input type="text" value={step.title} onChange={e => dispatch({type: 'UPDATE_STEP', payload: {index, field: 'title', value: e.target.value}})} placeholder="כותרת השלב" className={smallInputStyles} />
                        <textarea value={step.description} onChange={e => dispatch({type: 'UPDATE_STEP', payload: {index, field: 'description', value: e.target.value}})} placeholder="תיאור" rows={2} className={smallInputStyles} />
                        <input type="text" value={step.duration} onChange={e => dispatch({type: 'UPDATE_STEP', payload: {index, field: 'duration', value: e.target.value}})} placeholder="משך זמן (למשל: 'שבוע')" className={smallInputStyles} />
                         <button type="button" onClick={() => dispatch({ type: 'REMOVE_STEP', payload: { index } })} className="text-[var(--text-secondary)] hover:text-[var(--danger)] text-xs flex items-center gap-1"><TrashIcon className="w-3 h-3"/> הסר שלב</button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={() => dispatch({ type: 'ADD_STEP' })} className="mt-2 w-full text-sm text-[var(--accent-highlight)] font-semibold flex items-center justify-center gap-1"><AddIcon className="w-4 h-4"/> הוסף שלב ידנית</button>
        </div>
    </>
);

const TemplateSelector: React.FC<{ itemType: PersonalItemType; onSelectTemplate: (template: Template) => void; }> = ({ itemType, onSelectTemplate }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      const allTemplates = await dataService.getTemplates();
      setTemplates(allTemplates.filter(t => t.type === itemType));
    };
    fetchTemplates();
  }, [itemType]);

  if (templates.length === 0) return null;

  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="bg-white/10 p-3 rounded-xl">
        <TemplateIcon className="w-5 h-5" />
      </button>
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-lg shadow-lg w-48 z-10">
          {templates.map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => { onSelectTemplate(template); setIsOpen(false); }}
              className="block w-full text-right px-3 py-2 text-sm hover:bg-white/10"
            >
              {template.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Form Component ---

interface ItemCreationFormProps {
  itemType: AddableType;
  onClose: () => void;
  setActiveScreen: (screen: Screen) => void;
  defaultStatus?: 'todo'|'doing'|'done';
  defaultDueDate?: string;
}

export const ItemCreationForm: React.FC<ItemCreationFormProps> = ({ itemType, onClose, setActiveScreen, defaultStatus, defaultDueDate }) => {
    const [state, localDispatch] = useReducer(formReducer, initialState);
    const { state: appState, dispatch: appDispatch } = useContext(AppContext);
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number} | null>(null);
    const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
    const { triggerHaptic } = useHaptics();

    useEffect(() => {
        const sharedDataString = sessionStorage.getItem('sharedData');
        if (sharedDataString) {
            const { url, text, title } = JSON.parse(sharedDataString);
            if (itemType === 'link' && url) {
                localDispatch({ type: 'SET_FIELD', payload: { field: 'url', value: url } });
            }
            if ((itemType === 'note' || itemType === 'spark') && (text || title)) {
                 localDispatch({ type: 'SET_FIELD', payload: { field: 'title', value: title || '' } });
                 localDispatch({ type: 'SET_FIELD', payload: { field: 'content', value: text || '' } });
            }
            sessionStorage.removeItem('sharedData');
        }

        if (defaultStatus) {
             localDispatch({ type: 'SET_FIELD', payload: { field: 'status', value: defaultStatus } });
        }
        if (defaultDueDate) {
             localDispatch({ type: 'SET_FIELD', payload: { field: 'dueDate', value: defaultDueDate } });
        }
        
    }, [itemType, defaultStatus, defaultDueDate]);

    const handleGenerateRoadmap = async () => {
        if (!state.title.trim()) return;
        setIsGeneratingRoadmap(true);
        try {
            const steps = await geminiService.generateRoadmap(state.title);
            localDispatch({ type: 'SET_GENERATED_STEPS', payload: steps });
        } catch (error) {
            console.error("Failed to generate roadmap:", error);
        } finally {
            setIsGeneratingRoadmap(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        localDispatch({type: 'SUBMIT_START'});
        appDispatch({ type: 'SET_LAST_ADDED_TYPE', payload: itemType });
        
        try {
            if (itemType === 'spark') {
                const newSpark = await dataService.addSpark({
                    title: state.title,
                    content: state.content,
                    tags: [],
                    attachments: state.attachments,
                });
                appDispatch({ type: 'ADD_FEED_ITEM', payload: newSpark });
            } else if (itemType === 'ticker') {
                await dataService.addToWatchlist(state.title);
                setActiveScreen('investments');
            } else {
                const newItem = await dataService.addPersonalItem({
                    type: itemType as PersonalItemType,
                    title: state.title,
                    content: state.content,
                    url: state.url,
                    domain: state.url ? new URL(state.url).hostname : undefined,
                    dueDate: state.dueDate || undefined,
                    priority: state.priority,
                    author: state.author || undefined,
                    totalPages: state.totalPages ? parseInt(state.totalPages, 10) : undefined,
                    exercises: state.exercises.filter(e => e.name),
                    // FIX: Map over steps to add the required 'isCompleted' property before submission.
                    steps: state.steps.map(s => ({ ...s, isCompleted: false })),
                    attachments: state.attachments,
                    icon: state.icon || undefined,
                    projectId: state.projectId || undefined,
                    spaceId: state.spaceId || undefined,
                    status: state.status,
                });
                appDispatch({ type: 'ADD_PERSONAL_ITEM', payload: newItem });
                if (itemType === 'task') setActiveScreen('today');
            }
            
            triggerHaptic('medium');
            localDispatch({type: 'SUBMIT_DONE'});
            onClose();

        } catch (error: any) {
            console.error('Submission failed:', error);
            triggerHaptic('heavy');
            setStatusMessage({type: 'error', text: error.message || 'שגיאה בשמירת הפריט', id: Date.now()});
            localDispatch({type: 'SUBMIT_DONE'});
        }
    };

    const renderFields = () => {
        switch (itemType) {
            case 'spark': return <SimpleFormFields title={state.title} setTitle={(v) => localDispatch({type:'SET_FIELD', payload:{field:'title', value:v}})} content={state.content} setContent={(v) => localDispatch({type:'SET_FIELD', payload:{field:'content', value:v}})} contentPlaceholder="כתוב כאן כל מה שעולה לך בראש..." contentRequired={false} isSpark={true} />;
            case 'note': return <SimpleFormFields title={state.title} setTitle={(v) => localDispatch({type:'SET_FIELD', payload:{field:'title', value:v}})} content={state.content} setContent={(v) => localDispatch({type:'SET_FIELD', payload:{field:'content', value:v}})} />;
            case 'idea': return <SimpleFormFields title={state.title} setTitle={(v) => localDispatch({type:'SET_FIELD', payload:{field:'title', value:v}})} content={state.content} setContent={(v) => localDispatch({type:'SET_FIELD', payload:{field:'content', value:v}})} titlePlaceholder="שם הרעיון" contentPlaceholder="פרט על הרעיון שלך..."/>;
            case 'journal': return <SimpleFormFields title={state.title} setTitle={(v) => localDispatch({type:'SET_FIELD', payload:{field:'title', value:v}})} content={state.content} setContent={(v) => localDispatch({type:'SET_FIELD', payload:{field:'content', value:v}})} titlePlaceholder="כותרת לערך היומן" contentPlaceholder="איך עבר היום שלך?"/>;
            case 'task': return <TaskFormFields state={state} dispatch={localDispatch} />;
            case 'link': return <LinkFormFields state={state} dispatch={localDispatch} />;
            case 'book': return <BookFormFields state={state} dispatch={localDispatch} />;
            case 'workout': return <WorkoutFormFields state={state} dispatch={localDispatch} />;
            case 'roadmap': return <RoadmapFormFields state={state} dispatch={localDispatch} onGenerate={handleGenerateRoadmap} isGenerating={isGeneratingRoadmap} />;
            case 'learning': return <SimpleFormFields title={state.title} setTitle={(v) => localDispatch({type:'SET_FIELD', payload:{field:'title', value:v}})} content={state.content} setContent={(v) => localDispatch({type:'SET_FIELD', payload:{field:'content', value:v}})} titlePlaceholder="נושא למידה" contentPlaceholder="סכם את מה שלמדת..."/>;
            case 'goal': return <SimpleFormFields title={state.title} setTitle={(v) => localDispatch({type:'SET_FIELD', payload:{field:'title', value:v}})} content={state.content} setContent={(v) => localDispatch({type:'SET_FIELD', payload:{field:'content', value:v}})} titlePlaceholder="שם הפרויקט / מטרה" contentPlaceholder="תאר את התוצאה הרצויה..."/>;
            case 'ticker': return <div className="space-y-4"><p className="text-sm text-center text-[var(--text-secondary)]">הוסף מניה, קרן סל, או מטבע קריפטו לרשימת המעקב שלך.</p><div><label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">סימול</label><input type="text" id="title" value={state.title} onChange={(e) => localDispatch({type:'SET_FIELD', payload:{field:'title', value:e.target.value.toUpperCase()}})} className={inputStyles} placeholder="לדוגמה: TSLA, BTC" required /></div></div>;
            default: return <p>סוג פריט לא נתמך.</p>;
        }
    };
    
    const isPersonalItem = itemType !== 'spark' && itemType !== 'ticker';
    const modalBgClass = appState.settings.themeSettings.cardStyle === 'glass' ? 'glass-modal-bg' : 'bg-[var(--bg-secondary)]';
    const headerFooterBgClass = appState.settings.themeSettings.cardStyle === 'glass' ? 'bg-transparent' : 'bg-[var(--bg-secondary)]/80';


    return (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-40" onClick={onClose}>
            <div className={`${modalBgClass} w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] animate-modal-enter`} onClick={e => e.stopPropagation()}>
                <header className={`p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 ${headerFooterBgClass} backdrop-blur-sm z-10 rounded-t-3xl`}>
                    <h2 className="text-xl font-bold text-white">הוספה חדשה</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 rounded-full active:scale-95">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-4">
                    {renderFields()}
                    {['note','idea','journal','learning','goal','book','workout','roadmap'].includes(itemType) && (
                         <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">אייקון</label>
                            <IconPicker selected={state.icon} onSelect={(icon) => localDispatch({type:'SET_FIELD', payload:{field:'icon', value:icon}})} />
                        </div>
                    )}
                    {isPersonalItem && (
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label htmlFor="spaceId" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">מרחב</label>
                               <select id="spaceId" value={state.spaceId} onChange={(e) => localDispatch({ type: 'SET_FIELD', payload: { field: 'spaceId', value: e.target.value } })} className={inputStyles}>
                                   <option value="">ללא</option>
                                   {appState.spaces.filter(s => s.type === 'personal').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                               </select>
                           </div>
                            <div>
                               <label htmlFor="projectId" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">פרויקט</label>
                               <select id="projectId" value={state.projectId} onChange={(e) => localDispatch({ type: 'SET_FIELD', payload: { field: 'projectId', value: e.target.value } })} className={inputStyles}>
                                   <option value="">ללא</option>
                                   {appState.personalItems.filter(i => i.type === 'goal').map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                               </select>
                           </div>
                        </div>
                    )}
                    {itemType !== 'ticker' && (
                        <AttachmentManager attachments={state.attachments} onAttachmentsChange={(atts) => localDispatch({type: 'SET_FIELD', payload: {field: 'attachments', value: atts}})} />
                    )}
                </form>
                 <footer className={`p-4 border-t border-[var(--border-primary)] sticky bottom-0 ${headerFooterBgClass} backdrop-blur-sm`}>
                     <button type="submit" onClick={handleSubmit} disabled={state.submissionStatus === 'submitting'} className="w-full bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 h-12 flex items-center justify-center">
                        {state.submissionStatus === 'submitting' ? <LoadingSpinner /> : 'שמור פריט'}
                    </button>
                </footer>
            </div>
            {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} />}
        </div>
    );
};