import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { PasswordItem, EncryptedField } from '../../types';
import { AddIcon, LockIcon, CopyIcon, EditIcon, TrashIcon, EyeIcon, EyeOffIcon, SettingsIcon, SearchIcon, ShieldExclamationIcon } from '../icons';
import ItemFormModal from './ItemFormModal';
import * as passwordStore from '../../services/passwordStore';
import * as cryptoService from '../../services/cryptoService';
import SettingsModal from './SettingsModal';
import SiteIcon from './SiteIcon';
import StatusMessage, { StatusMessageType } from '../StatusMessage';
import { getTagColor } from '../icons';
import LoadingSpinner from '../LoadingSpinner';

const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow";

interface SessionKeys {
    main: CryptoKey;
    sensitive: CryptoKey;
}

interface VaultScreenProps {
    items: PasswordItem[];
    sessionKeys: SessionKeys;
    onLock: () => void;
    onUpdate: (items: PasswordItem[]) => void;
    onVaultDeleted: () => void;
}

const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
    if (!query || !text) return <>{text}</>;
    const escapedQuery = escapeRegExp(query);
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded-sm">{part}</mark>
                ) : (
                    part
                )
            )}
        </>
    );
};

const getTagStripeColor = (tags?: string[]): string => {
    if (!tags || tags.length === 0) return 'transparent';
    const tagPriority: Record<string, string> = {
        'פיננסי': '#10B981', // Emerald
        'עבודה': '#3B82F6',   // Blue
        'אישי': '#8B5CF6',    // Violet
        'רשת חברתית': '#EC4899', // Pink
    };
    for (const tag of tags) {
        if (tagPriority[tag]) {
            return tagPriority[tag];
        }
    }
    return 'transparent';
};

const VaultScreen: React.FC<VaultScreenProps> = ({ items, sessionKeys, onLock, onUpdate, onVaultDeleted }) => {
    const [editingItem, setEditingItem] = useState<PasswordItem | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [visiblePasswordId, setVisiblePasswordId] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{type: StatusMessageType, text: string, id: number, onUndo?: () => Promise<void> | void} | null>(null);
    const [isLocking, setIsLocking] = useState(false);
    const [pwnedStatus, setPwnedStatus] = useState<Record<string, 'checking' | 'pwned' | 'safe'>>({});

    useEffect(() => {
        const checkAllPasswords = async () => {
            const initialStatus: Record<string, 'checking' | 'pwned' | 'safe'> = {};
            items.forEach(item => {
                initialStatus[item.id] = 'checking';
            });
            setPwnedStatus(initialStatus);

            const checkPromises = items.map(async (item) => {
                const isPwned = await cryptoService.checkPwnedPassword(item.password as string);
                return { id: item.id, status: isPwned ? 'pwned' : 'safe' };
            });

            const results = await Promise.all(checkPromises);
            
            setPwnedStatus(prev => {
                const newStatus = {...prev};
                results.forEach(result => {
                    newStatus[result.id] = result.status;
                });
                return newStatus;
            });
        };

        if (items.length > 0) {
            checkAllPasswords();
        }
    }, [items]);

    const showStatus = (type: StatusMessageType, text: string, onUndo?: () => Promise<void> | void) => {
        setStatusMessage({ type, text, id: Date.now(), onUndo });
    };

    const handleRecheckPassword = async (item: PasswordItem) => {
        setPwnedStatus(prev => ({ ...prev, [item.id]: 'checking' }));
        const isPwned = await cryptoService.checkPwnedPassword(item.password as string);
        // FIX: Explicitly typing `status` prevents TypeScript from incorrectly widening the type to `string`, which resolves the type error.
        const status: 'pwned' | 'safe' = isPwned ? 'pwned' : 'safe';
        setPwnedStatus(prev => ({ ...prev, [item.id]: status }));
        showStatus(isPwned ? 'error' : 'success', isPwned ? 'סיסמה זו נמצאה בדליפת מידע!' : 'סיסמה זו נראית בטוחה.');
    };

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        items.forEach(item => {
            (item.tags || []).forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }, [items]);

    const filteredItems = useMemo(() => {
        let sorted = items.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        
        if (activeTag) {
            sorted = sorted.filter(item => item.tags?.includes(activeTag));
        }

        if (!searchQuery.trim()) {
            return sorted;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return sorted.filter(item => 
            item.site.toLowerCase().includes(lowerCaseQuery) ||
            item.username.toLowerCase().includes(lowerCaseQuery) ||
            item.notes?.toLowerCase().includes(lowerCaseQuery) ||
            item.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
        );
    }, [items, searchQuery, activeTag]);

    const saveItems = useCallback(async (updatedItems: PasswordItem[]) => {
        const vault = await passwordStore.loadVault();
        if (!vault) return; 

        // Double-encrypt sensitive items before main encryption
        const itemsToStore = await Promise.all(updatedItems.map(async (item) => {
            if (item.isSensitive && typeof item.password === 'string') {
                const encryptedPassword = await cryptoService.encryptString(item.password, sessionKeys.sensitive);
                return { ...item, password: encryptedPassword };
            }
            return item;
        }));

        const encrypted = await cryptoService.encryptString(JSON.stringify(itemsToStore), sessionKeys.main);
        
        await passwordStore.saveVault({
            ...vault,
            iv: encrypted.iv,
            data: encrypted.data,
        });
        
        // Update in-memory state with non-encrypted passwords
        onUpdate(updatedItems);
    }, [sessionKeys, onUpdate]);


    const handleSaveItem = async (itemToSave: PasswordItem) => {
        let updatedItems;
        const passwordAsString = itemToSave.password as string;

        if (itemToSave.id && itemToSave.id.startsWith('cred-')) { // Editing existing
            updatedItems = items.map(item => item.id === itemToSave.id ? {...itemToSave, password: passwordAsString} : item);
        } else { // Creating new
            updatedItems = [{ ...itemToSave, password: passwordAsString, id: `cred-${Date.now()}`, createdAt: new Date().toISOString() }, ...items];
        }
        await saveItems(updatedItems);
        setEditingItem(null);
        setIsCreating(false);
    };

    const handleDeleteItem = async (id: string) => {
        const itemToDelete = items.find(item => item.id === id);
        if (!itemToDelete) return;
        
        const updatedItems = items.filter(item => item.id !== id);
        await saveItems(updatedItems); 

        showStatus('success', 'הפריט נמחק.', async () => {
            await saveItems(items); // Restore original items
        });
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const togglePasswordVisibility = (id: string) => {
        setVisiblePasswordId(prev => {
            if (prev === id) {
                return null;
            }
            setTimeout(() => {
                setVisiblePasswordId(currentId => (currentId === id ? null : currentId));
            }, 5000);
            return id;
        });
    };

    const handleLock = () => {
        setIsLocking(true);
        setTimeout(onLock, 300); // Allow animation to play
    };

    return (
        <div className="animate-screen-enter">
            <header className="flex justify-between items-center mb-4">
                <h1 className="hero-title themed-title">הכספת</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors">
                        <SettingsIcon className="w-6 h-6"/>
                    </button>
                    <button onClick={handleLock} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-white transition-colors">
                        <LockIcon className={`w-6 h-6 transition-transform duration-300 ${isLocking ? 'rotate-180' : ''}`}/>
                    </button>
                </div>
            </header>

            <div className="sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md z-10 py-3 -mx-4 px-4">
                 <div className="mb-4 relative">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <SearchIcon className="h-5 h-5 text-[var(--text-secondary)]" />
                    </div>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`חפש ב-${items.length} פריטים...`}
                        className={`${inputStyles} pr-11`}
                    />
                </div>
                
                {allTags.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2" style={{'scrollbarWidth': 'none'}}>
                        <button onClick={() => setActiveTag(null)} className={`px-3 py-1 text-sm rounded-full transition-colors shrink-0 ${!activeTag ? 'bg-[var(--accent-gradient)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>הכל</button>
                        {allTags.map(tag => (
                            <button key={tag} onClick={() => setActiveTag(tag)} className={`px-3 py-1 text-sm rounded-full transition-colors shrink-0 ${activeTag === tag ? 'bg-[var(--accent-gradient)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>{tag}</button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)] text-white font-semibold py-3 px-4 rounded-xl hover:border-[var(--accent-start)] transition-colors my-6"
            >
                <AddIcon className="h-5 h-5"/> הוסף פריט חדש
            </button>
            
            <div className="space-y-3">
                {filteredItems.map((item, index) => {
                    const status = pwnedStatus[item.id];
                    return (
                        <div key={item.id} className={`themed-card p-4 animate-item-enter-fi border-l-4`} style={{ animationDelay: `${index * 25}ms`, borderLeftColor: getTagStripeColor(item.tags) }}>
                            <div className="flex justify-between items-start gap-3">
                               <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <SiteIcon site={item.site} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg text-[var(--text-primary)] truncate">
                                                <Highlight text={item.site} query={searchQuery} />
                                            </h3>
                                            {/* FIX: Removed span and passed title prop directly to the icon for accessibility. */}
                                            {item.isSensitive && <ShieldExclamationIcon title="פריט רגיש" className="w-5 h-5 text-yellow-400 shrink-0"/>}
                                            {status === 'pwned' && (
                                                <button onClick={() => handleRecheckPassword(item)} title="סיסמה זו נמצאה בדליפת מידע! לחץ לבדיקה חוזרת">
                                                    <ShieldExclamationIcon title="סיסמה זו נמצאה בדליפת מידע!" className="w-5 h-5 text-red-400"/>
                                                </button>
                                            )}
                                            {status === 'checking' && <LoadingSpinner className="w-4 h-4"/>}
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] truncate">
                                            <Highlight text={item.username} query={searchQuery} />
                                        </p>
                                    </div>
                                </div>
                                 <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => setEditingItem(item)} className="p-2 text-[var(--text-secondary)] hover:text-white"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--danger)]"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-[var(--border-primary)] flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <input 
                                        type={visiblePasswordId === item.id ? 'text' : 'password'}
                                        value={item.password as string}
                                        readOnly
                                        className="bg-transparent font-mono text-sm w-full truncate"
                                    />
                                    <button onClick={() => togglePasswordVisibility(item.id)} className="text-[var(--text-secondary)] hover:text-white p-1">
                                        {visiblePasswordId === item.id ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                                <button onClick={() => handleCopy(item.password as string, item.id)} className="flex items-center gap-2 text-sm bg-[var(--bg-secondary)] px-3 py-1.5 rounded-lg text-[var(--accent-highlight)] hover:brightness-125">
                                    {copiedId === item.id ? 'הועתק!' : 'העתק'}
                                    <CopyIcon className="w-4 h-4"/>
                                </button>
                            </div>
                            {item.notes && <p className="text-xs text-gray-400 mt-2 italic break-words">"<Highlight text={item.notes} query={searchQuery}/>"</p>}
                            {(item.tags && item.tags.length > 0 || item.updatedAt) && (
                                <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.tags?.map(tag => {
                                             const colors = getTagColor(tag);
                                             return <span key={tag} style={{ backgroundColor: colors.backgroundColor, color: colors.textColor }} className="px-1.5 py-0.5 rounded-full text-[10px]"><Highlight text={tag} query={searchQuery} /></span>
                                        })}
                                    </div>
                                    <span>עודכן: {new Date(item.updatedAt).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {(isCreating || editingItem) && (
                <ItemFormModal
                    item={editingItem}
                    onClose={() => { setEditingItem(null); setIsCreating(false); }}
                    onSave={handleSaveItem}
                />
            )}
            
            {isSettingsOpen && (
                <SettingsModal
                    onClose={() => setIsSettingsOpen(false)}
                    sessionKey={sessionKeys.main}
                    onVaultDeleted={onVaultDeleted}
                />
            )}

            {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
        </div>
    );
};

export default VaultScreen;