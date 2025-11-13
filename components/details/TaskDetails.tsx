import React, { useState, useRef } from 'react';
import { ViewProps, EditProps, inputStyles } from './common';
import { TrashIcon, AddIcon, DragHandleIcon } from '../icons';

export const TaskView: React.FC<ViewProps> = ({ item, onUpdate }) => {
    const [newSubTask, setNewSubTask] = useState('');
    const subTaskDragItem = useRef<number | null>(null);
    const subTaskDragOverItem = useRef<number | null>(null);

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

    return (
        <div>
            <h4 className="text-sm font-semibold text-[var(--accent-highlight)] mb-2 uppercase tracking-wider">תת-משימות</h4>
            <div className="space-y-2">
                {item.subTasks?.map((st, index) => (
                    <div 
                        key={st.id} 
                        className="group flex items-center gap-2 bg-[var(--bg-card)] p-2 rounded-lg"
                        draggable
                        onDragStart={() => subTaskDragItem.current = index}
                        onDragEnter={() => subTaskDragOverItem.current = index}
                        onDragEnd={handleSubTaskDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <DragHandleIcon className="w-5 h-5 text-gray-600 cursor-grab" />
                        <input type="checkbox" checked={st.isCompleted} onChange={() => handleToggleSubTask(st.id)} className="h-5 w-5 rounded bg-black/30 border-gray-600 text-[var(--dynamic-accent-start)] focus:ring-[var(--dynamic-accent-start)] cursor-pointer" />
                        <span className={`flex-1 ${st.isCompleted ? 'line-through text-gray-500' : 'text-gray-200'}`}>{st.title}</span>
                        <button onClick={() => handleRemoveSubTask(st.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <input type="text" value={newSubTask} onChange={e => setNewSubTask(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddSubTask()} placeholder="הוסף תת-משימה..." className="flex-1 text-sm bg-transparent border-b border-[var(--border-primary)] focus:border-[var(--accent-start)] focus:outline-none py-1"/>
                    <button onClick={handleAddSubTask} className="text-[var(--accent-highlight)] p-1"><AddIcon className="w-5 h-5"/></button>
                </div>
            </div>
        </div>
    );
};

export const TaskEdit: React.FC<EditProps> = ({ editState, dispatch }) => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">תאריך יעד</label>
                <input 
                    type="date" 
                    id="dueDate" 
                    value={editState.dueDate} 
                    onChange={(e) => dispatch({type:'SET_FIELD', payload: { field: 'dueDate', value: e.target.value}})} 
                    className={inputStyles} 
                    style={{colorScheme: 'dark'}}
                />
            </div>
            <div>
                <label htmlFor="priority" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">עדיפות</label>
                <select 
                    id="priority" 
                    value={editState.priority} 
                    onChange={(e) => dispatch({type:'SET_FIELD', payload: { field: 'priority', value: e.target.value as any}})} 
                    className={inputStyles}
                >
                    <option value="low">נמוכה</option>
                    <option value="medium">בינונית</option>
                    <option value="high">גבוהה</option>
                </select>
            </div>
        </div>
        <div>
            <label htmlFor="autoDeleteAfter" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">מחיקה אוטומטית (לאחר השלמה)</label>
            <select 
                id="autoDeleteAfter" 
                value={editState.autoDeleteAfter || 0} 
                onChange={(e) => dispatch({type:'SET_FIELD', payload: { field: 'autoDeleteAfter', value: Number(e.target.value)}})} 
                className={inputStyles}
            >
                <option value={0}>לעולם לא</option>
                <option value={1}>לאחר יום אחד</option>
                <option value={7}>לאחר שבוע</option>
                <option value={30}>לאחר חודש</option>
            </select>
        </div>
    </div>
);
