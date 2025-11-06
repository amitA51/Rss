import React, { useState, useRef } from 'react';
import { ViewProps, EditProps } from './common';
import { RoadmapStep, SubTask } from '../../types';
import { DragHandleIcon, AddIcon } from '../icons';
import MarkdownRenderer from '../MarkdownRenderer';

export const RoadmapView: React.FC<ViewProps> = ({ item, onUpdate }) => {
    const [expandedSteps, setExpandedSteps] = useState<string[]>([]);
    const [newSubTaskTitles, setNewSubTaskTitles] = useState<Record<string, string>>({});

    const totalSteps = item.steps?.length || 0;
    const completedSteps = item.steps?.filter(s => s.isCompleted).length || 0;
    const roadmapProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    
    const handleToggleRoadmapStep = (stepId: string) => {
        const newSteps = item.steps?.map(step =>
            step.id === stepId ? { ...step, isCompleted: !step.isCompleted } : step
        );
        onUpdate(item.id, { steps: newSteps });
    };

    const handleAddRoadmapSubTask = (stepId: string) => {
        const title = newSubTaskTitles[stepId];
        if (!title || !title.trim() || !item.steps) return;
        const newSteps = item.steps.map(step => {
            if (step.id === stepId) {
                const newSubTask: SubTask = { id: `sub-${Date.now()}`, title: title.trim(), isCompleted: false };
                return { ...step, subTasks: [...(step.subTasks || []), newSubTask] };
            }
            return step;
        });
        onUpdate(item.id, { steps: newSteps });
        setNewSubTaskTitles(prev => ({ ...prev, [stepId]: '' }));
    };

    const handleToggleRoadmapSubTask = (stepId: string, subTaskId: string) => {
        const newSteps = item.steps?.map(step => {
            if (step.id === stepId) {
                return { ...step, subTasks: step.subTasks?.map(st => st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st) };
            }
            return step;
        });
        onUpdate(item.id, { steps: newSteps });
    };

    return (
        <div className="space-y-6">
            {item.content && <MarkdownRenderer content={item.content} />}
            <div>
                <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">התקדמות</h4>
                <div className="w-full bg-[var(--bg-card)] rounded-full h-2.5 border border-[var(--border-primary)]">
                    <div className="bg-[var(--accent-gradient)] h-2 rounded-full transition-all" style={{width: `${roadmapProgress}%`}}></div>
                </div>
            </div>
            <div className="space-y-3">
                {item.steps?.map((step) => {
                    const stepSubTasks = step.subTasks || [];
                    const completedSubTasks = stepSubTasks.filter(st => st.isCompleted).length;
                    return (
                        <div key={step.id} className={`p-3 rounded-xl border border-[var(--border-primary)] transition-all ${step.isCompleted ? 'opacity-50' : ''}`}>
                            <div className="flex items-start gap-3">
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
                    )
                })}
            </div>
        </div>
    );
};

export const RoadmapEdit: React.FC<EditProps> = ({ editState, dispatch }) => {
    // Implement drag-and-drop for steps in edit mode
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDrop = () => {
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const newSteps = [...(editState.steps || [])];
            const dragItemContent = newSteps[dragItem.current];
            newSteps.splice(dragItem.current, 1);
            newSteps.splice(dragOverItem.current, 0, dragItemContent);
            {/* FIX: Corrected dispatch call to match reducer action shape. */}
            dispatch({ type: 'SET_FIELD', field: 'steps', value: newSteps });
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };
    
    return (
        <div>
            {editState.steps.map((step, index) => (
                <div
                    key={step.id}
                    className="p-3 mb-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] cursor-grab"
                    draggable
                    onDragStart={() => dragItem.current = index}
                    onDragEnter={() => dragOverItem.current = index}
                    onDragEnd={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                >
                   <DragHandleIcon className="w-5 h-5 text-gray-500" />
                   {/* Implement inputs for step editing here */}
                </div>
            ))}
        </div>
    )
};