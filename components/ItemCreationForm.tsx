import React, { useState, useEffect, useReducer, useContext, useRef } from 'react';
import type { Tag, PersonalItem, Exercise, Template, ItemType, PersonalItemType, WorkoutSet, Space, AddableType, Screen, RoadmapPhase, Attachment, FeedItem } from '../types';
import * as dataService from '../services/dataService';
import * as geminiService from '../services/geminiService';
import { 
    FlameIcon, CheckCircleIcon, LinkIcon, ClipboardListIcon, BookOpenIcon, 
    DumbbellIcon, TemplateIcon, TrashIcon, AddIcon, TargetIcon, ChartBarIcon, CloseIcon, SparklesIcon, RoadmapIcon
} from './icons';
import { AppContext } from '../state/AppContext';
import StatusMessage, { StatusMessageType } from './StatusMessage';
import { useDebounce } from '../hooks/useDebounce';
import { getIconForName } from './IconMap';
import { AVAILABLE_ICONS } from '../../constants';
import LoadingSpinner from './LoadingSpinner';
import { useHaptics } from '../hooks/useHaptics';
import { MarkdownToolbar, AttachmentManager } from './details/common';

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
    phases: RoadmapPhase[];
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
  | { type: 'ADD_PHASE' }
  | { type: 'UPDATE_PHASE'; payload: { index: number; field: keyof Omit<RoadmapPhase, 'isCompleted' | 'id' | 'notes' | 'tasks' | 'order'>; value: string } }
  | { type: 'REMOVE_PHASE'; payload: { index: number } }
  | { type: 'APPLY_TEMPLATE'; payload: Template }
  | { type: 'SET_METADATA_RESULT'; payload: Partial<PersonalItem> }
  | { type: 'RESET_FORM' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_DONE' }
  | { type: 'SET_GENERATED_PHASES'; payload: Omit<RoadmapPhase, 'id' | 'order' | 'notes'>[] };
  
const initialState: State = {
    title: '',
    content: '',
    url: '',
    dueDate: '',
    priority: 'medium',
    author: '',
    totalPages: '',
    exercises: [{ id: `ex-${Date.now()}`, name: '', sets: [{ reps: 0, weight: 0, notes: '' }] }],
    phases: [{ id: `phase-${Date.now()}`, title: '', description: '', duration: '', tasks: [], order: 0, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], attachments: [], status: 'pending', dependencies: [], estimatedHours: 0 }],
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
        case 'ADD_PHASE':
            // FIX: Added missing properties to the new phase object to conform to the RoadmapPhase type.
            return { ...state, phases: [...state.phases, { id: `phase-${Date.now()}`, title: '', description: '', duration: '', tasks: [], order: state.phases.length, startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], attachments: [], status: 'pending', dependencies: [], estimatedHours: 0 }] };
        case 'UPDATE_PHASE':
            return { ...state, phases: state.phases.map((phase, i) => i === action.payload.index ? { ...phase, [action.payload.field]: action.payload.value } : phase) };
        case 'REMOVE_PHASE':
            return { ...state, phases: state.phases.filter((_, i) => i !== action.payload.index) };
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
        case 'SET_GENERATED_PHASES':
             return { ...state, phases: action.payload.map((p, i) => ({ ...p, id: `phase-${Date.now()}-${i}`, order: i, notes: '' })) };
        case 'RESET_FORM': return initialState;
        case 'SUBMIT_START': return { ...state, submissionStatus: 'submitting' };
        case 'SUBMIT_DONE': return { ...initialState, submissionStatus: 'idle' };
        default: return state;
    }
};


// --- Sub-components for form fields ---
const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow";
const smallInputStyles = "w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[var(--dynamic-accent-start)] focus:border-[var(--dynamic-accent-start)]";


const SimpleFormFields: React.FC<{title: string; setTitle: (v: string) => void; content: string; setContent: (v: string) => void; titlePlaceholder?: string; contentPlaceholder?: string; titleRequired?: boolean; contentRequired?: boolean; isSpark?: boolean; }> = 
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
        <div className="space-y-4">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={titlePlaceholder} className={inputStyles} required={titleRequired} />
            <div className="border border-[var(--border-primary)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--dynamic-accent-start)]/50 focus-within:border-[var(--dynamic-accent-start)]">
                <MarkdownToolbar onInsert={handleInsert} />
                <textarea ref={contentRef} dir="auto" value={content} onChange={e => setContent(e.target.value)} placeholder={contentPlaceholder} rows={isSpark ? 8 : 4} className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] p-3 focus:outline-none" required={contentRequired} />
            </div>
        </div>
    );
};

// --- Main Creation Form Component ---

interface ItemCreationFormProps {
  itemType: AddableType;
  onClose: () => void;
  setActiveScreen: (screen: Screen) => void;
}

const ItemCreationForm: React.FC<ItemCreationFormProps> = ({ itemType, onClose, setActiveScreen }) => {
    const { state: appState, dispatch: appDispatch } = useContext(AppContext);
    const { triggerHaptic } = useHaptics();
    
    const [state, dispatch] = useReducer(formReducer, initialState);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string} | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    
    const [isSuggestingIcon, setIsSuggestingIcon] = useState(false);
    const debouncedTitle = useDebounce(state.title, 500);

    const formRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const fetchTemplates = async () => {
            const allTemplates = await dataService.getTemplates();
            setTemplates(allTemplates.filter(t => t.type === itemType));
        };
        fetchTemplates();
        
        const sharedDataString = sessionStorage.getItem('sharedData');
        if (sharedDataString) {
            const sharedData = JSON.parse(sharedDataString);
            if (itemType === 'link') {
                dispatch({ type: 'SET_FIELD', payload: { field: 'url', value: sharedData.url || sharedData.text || '' } });
                dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: sharedData.title || '' } });
            } else if (itemType === 'note') {
                const content = [sharedData.title, sharedData.text, sharedData.url].filter(Boolean).join('\n\n');
                dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: content } });
            }
            sessionStorage.removeItem('sharedData');
        }

    }, [itemType]);
    
    useEffect(() => {
        const defaultsString = sessionStorage.getItem('preselect_add_defaults');
        if (defaultsString) {
            try {
                const defaults = JSON.parse(defaultsString);
                for (const key in defaults) {
                    if (key in initialState) {
                        dispatch({ type: 'SET_FIELD', payload: { field: key as keyof State, value: defaults[key] } });
                    }
                }
            } catch (e) {
                console.error("Failed to parse preselect defaults:", e);
            } finally {
                sessionStorage.removeItem('preselect_add_defaults');
            }
        }
    }, []);

    useEffect(() => {
        if (debouncedTitle && !state.icon && itemType !== 'spark') {
            const suggestIcon = async () => {
                setIsSuggestingIcon(true);
                try {
                    const iconName = await geminiService.suggestIconForTitle(debouncedTitle);
                    dispatch({ type: 'SET_FIELD', payload: { field: 'icon', value: iconName } });
                } catch (error) {
                    console.error("Error suggesting icon:", error);
                } finally {
                    setIsSuggestingIcon(false);
                }
            };
            suggestIcon();
        }
    }, [debouncedTitle, itemType, state.icon]);

    useEffect(() => {
        if (state.url && itemType === 'link' && !state.isFetchingMetadata) {
            dispatch({ type: 'SET_FIELD', payload: { field: 'isFetchingMetadata', value: true } });
            geminiService.getUrlMetadata(state.url)
                .then(metadata => dispatch({ type: 'SET_METADATA_RESULT', payload: metadata }))
                .catch(() => dispatch({ type: 'SET_FIELD', payload: { field: 'isFetchingMetadata', value: false } }));
        }
    }, [state.url, itemType, state.isFetchingMetadata]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        dispatch({ type: 'SUBMIT_START' });
        triggerHaptic('heavy');
        
        try {
            let newItem: PersonalItem | FeedItem;
            if (itemType === 'spark') {
                newItem = await dataService.addSpark({ title: state.title, content: state.content, tags: [] });
                setActiveScreen('feed');
            } else if (itemType === 'ticker') {
                 const newWatchlistItem = await dataService.addToWatchlist(state.title);
                 onClose();
                 setActiveScreen('investments');
            } else {
                const commonData: Omit<PersonalItem, 'id' | 'createdAt' | 'type'> = {
                    title: state.title,
                    content: state.content,
                    icon: state.icon,
                    attachments: state.attachments,
                    spaceId: state.spaceId || undefined,
                    projectId: state.projectId || undefined,
                };

                let specificData: Partial<PersonalItem> = {};
                switch(itemType) {
                    case 'task': specificData = { dueDate: state.dueDate || undefined, priority: state.priority, status: state.status || 'todo' }; break;
                    case 'link': specificData = { url: state.url, domain: new URL(state.url).hostname }; break;
                    case 'book': specificData = { author: state.author, totalPages: parseInt(state.totalPages, 10) || 0, currentPage: 0, metadata: { bookStatus: 'to-read' } }; break;
                    case 'workout': specificData = { exercises: state.exercises }; break;
                    case 'goal': specificData = { status: state.status || 'todo' }; break;
                    case 'roadmap': specificData = { phases: state.phases }; break;
                }
                newItem = await dataService.addPersonalItem({ type: itemType as PersonalItemType, ...commonData, ...specificData });
                appDispatch({ type: 'ADD_PERSONAL_ITEM', payload: newItem });
                setActiveScreen('today');
            }
             appDispatch({ type: 'SET_LAST_ADDED_TYPE', payload: itemType });
             onClose();
        } catch (error: any) {
            setStatusMessage({type: 'error', text: error.message || 'שגיאה ביצירת הפריט'});
            dispatch({ type: 'SUBMIT_DONE' });
        }
    };
    
    const handleGenerateRoadmap = async () => {
        if (!state.title) return;
        const phases = await geminiService.generateRoadmap(state.title);
        dispatch({ type: 'SET_GENERATED_PHASES', payload: phases });
    };

    const renderFormFields = () => {
        switch (itemType) {
            case 'task':
                return (
                    <div className="space-y-4">
                        <SimpleFormFields title={state.title} setTitle={v => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: v }})} content={state.content} setContent={v => dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: v }})} titlePlaceholder='שם המשימה' contentPlaceholder='הערות (אופציונלי)' contentRequired={false} />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="date" value={state.dueDate} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'dueDate', value: e.target.value }})} className={inputStyles} style={{colorScheme: 'dark'}} />
                            <select value={state.priority} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'priority', value: e.target.value }})} className={inputStyles}>
                                <option value="low">נמוכה</option>
                                <option value="medium">בינונית</option>
                                <option value="high">גבוהה</option>
                            </select>
                        </div>
                    </div>
                );
            case 'link':
                return (
                    <div className="space-y-4">
                         <input type="url" value={state.url} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'url', value: e.target.value }})} placeholder="הדבק קישור..." className={inputStyles} required />
                         {state.isFetchingMetadata && <p className="text-sm text-center text-[var(--text-secondary)]">מאחזר מידע...</p>}
                         <input type="text" value={state.title} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: e.target.value }})} placeholder="כותרת" className={inputStyles} />
                         <textarea value={state.content} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: e.target.value }})} placeholder="הערות" rows={3} className={inputStyles} />
                    </div>
                );
            case 'book':
                return (
                    <div className="space-y-4">
                        <SimpleFormFields title={state.title} setTitle={v => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: v }})} content={state.content} setContent={v => dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: v }})} titlePlaceholder='שם הספר' contentPlaceholder='תקציר / הערות' contentRequired={false}/>
                         <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={state.author} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'author', value: e.target.value }})} placeholder="מחבר" className={inputStyles} />
                            <input type="number" value={state.totalPages} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'totalPages', value: e.target.value }})} placeholder="מספר עמודים" className={inputStyles} />
                        </div>
                    </div>
                );
            case 'workout':
                 return (
                    <div className="space-y-4">
                        <input type="text" value={state.title} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: e.target.value }})} placeholder="שם האימון (למשל: אימון רגליים)" className={inputStyles} required />
                        {/* Workout specific fields will go here */}
                    </div>
                );
            case 'roadmap':
                return (
                    <div className="space-y-4">
                        <div className="relative">
                            <input type="text" value={state.title} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: e.target.value }})} placeholder="המטרה הגדולה שלך..." className={inputStyles} required />
                            <button type="button" onClick={handleGenerateRoadmap} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-yellow-400 hover:bg-yellow-400/10"><SparklesIcon className="w-5 h-5"/></button>
                        </div>
                        <textarea dir="auto" value={state.content} onChange={e => dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: e.target.value }})} placeholder="פרטים נוספים על המטרה (אופציונלי)" rows={2} className={inputStyles} />
                        <div>
                             <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">שלבים</h4>
                             <div className="space-y-2">
                                {state.phases.map((phase, index) => (
                                    <div key={index} className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-primary)] space-y-2">
                                        <input type="text" value={phase.title} onChange={e => dispatch({type: 'UPDATE_PHASE', payload: {index, field: 'title', value: e.target.value}})} placeholder="שם השלב" className={smallInputStyles} />
                                        <textarea value={phase.description} onChange={e => dispatch({type: 'UPDATE_PHASE', payload: {index, field: 'description', value: e.target.value}})} placeholder="תיאור" rows={2} className={smallInputStyles} />
                                        <input type="text" value={phase.duration} onChange={e => dispatch({type: 'UPDATE_PHASE', payload: {index, field: 'duration', value: e.target.value}})} placeholder="משך זמן" className={smallInputStyles} />
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                );
            case 'ticker':
                return <input type="text" value={state.title} onChange={e => dispatch({type:'SET_FIELD', payload: {field: 'title', value: e.target.value.toUpperCase() }})} placeholder="סימול (למשל: TSLA, BTC)" className={inputStyles} required />;
            default: // Covers spark, note, idea, learning, journal, goal
                return <SimpleFormFields title={state.title} setTitle={v => dispatch({ type: 'SET_FIELD', payload: { field: 'title', value: v }})} content={state.content} setContent={v => dispatch({ type: 'SET_FIELD', payload: { field: 'content', value: v }})} isSpark={itemType === 'spark'} />;
        }
    };
    
    const Icon = itemType === 'spark' ? SparklesIcon : itemType === 'ticker' ? ChartBarIcon : getIconForName(state.icon || 'sparkles');

    return (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-40" onClick={handleClose}>
            <div
                ref={formRef}
                onClick={e => e.stopPropagation()}
                className={`bg-[var(--bg-card)] w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
                role="dialog"
                aria-modal="true"
            >
                <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 bg-[var(--bg-card)]/80 backdrop-blur-sm z-10 rounded-t-3xl">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className="relative">
                            <div className={`h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)]`}>
                                <Icon className="h-6 w-6" />
                            </div>
                            {isSuggestingIcon && <SparklesIcon className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />}
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">הוספת {itemType}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                         {templates.length > 0 && (
                            <div className="relative group">
                                <button type="button" className="p-2 text-[var(--text-secondary)] hover:text-white rounded-full"><TemplateIcon className="w-6 w-6"/></button>
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                                    {templates.map(t => <button key={t.id} onClick={() => dispatch({type: 'APPLY_TEMPLATE', payload: t})} className="block w-full text-right px-3 py-2 hover:bg-white/5">{t.name}</button>)}
                                </div>
                            </div>
                         )}
                         <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-white p-1 rounded-full"><CloseIcon className="w-6 w-6" /></button>
                    </div>
                </header>
                <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
                    {renderFormFields()}
                    
                    {itemType !== 'spark' && itemType !== 'ticker' && (
                        <>
                         <div className="grid grid-cols-2 gap-4">
                            <select value={state.spaceId} onChange={e => dispatch({type:'SET_FIELD', payload:{field: 'spaceId', value: e.target.value}})} className={inputStyles}>
                                <option value="">שייך למרחב...</option>
                                {appState.spaces.filter(s => s.type === 'personal').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                             <select value={state.projectId} onChange={e => dispatch({type:'SET_FIELD', payload:{field: 'projectId', value: e.target.value}})} className={inputStyles}>
                                <option value="">שייך לפרויקט...</option>
                                {appState.personalItems.filter(i => i.type === 'goal').map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                        <AttachmentManager attachments={state.attachments} onAttachmentsChange={(atts) => dispatch({type:'SET_FIELD', payload: {field: 'attachments', value: atts}})} />
                        </>
                    )}
                    
                    <button type="submit" disabled={state.submissionStatus === 'submitting'} className="w-full bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 h-12 flex items-center justify-center">
                        {state.submissionStatus === 'submitting' ? <LoadingSpinner /> : 'שמור'}
                    </button>
                </form>
            </div>
            {statusMessage && <StatusMessage type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} />}
        </div>
    );
};

export default ItemCreationForm;