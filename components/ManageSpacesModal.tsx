import React, { useState, useEffect, useContext } from 'react';
import type { RssFeed, Space } from '../types';
import { getIconForName } from './IconMap';
import * as dataService from '../services/dataService';
import { TrashIcon, CloseIcon, AddIcon, EditIcon } from './icons';
import { AVAILABLE_ICONS } from '../constants';
import { AppContext } from '../state/AppContext';
import StatusMessage, { StatusMessageType } from './StatusMessage';
import { useHaptics } from '../hooks/useHaptics';


// --- Helper Components ---

const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent-start)]/50 focus:border-[var(--accent-start)] transition-shadow";
const buttonStyles = "bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-5 rounded-lg disabled:opacity-50 transition-transform transform active:scale-95";

const IconPicker: React.FC<{ selected: string; onSelect: (icon: string) => void }> = ({ selected, onSelect }) => (
    <div className="grid grid-cols-6 gap-2">
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

// --- Main Modal ---

interface ManageSpacesModalProps {
  onClose: () => void;
}

const ManageSpacesModal: React.FC<ManageSpacesModalProps> = ({ onClose }) => {
    const { state, dispatch } = useContext(AppContext);
    const [isClosing, setIsClosing] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'feed'>('personal');
    const { triggerHaptic } = useHaptics();
    
    // State for editing/creating a space
    const [editingSpace, setEditingSpace] = useState<Partial<Space> | null>(null);
    const [feeds, setFeeds] = useState<RssFeed[]>([]);
    const [status, setStatus] = useState<{type: StatusMessageType, text: string, id: number, onUndo?: () => void} | null>(null);
    
    const showStatus = (type: StatusMessageType, text: string, onUndo?: () => void) => {
        setStatus({ type, text, id: Date.now(), onUndo });
    };

    useEffect(() => {
        const fetchFeeds = async () => {
            const fetchedFeeds = await dataService.getFeeds();
            setFeeds(fetchedFeeds);
        };
        fetchFeeds();
    }, []);

    const feedSpaces = state.spaces.filter(s => s.type === 'feed');

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400);
    };

    const handleSaveSpace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSpace || !editingSpace.name) return;

        if (editingSpace.id) { // Update existing
            const updatedSpace = await dataService.updateSpace(editingSpace.id, editingSpace);
            dispatch({ type: 'UPDATE_SPACE', payload: { id: updatedSpace.id, updates: updatedSpace }});
        } else { // Create new
            const newSpaceData = {
                name: editingSpace.name,
                icon: editingSpace.icon || 'sparkles',
                color: editingSpace.color || '#A78BFA',
                type: activeTab,
                order: state.spaces.filter(s => s.type === activeTab).length,
            };
            const newSpace = await dataService.addSpace(newSpaceData);
            dispatch({ type: 'ADD_SPACE', payload: newSpace });
        }
        setEditingSpace(null);
    };
    
    const handleDeleteSpace = async (id: string) => {
        const spaceToDelete = state.spaces.find(s => s.id === id);
        if (!spaceToDelete) return;
        
        triggerHaptic('medium');
        
        await dataService.removeSpace(id);
        dispatch({ type: 'REMOVE_SPACE', payload: id });

        showStatus('success', 'המרחב נמחק.', async () => {
            await dataService.reAddSpace(spaceToDelete);
            dispatch({ type: 'ADD_SPACE', payload: spaceToDelete });
        });
    }
    
    const handleUpdateFeedSpace = (feedId: string, spaceId: string | undefined) => {
        dataService.updateFeed(feedId, { spaceId });
        setFeeds(currentFeeds => currentFeeds.map(f => f.id === feedId ? {...f, spaceId} : f));
    };

    const handleAddNewFeed = async () => {
        const url = prompt("הזן את כתובת ה-URL של פיד ה-RSS:");
        if (url) {
            try {
                const newFeed = await dataService.addFeed(url);
                setFeeds(currentFeeds => [...currentFeeds, newFeed]);
            } catch (error: any) {
                alert(`שגיאה בהוספת פיד: ${error.message}`);
            }
        }
    };

    const handleDeleteFeed = async (id: string) => {
        const feedToDelete = feeds.find(f => f.id === id);
        if(!feedToDelete) return;

        triggerHaptic('medium');

        await dataService.removeFeed(id);
        setFeeds(currentFeeds => currentFeeds.filter(f => f.id !== id));

        showStatus('success', 'הפיד נמחק.', async () => {
            await dataService.reAddFeed(feedToDelete);
            setFeeds(currentFeeds => [...currentFeeds, feedToDelete]);
        });
    };
    
    const displayedSpaces = state.spaces.filter(s => s.type === activeTab);

    return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={handleClose}>
        <div 
            className={`bg-[var(--bg-secondary)] w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
            onClick={(e) => e.stopPropagation()}
        >
            <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm z-10 rounded-t-3xl">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">ניהול מרחבים ופידים</h2>
                <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 rounded-full active:scale-95">
                    <CloseIcon className="h-6 w-6" />
                </button>
            </header>
            
            <div className="border-b border-[var(--border-primary)] px-4">
                <div className="flex gap-4">
                     <button onClick={() => setActiveTab('personal')} className={`py-3 font-semibold transition-colors ${activeTab === 'personal' ? 'text-[var(--accent-highlight)] border-b-2 border-[var(--accent-highlight)]' : 'text-[var(--text-secondary)] hover:text-white'}`}>מרחבים אישיים</button>
                     <button onClick={() => setActiveTab('feed')} className={`py-3 font-semibold transition-colors ${activeTab === 'feed' ? 'text-[var(--accent-highlight)] border-b-2 border-[var(--accent-highlight)]' : 'text-[var(--text-secondary)] hover:text-white'}`}>מרחבי פיד ו-RSS</button>
                </div>
            </div>

            <div className="p-4 overflow-y-auto flex-grow">
                {editingSpace ? (
                     <form onSubmit={handleSaveSpace} className="p-4 bg-[var(--bg-card)] rounded-xl space-y-4">
                        <h3 className="font-semibold text-lg">{editingSpace.id ? 'עריכת מרחב' : 'מרחב חדש'}</h3>
                        <div>
                            <label htmlFor="spaceName" className="text-sm font-medium text-[var(--text-secondary)] mb-1 block">שם</label>
                            <input id="spaceName" type="text" value={editingSpace.name || ''} onChange={e => setEditingSpace(s => ({...s, name: e.target.value}))} className={inputStyles} required />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1 block">אייקון</label>
                            <IconPicker selected={editingSpace.icon || 'sparkles'} onSelect={icon => setEditingSpace(s => ({...s, icon}))} />
                        </div>
                        <div>
                            <label htmlFor="spaceColor" className="text-sm font-medium text-[var(--text-secondary)] mb-1 block">צבע</label>
                            <input id="spaceColor" type="color" value={editingSpace.color || '#A78BFA'} onChange={e => setEditingSpace(s => ({...s, color: e.target.value}))} className="w-full h-10 p-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-primary)] cursor-pointer" />
                        </div>
                         <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setEditingSpace(null)} className="flex-1 bg-[var(--bg-secondary)] text-white font-bold py-2 rounded-lg">ביטול</button>
                            <button type="submit" className="flex-1 bg-[var(--accent-gradient)] text-white font-bold py-2 rounded-lg">שמור</button>
                        </div>
                    </form>
                ) : (
                    <>
                    <div className="space-y-3">
                        {displayedSpaces.map(space => (
                            <div key={space.id} className="group flex items-center justify-between bg-[var(--bg-card)] p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: `${space.color}20`, color: space.color}}>
                                        {React.createElement(getIconForName(space.icon), { className: 'w-5 h-5' })}
                                    </div>
                                    <p className="font-medium text-[var(--text-primary)]">{space.name}</p>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingSpace(space)} className="text-[var(--text-secondary)] hover:text-[var(--accent-highlight)] p-2"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDeleteSpace(space.id)} className="text-[var(--text-secondary)] hover:text-[var(--danger)] p-2"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setEditingSpace({type: activeTab})} className="w-full mt-4 flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-white font-semibold py-3 px-4 rounded-xl hover:border-[var(--accent-start)] transition-colors">
                        <AddIcon className="h-5 h-5"/> הוסף מרחב
                    </button>
                    </>
                )}
                 {activeTab === 'feed' && !editingSpace && (
                    <div className="mt-6 pt-6 border-t border-[var(--border-primary)]">
                         <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">מקורות RSS</h3>
                         <div className="space-y-3">
                             {feeds.map(feed => (
                                 <div key={feed.id} className="group flex items-center justify-between bg-[var(--bg-card)] p-3 rounded-lg">
                                    <p className="font-medium text-[var(--text-primary)] truncate pr-2 flex-1">{feed.name}</p>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <select
                                            value={feed.spaceId || ''}
                                            onChange={(e) => handleUpdateFeedSpace(feed.id, e.target.value || undefined)}
                                            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md px-2 py-1 text-sm text-[var(--text-secondary)] max-w-[120px]"
                                        >
                                            <option value="">ללא שיוך</option>
                                            {feedSpaces.map(space => (
                                                <option key={space.id} value={space.id}>{space.name}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => handleDeleteFeed(feed.id)} className="text-[var(--text-secondary)] hover:text-[var(--danger)] p-2 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                             ))}
                         </div>
                         <button onClick={handleAddNewFeed} className="w-full mt-4 flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-white font-semibold py-3 px-4 rounded-xl hover:border-[var(--accent-start)] transition-colors">
                            <AddIcon className="h-5 h-5"/> הוסף פיד RSS
                        </button>
                    </div>
                 )}
            </div>
             {status && <StatusMessage key={status.id} type={status.type} message={status.text} onDismiss={() => setStatus(null)} onUndo={status.onUndo}/>}
        </div>
    </div>
    )
};

export default ManageSpacesModal;
