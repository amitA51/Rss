import React, { useState, useEffect, useReducer, useMemo, useContext } from 'react';
import type { PersonalItem, Space } from '../types';
import { AppContext } from '../state/AppContext';
import { getIconForName } from './IconMap';
import * as geminiService from '../services/geminiService';
import { useDebounce } from '../hooks/useDebounce';

// Icons
import { CloseIcon, EditIcon, CheckCircleIcon, StarIcon, TrashIcon, SparklesIcon, getFileIcon, ChevronLeftIcon } from './icons';

// Details components
import { createInitialEditState, editReducer, AttachmentManager } from './details/common';
import { TaskView, TaskEdit } from './details/TaskDetails';
import { BookView, BookEdit } from './details/BookDetails';
import { WorkoutView, WorkoutEdit } from './details/WorkoutDetails';
import { GenericView, GenericEdit } from './details/GenericDetails';
import { inputStyles } from './details/common';

// Props
interface PersonalItemDetailModalProps {
  item: PersonalItem | null;
  onClose: (nextItem?: PersonalItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
  contextItems?: PersonalItem[];
}

const PersonalItemDetailModal: React.FC<PersonalItemDetailModalProps> = ({ item, onClose, onUpdate, onDelete, contextItems }) => {
    const { state } = useContext(AppContext);
    const [isClosing, setIsClosing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const [editState, dispatch] = useReducer(editReducer, item ? createInitialEditState(item) : createInitialEditState({} as PersonalItem));

    const [isSuggestingIcon, setIsSuggestingIcon] = useState(false);
    const debouncedTitle = useDebounce(editState.title, 500);

    const [relatedItems, setRelatedItems] = useState<PersonalItem[]>([]);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);

    const personalSpaces = useMemo(() => state.spaces.filter(s => s.type === 'personal'), [state.spaces]);
    const projects = useMemo(() => state.personalItems.filter(i => i.type === 'goal'), [state.personalItems]);

    useEffect(() => {
        if (item) {
            dispatch({ type: 'RESET', payload: item });
            setIsClosing(false);
            setIsEditing(false);

            // Fetch related items
            const fetchRelated = async () => {
                setIsLoadingRelated(true);
                setRelatedItems([]);
                try {
                    const related = await geminiService.findRelatedPersonalItems(item, state.personalItems);
                    setRelatedItems(related);
                } catch (error) {
                    console.error("Failed to find related items:", error);
                } finally {
                    setIsLoadingRelated(false);
                }
            };
            fetchRelated();
        }
    }, [item, state.personalItems]);

    useEffect(() => {
        if (isEditing && debouncedTitle && !editState.icon) {
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
    }, [debouncedTitle, isEditing, editState.icon]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => onClose(), 300);
    };

    const handleToggleImportant = () => {
        if (item) {
            onUpdate(item.id, { isImportant: !item.isImportant });
        }
    };

    const handleDelete = () => {
        if (item && window.confirm(`האם למחוק את "${item.title}"?`)) {
            onDelete(item.id);
            onClose(); // Close modal after deletion
        }
    };

    const handleSave = () => {
        if (!item) return;
    
        const updates: Partial<PersonalItem> = {};
        const originalState = createInitialEditState(item);
        
        // This logic creates a delta of changes to send for update
        (Object.keys(editState) as Array<keyof typeof editState>).forEach(key => {
            if (JSON.stringify(editState[key]) !== JSON.stringify(originalState[key])) {
                (updates as any)[key] = editState[key];
            }
        });
        
        if(updates.totalPages) updates.totalPages = parseInt(updates.totalPages as any, 10) || 0;

        if (Object.keys(updates).length > 0) {
            onUpdate(item.id, updates);
        }
        setIsEditing(false);
    };

    const { prevItem, nextItem } = useMemo(() => {
        if (!contextItems || !item) return { prevItem: null, nextItem: null };
        const currentIndex = contextItems.findIndex(i => i.id === item.id);
        if (currentIndex === -1) return { prevItem: null, nextItem: null };
        return {
            prevItem: currentIndex > 0 ? contextItems[currentIndex - 1] : null,
            nextItem: currentIndex < contextItems.length - 1 ? contextItems[currentIndex + 1] : null,
        };
    }, [contextItems, item]);

    const renderViewContent = () => {
        if (!item) return null;
        switch(item.type) {
            case 'task': return <TaskView item={item} onUpdate={onUpdate} />;
            case 'book': return <BookView item={item} onUpdate={onUpdate} />;
            case 'workout': return <WorkoutView item={item} onUpdate={onUpdate} />;
            case 'roadmap': // Falls through to generic view as it's now handled by its own modal
            case 'note':
            case 'idea':
            case 'journal':
            case 'learning':
            case 'link':
            case 'goal':
            default:
                 return <GenericView item={item} onUpdate={onUpdate} />;
        }
    };

    const renderEditContent = () => {
        if (!item) return null;
        switch(item.type) {
            case 'task': return <TaskEdit editState={editState} dispatch={dispatch} />;
            case 'book': return <BookEdit editState={editState} dispatch={dispatch} />;
            case 'workout': return <WorkoutEdit editState={editState} dispatch={dispatch} />;
            case 'roadmap': // Falls through to generic edit
            case 'note':
            case 'idea':
            case 'journal':
            case 'learning':
            case 'link':
            case 'goal':
            default:
                 return <GenericEdit editState={editState} dispatch={dispatch} />;
        }
    };

    const renderAttachmentsView = () => {
        const attachments = item?.attachments;
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

    if (!item) return null;

    const Icon = getIconForName(isEditing ? editState.icon : item.icon || 'sparkles');
    const modalBgClass = state.settings.themeSettings.cardStyle === 'glass' ? 'glass-modal-bg' : 'bg-[var(--bg-secondary)]';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={handleClose}>
            <div
                className={`${modalBgClass} w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="p-item-title"
            >
                 <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 bg-transparent backdrop-blur-sm z-10 rounded-t-3xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="relative">
                           <div className={`h-10 w-10 flex items-center justify-center rounded-lg transition-all ${isEditing ? 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]' : 'text-[var(--accent-highlight)]'}`}>
                                <Icon className="h-6 w-6" />
                           </div>
                           {isEditing && isSuggestingIcon && <SparklesIcon className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />}
                        </div>
                        
                        {isEditing ? (
                            <input
                                type="text"
                                id="p-item-title"
                                value={editState.title}
                                onChange={(e) => dispatch({type: 'SET_FIELD', payload: { field: 'title', value: e.target.value}})}
                                className="bg-transparent text-xl font-bold text-[var(--text-primary)] focus:outline-none rounded-md px-1 -mx-1 flex-1 w-full"
                                autoFocus
                            />
                        ) : (
                            <h2 id="p-item-title" className="text-xl font-bold text-[var(--text-primary)] truncate">{item.title}</h2>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {isEditing ? (
                            <button onClick={handleSave} className="flex items-center gap-1.5 text-sm bg-[var(--success)]/20 text-[var(--success)] font-semibold px-3 py-1.5 rounded-lg">
                                <CheckCircleIcon className="w-5 h-5"/> <span>שמור</span>
                            </button>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="text-[var(--text-secondary)] hover:text-white transition-colors p-2 rounded-full active:scale-95">
                                <EditIcon className="w-5 h-5"/>
                            </button>
                        )}
                        <button onClick={handleToggleImportant} className={`p-1 rounded-full transition-colors active:scale-95 ${item.isImportant ? 'text-yellow-400' : 'text-[var(--text-secondary)] hover:text-yellow-400'}`}>
                            <StarIcon filled={!!item.isImportant} className="h-6 w-6" />
                        </button>
                        {!isEditing && (
                            <button onClick={handleDelete} className="text-[var(--text-secondary)] hover:text-red-400 transition-colors p-2 rounded-full active:scale-95">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        )}
                        <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 rounded-full active:scale-95">
                            <CloseIcon className="h-6 w-6" />
                        </button>
                    </div>
                </header>

                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    {isEditing && (
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="spaceId" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">מרחב</label>
                                <select id="spaceId" value={editState.spaceId} onChange={(e) => dispatch({type:'SET_FIELD', payload: {field: 'spaceId', value: e.target.value}})} className={inputStyles}>
                                    <option value="">ללא</option>
                                    {personalSpaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="projectId" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">פרויקט</label>
                                <select id="projectId" value={editState.projectId} onChange={(e) => dispatch({type:'SET_FIELD', payload: {field: 'projectId', value: e.target.value}})} className={inputStyles}>
                                    <option value="">ללא</option>
                                    {projects.filter(p => p.id !== item.id).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                    
                    {isEditing ? renderEditContent() : renderViewContent()}

                    {isEditing ? (
                        <AttachmentManager attachments={editState.attachments} onAttachmentsChange={(atts) => dispatch({type: 'SET_FIELD', payload: { field: 'attachments', value: atts}})} />
                    ) : (
                       renderAttachmentsView()
                    )}

                    {(isLoadingRelated || relatedItems.length > 0) && (
                        <div className="border-t border-[var(--border-primary)] pt-6 mt-6">
                            <h3 className="text-sm font-semibold text-[var(--accent-highlight)] mb-3 uppercase tracking-wider">פריטים קשורים</h3>
                            {isLoadingRelated ? (
                                <p className="text-sm text-[var(--text-secondary)]">AI מחפש חיבורים...</p>
                            ) : (
                                <div className="space-y-2">
                                    {relatedItems.map(related => (
                                    <button key={related.id} onClick={() => onClose(related)} className="w-full text-right bg-[var(--bg-card)] hover:bg-white/5 p-3 rounded-xl transition-colors border border-[var(--border-primary)] hover:border-[var(--dynamic-accent-start)]/50 active:scale-95">
                                        <p className="font-semibold text-[var(--text-primary)] truncate">{related.title}</p>
                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{related.content.split('\n')[0]}</p>
                                    </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {contextItems && (
                     <footer className="p-2 border-t border-[var(--border-primary)] sticky bottom-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm flex justify-between">
                        <button onClick={() => onClose(prevItem!)} disabled={!prevItem} className="p-2 rounded-full text-white disabled:text-gray-600">
                           <ChevronLeftIcon className="w-6 h-6 transform rotate-180" />
                        </button>
                        <button onClick={() => onClose(nextItem!)} disabled={!nextItem} className="p-2 rounded-full text-white disabled:text-gray-600">
                           <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default PersonalItemDetailModal;