import React from 'react';
import { ViewProps, EditProps, smallInputStyles } from './common';
import { TrashIcon, AddIcon } from '../icons';
import { Exercise, WorkoutSet } from '../../types';

export const WorkoutView: React.FC<ViewProps> = ({ item }) => (
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

export const WorkoutEdit: React.FC<EditProps> = ({ editState, dispatch }) => {
    
    const handleUpdateExercise = (exIndex: number, field: keyof Exercise, value: any) => {
        const newExercises = [...(editState.exercises || [])];
        (newExercises[exIndex] as any)[field] = value;
        dispatch({type:'SET_FIELD', payload: { field: 'exercises', value: newExercises }});
    };
    const handleAddExercise = () => {
        const newExercises = [...(editState.exercises || []), {id: `ex-${Date.now()}`, name: '', sets: [{reps:0, weight: 0}]}];
        dispatch({type:'SET_FIELD', payload: { field: 'exercises', value: newExercises }});
    };
    const handleRemoveExercise = (exIndex: number) => {
        const newExercises = (editState.exercises || []).filter((_, i) => i !== exIndex);
        dispatch({type:'SET_FIELD', payload: { field: 'exercises', value: newExercises }});
    };
    const handleUpdateSet = (exIndex: number, setIndex: number, field: keyof WorkoutSet, value: any) => {
        const newExercises = [...(editState.exercises || [])];
        (newExercises[exIndex].sets[setIndex] as any)[field] = value;
        dispatch({type:'SET_FIELD', payload: { field: 'exercises', value: newExercises }});
    };
    const handleAddSet = (exIndex: number) => {
        const newExercises = [...(editState.exercises || [])];
        newExercises[exIndex].sets.push({reps: 0, weight: 0});
        dispatch({type:'SET_FIELD', payload: { field: 'exercises', value: newExercises }});
    };
    const handleRemoveSet = (exIndex: number, setIndex: number) => {
        const newExercises = [...(editState.exercises || [])];
        newExercises[exIndex].sets = newExercises[exIndex].sets.filter((_, i) => i !== setIndex);
        dispatch({type:'SET_FIELD', payload: { field: 'exercises', value: newExercises }});
    };

    return (
        <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">תרגילים</label>
            <div className="space-y-4">
                {(editState.exercises || []).map((ex, exIndex) => (
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
    );
};
