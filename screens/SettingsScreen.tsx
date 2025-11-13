import React, { useState, useEffect, useRef, useContext } from 'react';
import type { AppSettings, Screen, HomeScreenComponentId, ThemeSettings, AppFont, CardStyle, Mentor, UiDensity, AnimationIntensity, AiFeedSettings, AddableType, PomodoroSettings, AiPersonality, FeedViewMode } from '../types';
import { saveSettings, loadSettings } from '../services/settingsService';
import * as dataService from '../services/dataService';
import * as googleCalendarService from '../services/googleCalendarService';
import * as notifications from '../services/notificationsService';
import { 
    DatabaseIcon, DownloadIcon, UploadIcon, WarningIcon, FeedIcon, 
    TemplateIcon, TrashIcon, FileIcon, TargetIcon, VisualModeIcon, CheckCircleIcon, 
    DragHandleIcon, LayoutDashboardIcon, PaletteIcon, SparklesIcon, BrainCircuitIcon, 
    RefreshIcon, AddIcon, StopwatchIcon, ChartBarIcon, SearchIcon, SettingsIcon, 
    GoogleCalendarIcon, LightbulbIcon, ClipboardListIcon, BookOpenIcon, DumbbellIcon, 
    UserIcon, RoadmapIcon, FlameIcon, LinkIcon, SummarizeIcon, CloseIcon, ListIcon, EditIcon
} from '../components/icons';
import ToggleSwitch from '../components/ToggleSwitch';
import ManageSpacesModal from '../components/ManageSpacesModal';
import { AppContext } from '../state/AppContext';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';
import * as geminiService from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';

type Status = {
  type: StatusMessageType;
  text: string;
  id: number;
  onUndo?: () => void;
} | null;

type SettingsSectionId = 'appearance' | 'ai' | 'integrations' | 'general' | 'data';

// --- Reusable Setting Components ---

const SettingsSection: React.FC<{title: string, children: React.ReactNode, id: string}> = ({ title, children, id }) => (
  <div className="space-y-6 animate-screen-enter" id={id}>
    <h2 className="text-2xl font-bold text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-3">{title}</h2>
    <div className="space-y-6">{children}</div>
  </div>
);

const SettingsCard: React.FC<{ title: string; children: React.ReactNode; danger?: boolean }> = ({ title, children, danger }) => (
  <div className={`themed-card p-4 sm:p-6 ${danger ? 'border-l-4 border-red-500/50' : ''}`}>
    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const SettingsRow: React.FC<{ title: string; description: string; children: React.ReactNode; }> = ({ title, description, children }) => (
  <div className="flex flex-col sm:flex-row justify-between gap-4 border-t border-[var(--border-primary)] pt-4 first:border-t-0 first:pt-0">
    <div className="flex-1">
      <p className="font-medium text-[var(--text-primary)]">{title}</p>
      <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
    </div>
    <div className="flex-shrink-0 flex items-center justify-end">{children}</div>
  </div>
);

const SegmentedControl: React.FC<{
    options: { label: string, value: string, icon?: React.ReactNode }[];
    value: string;
    onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
    <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-full">
        {options.map(opt => (
            <button 
                key={opt.value}
                onClick={() => onChange(opt.value)} 
                className={`flex-1 px-3 py-1.5 text-sm rounded-full flex items-center justify-center gap-1.5 font-medium transition-all ${
                    value === opt.value ? 'bg-[var(--accent-gradient)] text-black shadow-[0_0_10px_var(--dynamic-accent-glow)]' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
            >
                {opt.icon} {opt.label}
            </button>
        ))}
    </div>
);

const ThemePreviewCard: React.FC<{
    theme: ThemeSettings;
    isSelected: boolean;
    onClick: () => void;
}> = ({ theme, isSelected, onClick }) => {
    const cardStyleClass = `card-style-${theme.cardStyle}`;
    const getFontFamily = (font: AppFont) => {
        if (font === 'lato') return "'Lato', sans-serif";
        if (font === 'source-code-pro') return "'Source Code Pro', monospace";
        if (font === 'heebo') return "'Heebo', sans-serif";
        if (font === 'rubik') return "'Rubik', sans-serif";
        if (font === 'alef') return "'Alef', sans-serif";
        return "'Inter', sans-serif";
    }

    return (
        <button onClick={onClick} className="text-center group w-full">
            <div 
                className={`relative w-full aspect-video rounded-xl transition-all duration-300 ring-2 ring-offset-2 ring-offset-[var(--bg-card)] overflow-hidden ${isSelected ? 'ring-[var(--dynamic-accent-start)] shadow-[0_0_15px_var(--dynamic-accent-glow)]' : 'ring-transparent'}`}
                style={{ backgroundColor: 'var(--bg-primary)', fontFamily: getFontFamily(theme.font) }}
            >
                <div className={`w-full h-full p-3 flex flex-col justify-end ${cardStyleClass}`}>
                    <div 
                        className="themed-card w-full h-1/2 p-2"
                        style={{
                            '--dynamic-accent-start': theme.accentColor, '--dynamic-accent-end': theme.accentColor,
                            '--dynamic-accent-glow': `${theme.accentColor}33`, '--border-primary': 'rgba(255, 255, 255, 0.1)',
                            '--bg-card': '#1F1B18', '--bg-secondary': '#1A1512'
                        } as React.CSSProperties}
                    >
                         <div className="w-3/4 h-2 rounded-sm" style={{ background: theme.accentColor }}></div>
                         <div className="w-1/2 h-2 rounded-sm mt-1.5" style={{ background: `rgba(255,255,255,0.2)` }}></div>
                    </div>
                </div>
            </div>
            <span className={`text-sm mt-2 font-medium transition-colors ${isSelected ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-white'}`}>{theme.name}</span>
        </button>
    );
};

const DraggableSettingItem: React.FC<{
    label: string; icon: React.ReactNode; onDragStart: () => void; onDragEnter: () => void;
    onDragEnd: () => void; isDragging: boolean;
}> = ({ label, icon, onDragStart, onDragEnter, onDragEnd, isDragging }) => (
    <div
        draggable onDragStart={onDragStart} onDragEnter={onDragEnter} onDragEnd={onDragEnd} onDragOver={(e) => e.preventDefault()}
        className={`group flex items-center justify-between bg-[var(--bg-secondary)] p-3 rounded-lg cursor-grab ${isDragging ? 'dragging-item' : ''}`}
    >
        <div className="flex items-center gap-3">
            <div className="text-[var(--text-secondary)]">{icon}</div>
            <p className="font-medium text-[var(--text-primary)]">{label}</p>
        </div>
        <DragHandleIcon className="w-5 h-5 text-[var(--text-secondary)] opacity-50 group-hover:opacity-100" />
    </div>
);

const EditableDraggableListItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    onLabelChange: (newLabel: string) => void;
    isDragging: boolean;
    onDragStart: () => void;
    onDragEnter: () => void;
    onDragEnd: () => void;
}> = ({ icon, label, onLabelChange, isDragging, onDragStart, onDragEnter, onDragEnd }) => {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnter={onDragEnter}
            onDragEnd={onDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`group flex items-center justify-between bg-[var(--bg-secondary)] p-2 rounded-lg cursor-grab ${isDragging ? 'dragging-item' : ''}`}
        >
            <div className="flex items-center gap-3 flex-grow">
                <div className="text-[var(--text-secondary)]">{icon}</div>
                <input 
                    type="text" 
                    value={label}
                    onChange={(e) => onLabelChange(e.target.value)}
                    className="font-medium text-[var(--text-primary)] bg-transparent focus:outline-none focus:bg-white/5 rounded px-2 py-1 w-full"
                />
            </div>
            <DragHandleIcon className="w-5 h-5 text-[var(--text-secondary)] opacity-50 group-hover:opacity-100" />
        </div>
    );
};

const THEMES: Record<string, ThemeSettings> = {
    gold: { name: 'Gold', accentColor: '#C67C3E', font: 'inter', cardStyle: 'glass', backgroundEffect: true },
    crimson: { name: 'Crimson', accentColor: '#DC2626', font: 'lato', cardStyle: 'bordered', backgroundEffect: false },
    emerald: { name: 'Emerald', accentColor: '#059669', font: 'inter', cardStyle: 'flat', backgroundEffect: true },
    nebula: { name: 'Nebula', accentColor: '#8B5CF6', font: 'source-code-pro', cardStyle: 'glass', backgroundEffect: true },
    oceanic: { name: 'Oceanic', accentColor: '#3B82F6', font: 'inter', cardStyle: 'flat', backgroundEffect: false },
};
const FONTS: { id: AppFont; name: string; class: string; family: string }[] = [
    { id: 'inter', name: 'Inter', class: 'font-inter', family: "'Inter', sans-serif" },
    { id: 'lato', name: 'Lato', class: 'font-lato', family: "'Lato', sans-serif" },
    { id: 'source-code-pro', name: 'Source Code Pro', class: 'font-source-code-pro', family: "'Source Code Pro', monospace" },
    { id: 'heebo', name: 'Heebo', class: 'font-heebo', family: "'Heebo', sans-serif" },
    { id: 'rubik', name: 'Rubik', class: 'font-rubik', family: "'Rubik', sans-serif" },
    { id: 'alef', name: 'Alef', class: 'font-alef', family: "'Alef', sans-serif" },
];
const allNavItemsMap: Record<Screen, { label: string; icon: React.ReactNode }> = {
    feed: { label: 'פיד', icon: <FeedIcon className="w-5 h-5"/> },
    today: { label: 'היום', icon: <TargetIcon className="w-5 h-5"/> },
    add: { label: 'הוספה', icon: <AddIcon className="w-5 h-5"/> },
    library: { label: 'המתכנן', icon: <LayoutDashboardIcon className="w-5 h-5"/> },
    investments: { label: 'השקעות', icon: <ChartBarIcon className="w-5 h-5"/> },
    search: { label: 'חיפוש', icon: <SearchIcon className="w-5 h-5"/> },
    settings: { label: 'הגדרות', icon: <SettingsIcon className="w-5 h-5"/> },
};
const allAddableItemsMap: Record<AddableType, { label: string; icon: React.ReactNode }> = {
    spark: { label: 'ספארק', icon: <SparklesIcon className="w-5 h-5"/> },
    idea: { label: 'רעיון', icon: <LightbulbIcon className="w-5 h-5"/> },
    note: { label: 'פתק', icon: <ClipboardListIcon className="w-5 h-5"/> },
    task: { label: 'משימה', icon: <CheckCircleIcon className="w-5 h-5"/> },
    link: { label: 'קישור', icon: <LinkIcon className="w-5 h-5"/> },
    learning: { label: 'למידה', icon: <SummarizeIcon className="w-5 h-5"/> },
    journal: { label: 'יומן', icon: <UserIcon className="w-5 h-5"/> },
    book: { label: 'ספר', icon: <BookOpenIcon className="w-5 h-5"/> },
    goal: { label: 'פרויקט', icon: <TargetIcon className="w-5 h-5"/> },
    workout: { label: 'אימון', icon: <DumbbellIcon className="w-5 h-5"/> },
    roadmap: { label: 'מפת דרכים', icon: <RoadmapIcon className="w-5 h-5"/> },
    ticker: { label: 'מניה / מטבע', icon: <ChartBarIcon className="w-5 h-5"/> },
    habit: { label: 'הרגל', icon: <FlameIcon className="w-5 h-5"/> },
    gratitude: { label: 'הכרת תודה', icon: <SparklesIcon className="w-5 h-5"/> },
};
const settingsSections: {id: SettingsSectionId, label: string, icon: React.ReactNode}[] = [
    { id: 'appearance', label: 'מראה ותצוגה', icon: <PaletteIcon className="w-5 h-5"/> },
    { id: 'ai', label: 'בינה מלאכותית', icon: <BrainCircuitIcon className="w-5 h-5"/> },
    { id: 'integrations', label: 'שילובים והתראות', icon: <SparklesIcon className="w-5 h-5"/> },
    { id: 'general', label: 'כללי', icon: <SettingsIcon className="w-5 h-5"/> },
    { id: 'data', label: 'ניהול נתונים', icon: <DatabaseIcon className="w-5 h-5"/> },
];
const homeScreenComponentNames: Record<HomeScreenComponentId, string> = { gratitude: 'הכרת תודה', habits: 'הרגלים', tasks: 'משימות', google_calendar: 'לוח שנה (Google)' };


const LayoutSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    handleSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
    initialTab?: 'today' | 'nav' | 'add';
}> = ({ isOpen, onClose, settings, handleSettingChange, initialTab }) => {
    const [isClosing, setIsClosing] = useState(false);
    const [activeTab, setActiveTab] = useState<'today' | 'nav' | 'add'>('today');

    // State for Layout dragging
    const dragItemRef = useRef<number | null>(null);
    const dragOverItemRef = useRef<number | null>(null);
    const [draggingLayout, setDraggingLayout] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const handleLayoutDrop = (layoutKey: 'homeScreenLayout' | 'navBarLayout' | 'addScreenLayout') => {
        if (dragItemRef.current !== null && dragOverItemRef.current !== null) {
            const currentLayout = [...(settings[layoutKey] || [])] as any[];
            const dragItemContent = currentLayout[dragItemRef.current];
            currentLayout.splice(dragItemRef.current, 1);
            currentLayout.splice(dragOverItemRef.current, 0, dragItemContent);
            handleSettingChange(layoutKey, currentLayout as any);
        }
        dragItemRef.current = null;
        dragOverItemRef.current = null;
        setDraggingLayout(null);
    };
    
    const handleLabelChange = (screen: Screen, newLabel: string) => handleSettingChange('screenLabels', { ...settings.screenLabels, [screen]: newLabel });
    const handleSectionLabelChange = (section: HomeScreenComponentId, newLabel: string) => handleSettingChange('sectionLabels', { ...settings.sectionLabels, [section]: newLabel });

    const allAddableTypes = Object.keys(allAddableItemsMap) as AddableType[];
    const visibleAddItems = settings.addScreenLayout;
    const hiddenAddItems = allAddableTypes.filter(type => !visibleAddItems.includes(type));

    const handleHideAddItem = (typeToHide: AddableType) => {
        handleSettingChange('addScreenLayout', settings.addScreenLayout.filter(t => t !== typeToHide));
    };
    const handleShowAddItem = (typeToShow: AddableType) => {
        handleSettingChange('addScreenLayout', [...settings.addScreenLayout, typeToShow]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50" onClick={handleClose}>
            <div
                onClick={e => e.stopPropagation()}
                className={`bg-[var(--bg-card)] w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] ${isClosing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
            >
                <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center">
                    <h2 className="text-xl font-bold">עריכת פריסות ותוויות</h2>
                    <button onClick={handleClose}><CloseIcon className="w-6 h-6"/></button>
                </header>
                <div className="border-b border-[var(--border-primary)] px-4">
                    <div className="flex gap-4">
                        <button onClick={() => setActiveTab('today')} className={`py-3 font-semibold ${activeTab === 'today' ? 'text-[var(--accent-highlight)] border-b-2 border-[var(--accent-highlight)]' : 'text-[var(--text-secondary)]'}`}>מסך היום</button>
                        <button onClick={() => setActiveTab('nav')} className={`py-3 font-semibold ${activeTab === 'nav' ? 'text-[var(--accent-highlight)] border-b-2 border-[var(--accent-highlight)]' : 'text-[var(--text-secondary)]'}`}>סרגל ניווט</button>
                        <button onClick={() => setActiveTab('add')} className={`py-3 font-semibold ${activeTab === 'add' ? 'text-[var(--accent-highlight)] border-b-2 border-[var(--accent-highlight)]' : 'text-[var(--text-secondary)]'}`}>מסך הוספה</button>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto space-y-4">
                    {activeTab === 'today' && <div className="space-y-2">{settings.homeScreenLayout.map((comp, index) => <EditableDraggableListItem key={comp.id} label={settings.sectionLabels[comp.id] || homeScreenComponentNames[comp.id]} onLabelChange={newLabel => handleSectionLabelChange(comp.id, newLabel)} icon={<LayoutDashboardIcon className="w-5 h-5"/>} isDragging={draggingLayout === `home-${index}`} onDragStart={() => { dragItemRef.current = index; setDraggingLayout(`home-${index}`);}} onDragEnter={() => dragOverItemRef.current = index} onDragEnd={() => handleLayoutDrop('homeScreenLayout')} />)}</div>}
                    {activeTab === 'nav' && <div className="space-y-2">{settings.navBarLayout.filter(id => id !== 'add').map((screenId, index) => <EditableDraggableListItem key={screenId} label={settings.screenLabels[screenId] || allNavItemsMap[screenId].label} icon={allNavItemsMap[screenId].icon} onLabelChange={newLabel => handleLabelChange(screenId, newLabel)} isDragging={draggingLayout === `nav-${index}`} onDragStart={() => { dragItemRef.current = index; setDraggingLayout(`nav-${index}`);}} onDragEnter={() => dragOverItemRef.current = index} onDragEnd={() => handleLayoutDrop('navBarLayout')} />)}</div>}
                    {activeTab === 'add' && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-2">פריטים גלויים</h4>
                                <div className="space-y-2" onDragEnd={() => handleLayoutDrop('addScreenLayout')}>
                                    {visibleAddItems.map((typeId, index) => {
                                        const item = allAddableItemsMap[typeId];
                                        return (
                                            <div key={typeId} className="flex items-center gap-2">
                                                <div className="flex-grow">
                                                    <DraggableSettingItem 
                                                        label={item.label} 
                                                        icon={item.icon} 
                                                        isDragging={draggingLayout === `add-${index}`} 
                                                        onDragStart={() => { dragItemRef.current = index; setDraggingLayout(`add-${index}`); }} 
                                                        onDragEnter={() => dragOverItemRef.current = index} 
                                                        onDragEnd={() => {}}
                                                    />
                                                </div>
                                                <button onClick={() => handleHideAddItem(typeId)} className="p-2 bg-[var(--bg-secondary)] rounded-lg text-red-400 hover:bg-red-500/20"><TrashIcon className="w-5 h-5"/></button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                             {hiddenAddItems.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-2">פריטים מוסתרים</h4>
                                    <div className="space-y-2">
                                        {hiddenAddItems.map(typeId => {
                                            const item = allAddableItemsMap[typeId];
                                            return (
                                                <div key={typeId} className="flex items-center gap-2">
                                                    <div className="flex-grow flex items-center bg-[var(--bg-secondary)] p-3 rounded-lg opacity-60">
                                                        <div className="text-[var(--text-secondary)] ml-3">{item.icon}</div>
                                                        <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
                                                    </div>
                                                    <button onClick={() => handleShowAddItem(typeId)} className="p-2 bg-[var(--bg-secondary)] rounded-lg text-green-400 hover:bg-green-500/20"><AddIcon className="w-5 h-5"/></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                             )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const SettingsScreen: React.FC<{ setActiveScreen: (screen: Screen) => void }> = ({ setActiveScreen }) => {
    const { state, dispatch } = useContext(AppContext);
    const { settings } = state;

    const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance');
    const [isManageSpacesOpen, setIsManageSpacesOpen] = useState(false);
    const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
    const [initialLayoutTab, setInitialLayoutTab] = useState<'today' | 'nav' | 'add' | undefined>();

    const [statusMessage, setStatusMessage] = useState<Status>(null);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    
    const [mentors, setMentors] = useState<Mentor[]>([]);
    const [isAddingMentor, setIsAddingMentor] = useState(false);
    const [newMentorName, setNewMentorName] = useState('');
    const [mentorLoadingStates, setMentorLoadingStates] = useState<Record<string, boolean>>({});
    const [isSuggestingTopics, setIsSuggestingTopics] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

     useEffect(() => {
        const deepLink = sessionStorage.getItem('settings_deep_link');
        if (deepLink === 'add-layout') {
            setInitialLayoutTab('add');
            setIsLayoutModalOpen(true);
            sessionStorage.removeItem('settings_deep_link');
        }
    }, []);

    useEffect(() => {
        const fetchMentors = async () => setMentors(await dataService.getMentors());
        fetchMentors();
    }, []);

    const showStatus = (type: StatusMessageType, text: string, onUndo?: () => void) => {
        setStatusMessage({ type, text, id: Date.now(), onUndo });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if(Notification.permission !== notificationPermission) setNotificationPermission(Notification.permission);
        }, 1000);
        return () => clearInterval(interval);
    }, [notificationPermission]);

    const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        saveSettings(newSettings);
        dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    };

    const handleNotificationToggle = async (enabled: boolean) => {
        handleSettingChange('notificationsEnabled', enabled);
        if (enabled && notificationPermission === 'default') setNotificationPermission(await notifications.requestPermission());
    };
    const handlePeriodicSyncToggle = async (enabled: boolean) => {
        handleSettingChange('enablePeriodicSync', enabled);
        await (enabled ? notifications.registerPeriodicSync() : notifications.unregisterPeriodicSync());
        showStatus('success', `סנכרון ברקע ${enabled ? 'הופעל' : 'כובה'}.`);
    };

    const handleExport = async () => {
        try {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([await dataService.exportAllData()], { type: 'application/json' }));
            a.download = `spark_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            showStatus('success', 'הנתונים יוצאו בהצלחה.');
        } catch (e) { showStatus('error', 'שגיאה בעת ייצוא הנתונים.'); }
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                await dataService.importAllData(event.target?.result as string);
                showStatus('success', 'הנתונים יובאו בהצלחה. מרענן...');
                setTimeout(() => window.location.reload(), 1500);
            } catch (error: any) { showStatus('error', error.message || 'שגיאה בייבוא הנתונים.'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    };
    
    const handleWipeData = async () => {
        if(window.navigator.vibrate) window.navigator.vibrate(100);
        const backup = await dataService.exportAllData();
        await dataService.wipeAllData();
        dispatch({ type: 'FETCH_SUCCESS', payload: { feedItems: [], personalItems: [], spaces: [] } });
        dispatch({ type: 'SET_SETTINGS', payload: loadSettings() });
        showStatus('error', 'כל הנתונים נמחקו.', async () => {
            await dataService.importAllData(backup);
            const [feedItems, personalItems, spaces] = await Promise.all([dataService.getFeedItems(), dataService.getPersonalItems(), dataService.getSpaces()]);
            dispatch({ type: 'FETCH_SUCCESS', payload: { feedItems, personalItems, spaces } });
            dispatch({ type: 'SET_SETTINGS', payload: loadSettings() });
            showStatus('success', 'הנתונים שוחזרו.');
        });
    };
    
    const handleMentorToggle = (mentorId: string, isEnabled: boolean) => {
        const newEnabled = isEnabled ? [...settings.enabledMentorIds, mentorId] : settings.enabledMentorIds.filter(id => id !== mentorId);
        handleSettingChange('enabledMentorIds', newEnabled);
    };

    const handleAddMentor = async () => {
        if (!newMentorName.trim()) return;
        setIsAddingMentor(true);
        try {
            const newMentor = await dataService.addCustomMentor(newMentorName);
            setMentors(prev => [...prev, newMentor]);
            showStatus('success', `המנטור "${newMentorName}" נוסף בהצלחה!`);
            setNewMentorName('');
        } catch (error: any) { showStatus('error', error.message); } finally { setIsAddingMentor(false); }
    };

    const handleConnectGoogle = () => googleCalendarService.signIn();
    const handleDisconnectGoogle = async () => {
        await googleCalendarService.signOut();
        dispatch({ type: 'SET_GOOGLE_AUTH_STATE', payload: 'signedOut' });
    };

    return (
    <>
      <div className="pt-4 space-y-8">
        <header>
          <h1 className="text-3xl font-bold themed-title">{settings.screenLabels?.settings || 'הגדרות'}</h1>
        </header>

        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            {/* Mobile Dropdown */}
            <div className="md:hidden">
                <label htmlFor="settings-section-select" className="sr-only">בחר קטגוריית הגדרות</label>
                <div className="relative">
                    <select
                        id="settings-section-select"
                        value={activeSection}
                        onChange={(e) => setActiveSection(e.target.value as SettingsSectionId)}
                        className="w-full appearance-none bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50 focus:border-[var(--dynamic-accent-start)] transition-shadow font-semibold"
                    >
                        {settingsSections.map(section => (
                            <option key={section.id} value={section.id}>
                                {section.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-[var(--text-secondary)]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text-secondary)]">
                        {settingsSections.find(s => s.id === activeSection)?.icon}
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block md:w-1/4">
                <nav className="flex flex-col gap-1">
                    {settingsSections.map(section => (
                        <button key={section.id} onClick={() => setActiveSection(section.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg w-full text-right transition-colors shrink-0 ${activeSection === section.id ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            {section.icon} {section.label}
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 min-w-0">
                {activeSection === 'appearance' && (
                    <SettingsSection title="מראה ותצוגה" id="appearance">
                        <SettingsCard title="ערכות נושא">
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {Object.entries(THEMES).map(([key, theme]) => <ThemePreviewCard key={key} theme={theme} isSelected={settings.themeSettings.name === theme.name && settings.themeSettings.name !== 'Custom'} onClick={() => handleSettingChange('themeSettings', theme)} />)}
                                <div className="text-center group w-full">
                                    <button onClick={() => handleSettingChange('themeSettings', {...settings.themeSettings, name: 'Custom'})} className={`relative w-full aspect-video rounded-xl flex items-center justify-center transition-all duration-300 ring-2 ring-offset-2 ring-offset-[var(--bg-card)] ${settings.themeSettings.name === 'Custom' ? 'ring-[var(--dynamic-accent-start)] shadow-[0_0_15px_var(--dynamic-accent-glow)]' : 'ring-transparent'}`} style={{ background: 'linear-gradient(45deg, var(--bg-secondary), var(--bg-card))' }} >
                                        <PaletteIcon className="w-8 h-8 text-[var(--text-secondary)] group-hover:text-white" />
                                    </button>
                                    <span className={`text-sm mt-2 font-medium transition-colors ${settings.themeSettings.name === 'Custom' ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-white'}`}>מותאם אישית</span>
                                </div>
                             </div>
                        </SettingsCard>

                        {settings.themeSettings.name === 'Custom' && (
                            <SettingsCard title="התאמה אישית של ערכת נושא">
                                <SettingsRow title="צבע הדגשה" description="בחר את צבע המבטא הראשי של האפליקציה.">
                                    <div className="relative w-10 h-10 rounded-full border-2 border-[var(--border-primary)]" style={{ backgroundColor: settings.themeSettings.accentColor }}>
                                        <input type="color" value={settings.themeSettings.accentColor} onChange={e => handleSettingChange('themeSettings', {...settings.themeSettings, accentColor: e.target.value})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                    </div>
                                </SettingsRow>
                                <SettingsRow title="סגנון כרטיסים" description="שנה את מראה הרכיבים והכרטיסיות."><SegmentedControl value={settings.themeSettings.cardStyle} onChange={v => handleSettingChange('themeSettings', {...settings.themeSettings, cardStyle: v as CardStyle})} options={[{label: 'זכוכית', value: 'glass'}, {label: 'שטוח', value: 'flat'}, {label: 'גבול', value: 'bordered'}]} /></SettingsRow>
                                <SettingsRow title="אפקט רקע" description="הפעל אפקט חלקיקים עדין ברקע."><ToggleSwitch checked={settings.themeSettings.backgroundEffect} onChange={v => handleSettingChange('themeSettings', {...settings.themeSettings, backgroundEffect: v})} /></SettingsRow>
                            </SettingsCard>
                        )}
                        
                        <SettingsCard title="גופנים וטקסט">
                            <SettingsRow title="גופן ראשי" description="בחר את הפונט הראשי של האפליקציה.">
                                <div className="grid grid-cols-3 gap-2">
                                    {FONTS.map(font => (
                                        <button key={font.id} onClick={() => handleSettingChange('themeSettings', { ...settings.themeSettings, font: font.id })}
                                            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${settings.themeSettings.font === font.id ? 'bg-[var(--accent-gradient)] text-black font-bold shadow-[0_0_10px_var(--dynamic-accent-glow)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-white'}`}
                                            style={{ fontFamily: font.family }} >
                                            {font.name}
                                        </button>
                                    ))}
                                </div>
                            </SettingsRow>
                             <SettingsRow title="גודל גופן" description="התאם את קנה המידה של כל הטקסט באפליקציה.">
                                <div className="flex items-center gap-4 w-48">
                                    <input type="range" min="0.85" max="1.2" step="0.05" value={settings.fontSizeScale} onChange={e => handleSettingChange('fontSizeScale', parseFloat(e.target.value))} className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer" />
                                    <span className="font-mono text-sm text-white">{settings.fontSizeScale.toFixed(2)}</span>
                                </div>
                            </SettingsRow>
                        </SettingsCard>

                        <SettingsCard title="תצוגה ואנימציה">
                            <SettingsRow title="צפיפות תצוגה" description="התאם את המרווחים באפליקציה."><SegmentedControl value={settings.uiDensity} onChange={(val) => handleSettingChange('uiDensity', val as UiDensity)} options={[{ label: 'נוחה', value: 'comfortable' }, { label: 'דחוסה', value: 'compact' }]} /></SettingsRow>
                            <SettingsRow title="תצוגת פיד" description="בחר את תצוגת ברירת המחדל למסך הפיד."><SegmentedControl value={settings.feedViewMode} onChange={(val) => handleSettingChange('feedViewMode', val as FeedViewMode)} options={[{ label: 'רשימה', value: 'list', icon: <ListIcon className="w-4 h-4" /> }, { label: 'ויזואלי', value: 'visual', icon: <VisualModeIcon className="w-4 h-4" /> }]} /></SettingsRow>
                            <SettingsRow title="עוצמת אנימציה" description="שלוט במהירות וחלקות האנימציות."><SegmentedControl value={settings.animationIntensity} onChange={(val) => handleSettingChange('animationIntensity', val as AnimationIntensity)} options={[{ label: 'כבוי', value: 'off' }, { label: 'עדין', value: 'subtle' }, { label: 'רגיל', value: 'default' }, { label: 'מלא', value: 'full' }]} /></SettingsRow>
                        </SettingsCard>

                        <SettingsCard title="פריסות ותוויות">
                             <SettingsRow title="עריכת פריסות ותוויות" description="שנה את סדר הרכיבים במסכים השונים ושנה את שמותיהם.">
                                <button onClick={() => setIsLayoutModalOpen(true)} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-bold py-2 px-4 rounded-xl transition-colors">
                                    פתח עורך פריסות
                                </button>
                             </SettingsRow>
                        </SettingsCard>
                    </SettingsSection>
                )}
                {activeSection === 'ai' && (
                    <SettingsSection title="בינה מלאכותית" id="ai">
                       <SettingsCard title="הגדרות ליבה">
                            <SettingsRow title="מודל AI" description="בחר את מודל השפה לסיכומים, חיפוש ויצירת תוכן."><SegmentedControl value={settings.aiModel} onChange={(val) => handleSettingChange('aiModel', val as 'gemini-2.5-flash' | 'gemini-2.5-pro')} options={[{ label: 'Flash', value: 'gemini-2.5-flash' }, { label: 'Pro', value: 'gemini-2.5-pro' }]} /></SettingsRow>
                            <SettingsRow title="אישיות ה-AI" description="קבע את סגנון התגובות של ה-AI בתדריכים וסיכומים."><SegmentedControl value={settings.aiPersonality} onChange={(val) => handleSettingChange('aiPersonality', val as AiPersonality)} options={[{ label: 'תמציתי', value: 'concise' }, { label: 'מעודד', value: 'encouraging' }, { label: 'רשמי', value: 'formal' }]} /></SettingsRow>
                            <SettingsRow title="סיכום אוטומטי" description="סכם אוטומטית פריטים חדשים בעת רענון הפיד."><ToggleSwitch checked={settings.autoSummarize} onChange={(val) => handleSettingChange('autoSummarize', val)} /></SettingsRow>
                       </SettingsCard>
                       <SettingsCard title="פיד ידע אישי (AI)">
                            <SettingsRow title="הפעל יצירת תוכן אוטומטי" description="צור כרטיסיות ידע חדשות בכל רענון של הפיד."><ToggleSwitch checked={settings.aiFeedSettings.isEnabled} onChange={(val) => handleSettingChange('aiFeedSettings', { ...settings.aiFeedSettings, isEnabled: val })} /></SettingsRow>
                            {settings.aiFeedSettings.isEnabled && <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]"><div className="flex gap-2"><input type="text" value={settings.aiFeedSettings.topics.join(', ')} onChange={(e) => handleSettingChange('aiFeedSettings', { ...settings.aiFeedSettings, topics: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="הפרד נושאים עם פסיק" className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md px-3 py-2 text-sm" /><button type="button" onClick={async () => {setIsSuggestingTopics(true); try { const newTopics = (await geminiService.suggestAiFeedTopics(settings.aiFeedSettings.topics)).filter(s => !new Set(settings.aiFeedSettings.topics.map(t => t.toLowerCase())).has(s.toLowerCase())); if (newTopics.length > 0) { handleSettingChange('aiFeedSettings', { ...settings.aiFeedSettings, topics: [...settings.aiFeedSettings.topics, ...newTopics] }); showStatus('success', 'נושאים חדשים נוספו'); } else { showStatus('info', 'לא נמצאו הצעות חדשות'); } } catch (e) { showStatus('error', (e as Error).message); } finally { setIsSuggestingTopics(false); } }} disabled={isSuggestingTopics} className="p-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md text-[var(--dynamic-accent-highlight)] disabled:opacity-50" title="הצע לי נושאים">{isSuggestingTopics ? <LoadingSpinner className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5"/>}</button></div><div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">פריטים לרענון: {settings.aiFeedSettings.itemsPerRefresh}</label><input type="range" min="0" max="10" value={settings.aiFeedSettings.itemsPerRefresh} onChange={(e) => handleSettingChange('aiFeedSettings', { ...settings.aiFeedSettings, itemsPerRefresh: parseInt(e.target.value, 10)})} className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer" /></div><textarea value={settings.aiFeedSettings.customPrompt} onChange={(e) => handleSettingChange('aiFeedSettings', { ...settings.aiFeedSettings, customPrompt: e.target.value })} rows={2} placeholder="הנחיה נוספת ל-AI (אופציונלי)" className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md px-3 py-2 text-sm" /></div>}
                        </SettingsCard>
                        <SettingsCard title="פיד מנטורים">
                           {mentors.map(mentor => (<div key={mentor.id} className="group flex justify-between items-center bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border-primary)]"><div className="flex-1 overflow-hidden"><p className="text-[var(--text-primary)] font-medium truncate">{mentor.name}</p><p className="text-sm text-[var(--text-secondary)] truncate">{mentor.description}</p></div><div className="flex items-center gap-2 shrink-0">{mentor.isCustom && (<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={async () => {setMentorLoadingStates(p=>({...p,[mentor.id]:true})); try {const u=await dataService.refreshMentorContent(mentor.id); setMentors(p=>p.map(m=>m.id===mentor.id?u:m)); showStatus('success', `התוכן עבור "${u.name}" רוענן.`);} catch(e){showStatus('error','שגיאה ברענון התוכן.');} finally {setMentorLoadingStates(p=>({...p,[mentor.id]:false}));}}} disabled={mentorLoadingStates[mentor.id]} className="p-2 text-[var(--text-secondary)] hover:text-white disabled:opacity-50"><RefreshIcon className={`w-4 h-4 ${mentorLoadingStates[mentor.id] ? 'animate-spin' : ''}`} /></button><button onClick={async ()=>{if(window.navigator.vibrate)window.navigator.vibrate(50);await dataService.removeCustomMentor(mentor.id);setMentors(p=>p.filter(m=>m.id!==mentor.id));dispatch({type:'SET_SETTINGS',payload:loadSettings()});showStatus('success',`המנטור "${mentor.name}" נמחק.`,async()=>{await dataService.reAddCustomMentor(mentor);setMentors(p=>[...p,mentor]);dispatch({type:'SET_SETTINGS',payload:loadSettings()});});}} className="p-2 text-[var(--text-secondary)] hover:text-red-400"><TrashIcon className="w-4 h-4"/></button></div>)}<ToggleSwitch checked={(settings.enabledMentorIds || []).includes(mentor.id)} onChange={(isEnabled) => handleMentorToggle(mentor.id, isEnabled)} /></div></div>))}
                           <div className="mt-4 flex gap-2"><input type="text" value={newMentorName} onChange={(e) => setNewMentorName(e.target.value)} placeholder="הזן שם מנטור..." className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50" /><button onClick={handleAddMentor} disabled={!newMentorName.trim() || isAddingMentor} className="bg-[var(--accent-gradient)] text-black font-bold p-3 rounded-xl disabled:opacity-50 transition-transform transform active:scale-95">{isAddingMentor ? <LoadingSpinner /> : <AddIcon className="w-6 h-6"/>}</button></div>
                        </SettingsCard>
                    </SettingsSection>
                )}
                {activeSection === 'integrations' && (
                     <SettingsSection title="שילובים והתראות" id="integrations">
                        <SettingsCard title="שילובים">
                            <SettingsRow title="Google Calendar" description={state.googleAuthState === 'signedIn' ? 'מחובר' : 'לא מחובר'}>{state.googleAuthState === 'signedIn' ? <button onClick={handleDisconnectGoogle} className="bg-red-500/20 text-red-300 font-semibold px-4 py-2 rounded-lg text-sm">התנתק</button> : <button onClick={handleConnectGoogle} disabled={state.googleAuthState === 'loading'} className="bg-[var(--accent-gradient)] text-black font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">{state.googleAuthState === 'loading' ? 'טוען...' : 'התחבר'}</button>}</SettingsRow>
                        </SettingsCard>
                        <SettingsCard title="התראות">
                            <SettingsRow title="התראות PWA" description="קבל התראות ועדכונים מהאפליקציה."><ToggleSwitch checked={settings.notificationsEnabled} onChange={handleNotificationToggle} /></SettingsRow>
                            {settings.notificationsEnabled && (<div className="pl-4 border-r-2 border-[var(--border-primary)] space-y-3"><p className="text-sm text-[var(--text-secondary)]">סטטוס הרשאה: <span className={`font-semibold ${notificationPermission === 'granted' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{notificationPermission}</span></p>{notificationPermission === 'default' && <button onClick={notifications.requestPermission} className="text-sm text-[var(--accent-highlight)]">בקש הרשאה</button>}{notificationPermission === 'granted' && <button onClick={notifications.showTestNotification} className="text-sm text-[var(--accent-highlight)]">שלח התראת בדיקה</button>}</div>)}
                            <SettingsRow title="תזכורות להרגלים" description="קבל התראות על הרגלים שלא הושלמו."><ToggleSwitch checked={settings.enableHabitReminders} onChange={(val) => handleSettingChange('enableHabitReminders', val)} /></SettingsRow>
                            <SettingsRow title="סנכרון רקע תקופתי" description="בדוק עדכונים ברקע ועדכן את תג האפליקציה."><ToggleSwitch checked={settings.enablePeriodicSync} onChange={handlePeriodicSyncToggle} /></SettingsRow>
                        </SettingsCard>
                    </SettingsSection>
                )}
                 {activeSection === 'general' && (
                    <SettingsSection title="כללי" id="general">
                       <SettingsCard title="התנהגות אפליקציה">
                            <SettingsRow title="מסך פתיחה" description="בחר איזה מסך יוצג עם פתיחת האפליקציה."><SegmentedControl value={settings.defaultScreen} onChange={(val) => handleSettingChange('defaultScreen', val as 'today' | 'feed')} options={[{ label: 'היום', value: 'today', icon: <TargetIcon className="w-4 h-4"/> }, { label: 'פיד', value: 'feed', icon: <FeedIcon className="w-4 h-4"/> }]} /></SettingsRow>
                            <SettingsRow title="משוב רטט (Haptics)" description="הפעל או כבה את הרטט בעת ביצוע פעולות."><ToggleSwitch checked={settings.hapticFeedback} onChange={(val) => handleSettingChange('hapticFeedback', val)} /></SettingsRow>
                       </SettingsCard>
                       <SettingsCard title="טיימרים">
                            <SettingsRow title="הפעל טיימר אינטרוולים" description="הצג אפשרות להתחיל סשן אימון ממסך 'היום'."><ToggleSwitch checked={settings.enableIntervalTimer} onChange={(val) => handleSettingChange('enableIntervalTimer', val)}/></SettingsRow>
                            {settings.enableIntervalTimer && <SettingsRow title="זמן מנוחה (שניות)" description="זמן המנוחה בין סטים באימון."><input type="number" value={settings.intervalTimerSettings.restDuration} onChange={(e) => handleSettingChange('intervalTimerSettings', { ...settings.intervalTimerSettings, restDuration: parseInt(e.target.value, 10) || 0 })} className="w-24 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md px-2 py-1 text-center" /></SettingsRow>}
                            <div className="pt-4 border-t border-[var(--border-primary)]"><p className="font-medium text-[var(--text-primary)] mb-2">הגדרות פומודורו</p><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><label className="text-sm text-[var(--text-secondary)]">עבודה (דקות)</label><input type="number" value={settings.pomodoroSettings.workDuration} onChange={e=>handleSettingChange('pomodoroSettings', {...settings.pomodoroSettings, workDuration: parseInt(e.target.value, 10)})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-2 text-center" /></div><div><label className="text-sm text-[var(--text-secondary)]">הפסקה קצרה</label><input type="number" value={settings.pomodoroSettings.shortBreak} onChange={e=>handleSettingChange('pomodoroSettings', {...settings.pomodoroSettings, shortBreak: parseInt(e.target.value, 10)})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-2 text-center" /></div><div><label className="text-sm text-[var(--text-secondary)]">הפסקה ארוכה</label><input type="number" value={settings.pomodoroSettings.longBreak} onChange={e=>handleSettingChange('pomodoroSettings', {...settings.pomodoroSettings, longBreak: parseInt(e.target.value, 10)})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-2 text-center" /></div><div><label className="text-sm text-[var(--text-secondary)]">סבבים</label><input type="number" value={settings.pomodoroSettings.sessionsUntilLongBreak} onChange={e=>handleSettingChange('pomodoroSettings', {...settings.pomodoroSettings, sessionsUntilLongBreak: parseInt(e.target.value, 10)})} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md p-2 text-center" /></div></div></div>
                       </SettingsCard>
                    </SettingsSection>
                 )}
                 {activeSection === 'data' && (
                    <SettingsSection title="ניהול נתונים" id="data">
                        <SettingsCard title="ארגון">
                            <SettingsRow title="ארגון מרחבים ופידים" description="נהל את מרחבי התוכן האישיים ומרחבי הפידים שלך."><button onClick={() => setIsManageSpacesOpen(true)} className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-bold py-2 px-4 rounded-xl transition-colors">ניהול מרחבים</button></SettingsRow>
                        </SettingsCard>
                        <SettingsCard title="גיבוי ושחזור">
                            <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-semibold py-3 px-4 rounded-xl transition-colors"><DownloadIcon className="h-5 h-5" />ייצוא כל הנתונים</button>
                            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-semibold py-3 px-4 rounded-xl transition-colors mt-2"><UploadIcon className="h-5 h-5" />ייבוא נתונים מקובץ</button>
                            <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileSelected} className="hidden" />
                        </SettingsCard>
                        <SettingsCard title="אזור סכנה" danger>
                            <SettingsRow title="איפוס ומחיקת כל הנתונים" description="פעולה זו תמחק את כל הנתונים שלך לצמיתות. מומלץ לייצא גיבוי לפני כן."><button onClick={handleWipeData} className="bg-red-800/20 border border-red-500/30 hover:bg-red-800/40 text-red-300 font-semibold py-2 px-4 rounded-xl transition-colors">איפוס אפליקציה</button></SettingsRow>
                        </SettingsCard>
                    </SettingsSection>
                 )}
            </main>
        </div>

        <div className="text-center pb-4">
            <p className="text-sm text-gray-600 mt-4">Spark v3.2 - Hyper-Personal Edition</p>
        </div>
      </div>
      
      <LayoutSettingsModal 
        isOpen={isLayoutModalOpen} 
        onClose={() => {setIsLayoutModalOpen(false); setInitialLayoutTab(undefined);}} 
        settings={settings} 
        handleSettingChange={handleSettingChange}
        initialTab={initialLayoutTab}
      />
      {isManageSpacesOpen && <ManageSpacesModal onClose={() => setIsManageSpacesOpen(false)} />}
      {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
    </>
    );
};

export default SettingsScreen;