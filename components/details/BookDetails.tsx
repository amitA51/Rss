import React, { useState } from 'react';
import { ViewProps, EditProps, inputStyles } from './common';
import MarkdownRenderer from '../MarkdownRenderer';
import { TrashIcon } from '../icons';

export const BookView: React.FC<ViewProps> = ({ item, onUpdate }) => {
    const [currentPageInput, setCurrentPageInput] = useState(item.currentPage?.toString() || '');
    const [newQuote, setNewQuote] = useState('');

    const bookProgress = (item.totalPages && item.currentPage) ? Math.round((item.currentPage / item.totalPages) * 100) : 0;

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
                    <MarkdownRenderer content={item.content} />
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
};

export const BookEdit: React.FC<EditProps> = ({ editState, dispatch }) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-sm text-[var(--text-secondary)]">מחבר</label>
                <input 
                    type="text" 
                    value={editState.author} 
                    onChange={e => dispatch({type:'SET_FIELD', payload: { field: 'author', value: e.target.value}})} 
                    className={inputStyles}
                />
            </div>
            <div>
                <label className="text-sm text-[var(--text-secondary)]">סה"כ עמודים</label>
                <input 
                    type="number" 
                    value={editState.totalPages} 
                    onChange={e => dispatch({type:'SET_FIELD', payload: { field: 'totalPages', value: e.target.value}})} 
                    className={inputStyles}
                />
            </div>
        </div>
    );
};
