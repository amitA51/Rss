import React, { useState, useEffect } from 'react';
import type { PasswordItem } from '../../types';
import { CloseIcon, EyeIcon, EyeOffIcon, RefreshIcon, CopyIcon, SparklesIcon } from '../icons';
import LoadingSpinner from '../LoadingSpinner';
import * as cryptoService from '../../services/cryptoService';
import * as geminiService from '../../services/geminiService';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import ToggleSwitch from '../ToggleSwitch';
import { useDebounce } from '../../hooks/useDebounce';


const inputStyles = "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow";
const buttonStyles = "w-full bg-[var(--accent-gradient)] hover:brightness-110 text-white font-bold py-3 px-4 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 h-12 flex items-center justify-center";

interface ItemFormModalProps {
    item: PasswordItem | null;
    onClose: () => void;
    onSave: (item: PasswordItem) => Promise<void>;
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({ item, onClose, onSave }) => {
    const [site, setSite] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState('');
    const [isSensitive, setIsSensitive] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // AI Tagging
    const debouncedSite = useDebounce(site, 500);
    const [isSuggestingTags, setIsSuggestingTags] = useState(false);

    // Password generator options
    const [passwordLength, setPasswordLength] = useState(18);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeLowercase, setIncludeLowercase] = useState(true);

    useEffect(() => {
        if (item) {
            setSite(item.site);
            setUsername(item.username);
            setPassword(item.password as string);
            setNotes(item.notes || '');
            setTags(item.tags?.join(', ') || '');
            setIsSensitive(item.isSensitive || false);
        }
    }, [item]);
    
    useEffect(() => {
        if (debouncedSite && !item && !isSuggestingTags) { // Only suggest for new items
            const suggest = async () => {
                setIsSuggestingTags(true);
                try {
                    const suggestedTags = await geminiService.suggestTagsForSite(debouncedSite);
                    if (suggestedTags.length > 0) {
                        setTags(currentTags => {
                           const existingTags = new Set(currentTags.split(',').map(t => t.trim()).filter(Boolean));
                           suggestedTags.forEach(t => existingTags.add(t));
                           return Array.from(existingTags).join(', ');
                        });
                    }
                } catch (e) {
                    console.error("Failed to suggest tags:", e);
                } finally {
                    setIsSuggestingTags(false);
                }
            };
            suggest();
        }
    }, [debouncedSite, item, isSuggestingTags]);


    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSave({
            ...(item || { id: '', createdAt: '', updatedAt: '' }),
            site,
            username,
            password,
            notes,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            isSensitive,
            updatedAt: new Date().toISOString(),
        });
        setIsSubmitting(false);
        handleClose();
    };

    const generateStrongPassword = () => {
        setPassword(cryptoService.generatePassword({
            length: passwordLength,
            numbers: includeNumbers,
            symbols: includeSymbols,
            uppercase: includeUppercase,
            lowercase: includeLowercase
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50" onClick={handleClose}>
            <div
                onClick={e => e.stopPropagation()}
                className={`bg-[var(--bg-card)] w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
            >
                <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">{item ? 'ערוך פריט' : 'הוסף פריט חדש'}</h2>
                    <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-white p-1 rounded-full">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
                    <input type="text" value={site} onChange={e => setSite(e.target.value)} placeholder="שם האתר או השירות" className={inputStyles} required autoFocus />
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="שם משתמש / אימייל" className={inputStyles} required />
                    
                    <div>
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="סיסמה" className={inputStyles} required />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button type="button" onClick={() => navigator.clipboard.writeText(password)} className="p-1 text-[var(--text-secondary)] hover:text-white"><CopyIcon className="w-5 h-5"/></button>
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 text-[var(--text-secondary)] hover:text-white">
                                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                         <PasswordStrengthMeter password={password} />
                        <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <label htmlFor="pass-length" className="text-sm text-[var(--text-secondary)]">אורך: {passwordLength}</label>
                                <input id="pass-length" type="range" min="8" max="32" value={passwordLength} onChange={e => setPasswordLength(parseInt(e.target.value, 10))} className="w-32"/>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                               <label className="flex items-center gap-2"><input type="checkbox" checked={includeLowercase} onChange={e => setIncludeLowercase(e.target.checked)} /> אותיות קטנות (a-z)</label>
                               <label className="flex items-center gap-2"><input type="checkbox" checked={includeUppercase} onChange={e => setIncludeUppercase(e.target.checked)} /> אותיות גדולות (A-Z)</label>
                               <label className="flex items-center gap-2"><input type="checkbox" checked={includeNumbers} onChange={e => setIncludeNumbers(e.target.checked)} /> מספרים (0-9)</label>
                               <label className="flex items-center gap-2"><input type="checkbox" checked={includeSymbols} onChange={e => setIncludeSymbols(e.target.checked)} /> סמלים (!@#)</label>
                            </div>
                            <button type="button" onClick={generateStrongPassword} className="w-full text-sm flex items-center justify-center gap-1 text-[var(--dynamic-accent-highlight)] bg-white/5 py-2 rounded-md">
                                <RefreshIcon className="w-4 h-4" /> צור סיסמה
                            </button>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="תגיות (מופרדות בפסיק)" className={inputStyles} />
                        {isSuggestingTags && <SparklesIcon className="w-4 h-4 text-yellow-400 absolute left-3 top-1/2 -translate-y-1/2 animate-pulse"/>}
                    </div>

                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות (אופציונלי)" rows={3} className={inputStyles} />
                    
                    <div className="flex justify-between items-center p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <label htmlFor="isSensitive" className="font-medium">סמן כפריט רגיש (הצפנה כפולה)</label>
                        <ToggleSwitch id="isSensitive" checked={isSensitive} onChange={setIsSensitive} />
                    </div>

                    <button type="submit" disabled={isSubmitting} className={buttonStyles}>
                        {isSubmitting ? <LoadingSpinner /> : 'שמור'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ItemFormModal;