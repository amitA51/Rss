import React, { useRef } from 'react';
import { ViewProps, EditProps, MarkdownToolbar } from './common';
import MarkdownRenderer from '../MarkdownRenderer';

export const GenericView: React.FC<ViewProps> = ({ item }) => {
    if (!item.content) return null;
    return <MarkdownRenderer content={item.content} />;
};

export const GenericEdit: React.FC<EditProps> = ({ editState, dispatch }) => {
    const contentRef = useRef<HTMLTextAreaElement>(null);

    const handleInsertMarkdown = (startSyntax: string, endSyntax = '') => {
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
        
        dispatch({type: 'SET_FIELD', payload: { field: 'content', value: newText }});
        
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = selectionStart;
            textarea.selectionEnd = selectionEnd;
        }, 0);
    };

    return (
        <div className="border border-[var(--border-primary)] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[var(--dynamic-accent-start)]/50 focus-within:border-[var(--dynamic-accent-start)]">
            <MarkdownToolbar onInsert={handleInsertMarkdown} />
            <textarea
                ref={contentRef}
                dir="auto"
                value={editState.content}
                onChange={e => dispatch({type: 'SET_FIELD', payload: { field: 'content', value: e.target.value }})}
                rows={10}
                className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] p-3 focus:outline-none"
            />
        </div>
    );
};
