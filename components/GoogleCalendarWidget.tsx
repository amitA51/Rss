import React, { useContext } from 'react';
import { AppContext } from '../state/AppContext';
import { GoogleCalendarIcon, LinkIcon } from './icons';
import type { GoogleCalendarEvent } from '../types';

const formatEventTime = (dateTime?: string) => {
    if (!dateTime) return 'All day';
    return new Date(dateTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
};

interface GoogleCalendarWidgetProps {
    events?: GoogleCalendarEvent[];
}

const GoogleCalendarWidget: React.FC<GoogleCalendarWidgetProps> = ({ events: propEvents }) => {
    const { state } = useContext(AppContext);
    const { googleAuthState } = state;
    
    const eventsToDisplay = propEvents !== undefined ? propEvents : state.calendarEvents;

    if (googleAuthState === 'loading') {
        return (
             <div className="themed-card p-4 space-y-2">
                 <div className="h-4 w-3/4 bg-[var(--bg-secondary)] rounded animate-pulse"></div>
                 <div className="h-4 w-1/2 bg-[var(--bg-secondary)] rounded animate-pulse"></div>
             </div>
        );
    }
    
    if (eventsToDisplay.length === 0) {
        return (
             <div className="themed-card p-4 text-center">
                <p className="text-sm text-[var(--text-secondary)]">אין פגישות.</p>
             </div>
        )
    }

    return (
        <div className="themed-card p-4 space-y-3">
            {eventsToDisplay.map((event, index) => (
                <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" key={index} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                     <div className="flex flex-col items-center w-12 shrink-0">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{formatEventTime(event.start?.dateTime)}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{formatEventTime(event.end?.dateTime)}</span>
                    </div>
                    <div className="w-px h-8 bg-[var(--border-primary)]"></div>
                    <p className="flex-1 text-[var(--text-primary)] font-medium truncate group-hover:text-[var(--dynamic-accent-highlight)] transition-colors">{event.summary}</p>
                </a>
            ))}
        </div>
    );
};

export default GoogleCalendarWidget;
