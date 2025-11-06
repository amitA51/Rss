import React, { RefObject, useRef, useState, useEffect } from 'react';
import { Attachment, PersonalItem, Exercise, RoadmapStep, SubTask, WorkoutSet } from '../../types';
import { AVAILABLE_ICONS } from '../../constants';
import { getIconForName } from '../IconMap';
import { BoldIcon, ItalicIcon, StrikethroughIcon, Heading1Icon, Heading2Icon, QuoteIcon, ListIcon, CheckCircleIcon, CodeIcon, UploadIcon, MicrophoneIcon, TrashIcon, getFileIcon } from '../icons';

export const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow";
export const smallInputStyles = "w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[var(--dynamic-accent-start)] focus:border-[var(--dynamic-accent-start)]";

// --- Edit State Management via Reducer ---

export interface EditState {
    title: string;
    content: string;
    icon: string;
    attachments: Attachment[];
    spaceId: string;
    projectId: string;
    // Type-specific fields
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    subTasks: SubTask[];
    author: string;
    totalPages: string;
    quotes: string[];
    exercises: Exercise[];
    steps: RoadmapStep[];
    url: string;
}

export type EditAction =
    | { type: 'SET_FIELD'; field: keyof EditState; value: any }
    | { type: 'RESET'; payload: PersonalItem };

export function editReducer(state: EditState, action: EditAction): EditState {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'RESET':
            const item = action.payload;
            return createInitialEditState(item);
        default:
            return state;
    }
}

export const createInitialEditState = (item: PersonalItem): EditState => ({
    title: item.title || '',
    content: item.content || '',
    icon: item.icon || '',
    attachments: item.attachments || [],
    spaceId: item.spaceId || '',
    projectId: item.projectId || '',
    // Type-specific fields with defaults
    dueDate: item.dueDate || '',
    priority: item.priority || 'medium',
    subTasks: item.subTasks ? JSON.parse(JSON.stringify(item.subTasks)) : [],
    author: item.author || '',
    totalPages: item.totalPages?.toString() || '',
    quotes: item.quotes || [],
    exercises: item.exercises ? JSON.parse(JSON.stringify(item.exercises)) : [],
    steps: item.steps ? JSON.parse(JSON.stringify(item.steps)) : [],
    url: item.url || '',
});


// --- Common Prop Types ---
export interface ViewProps {
    item: PersonalItem;
    onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
}
export interface EditProps {
    editState: EditState;
    dispatch: React.Dispatch<EditAction>;
}


// --- Common Detail Components ---

export const MarkdownToolbar: React.FC<{ onInsert: (syntax: string, endSyntax?: string) => void }> = ({ onInsert }) => (
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

export const IconPicker: React.FC<{ selected: string; onSelect: (icon: string) => void }> = ({ selected, onSelect }) => (
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

export const AttachmentManager: React.FC<{attachments: Attachment[]; onAttachmentsChange: (attachments: Attachment[]) => void;}> = ({ attachments, onAttachmentsChange }) => {
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
