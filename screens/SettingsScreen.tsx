import React, { useState, useEffect, useRef, useContext, DragEvent } from 'react';
import type { AppSettings, Template, Screen, HomeScreenComponent, HomeScreenComponentId, ThemeSettings, AppFont, CardStyle, Mentor, UiDensity, AnimationIntensity } from '../types';
import { saveSettings, loadSettings } from '../services/settingsService';
import * as dataService from '../services/dataService';
import * as notifications from '../services/notificationsService';
import { HomeIcon, AiChipIcon, DatabaseIcon, DownloadIcon, UploadIcon, WarningIcon, FeedIcon, TemplateIcon, TrashIcon, FileIcon, TargetIcon, VisualModeIcon, CheckCircleIcon, DragHandleIcon, LayoutDashboardIcon, PaletteIcon, SparklesIcon, BrainCircuitIcon, RefreshIcon, AddIcon, StopwatchIcon, ChartBarIcon, SearchIcon, SettingsIcon } from '../components/icons';
import ToggleSwitch from '../components/ToggleSwitch';
import ManageSpacesModal from '../components/ManageSpacesModal';
import { AppContext } from '../state/AppContext';
import StatusMessage, { StatusMessageType } from '../components/StatusMessage';

type Status = {
  type: StatusMessageType;
  text: string;
  id: number;
  onUndo?: () => void;
} | null;

const SettingsCard: React.FC<{title: string, children: React.ReactNode, icon: React.ReactNode}> = ({ title, children, icon }) => (
  <div className="themed-card">
    <div className="flex items-center gap-3 p-4 border-b border-[var(--border-primary)]">
        {icon}
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
    </div>
    <div className="p-4 sm:p-6 space-y-6">
        {children}
    </div>
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
                    value === opt.value ? 'bg-[var(--accent-gradient)] text-white shadow-[0_0_10px_var(--dynamic-accent-glow)]' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
            >
                {opt.icon} {opt.label}
            </button>
        ))}
    </div>
);

// --- New Theme Preview Component ---

const THEMES: Record<string, ThemeSettings> = {
    gold: { name: 'Gold', accentColor: '#C67C3E', font: 'inter', cardStyle: 'glass', backgroundEffect: true },
    crimson: { name: 'Crimson', accentColor: '#DC2626', font: 'lato', cardStyle: 'bordered', backgroundEffect: false },
    emerald: { name: 'Emerald', accentColor: '#059669', font: 'inter', cardStyle: 'flat', backgroundEffect: true },
    nebula: { name: 'Nebula', accentColor: '#8B5CF6', font: 'source-code-pro', cardStyle: 'glass', backgroundEffect: true },
    oceanic: { name: 'Oceanic', accentColor: '#3B82F6', font: 'inter', cardStyle: 'flat', backgroundEffect: false },
};

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
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    fontFamily: getFontFamily(theme.font),
                }}
            >
                {/* This outer div simulates the body class for preview */}
                <div className={`w-full h-full p-3 flex flex-col justify-end ${cardStyleClass}`}>
                    {/* Themed card preview */}
                    <div 
                        className="themed-card w-full h-1/2 p-2"
                        style={{
                            '--dynamic-accent-start': theme.accentColor,
                            '--dynamic-accent-end': theme.accentColor,
                            '--dynamic-accent-glow': `${theme.accentColor}33`,
                            '--border-primary': 'rgba(255, 255, 255, 0.1)',
                            '--bg-card': '#1F1B18',
                            '--bg-secondary': '#1A1512'
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
}

const DraggableNavItem: React.FC<{
    screenId: Screen;
    label: string;
    icon: React.ReactNode;
    onDragStart: () => void;
    onDragEnter: () => void;
    onDragEnd: () => void;
    isDragging: boolean;
}> = ({ screenId, label, icon, onDragStart, onDragEnter, onDragEnd, isDragging }) => (
    <div
        draggable
        onDragStart={onDragStart}
        onDragEnter={onDragEnter}
        onDragEnd={onDragEnd}
        onDragOver={(e) => e.preventDefault()}
        className={`group flex items-center justify-between bg-[var(--bg-secondary)] p-3 rounded-lg cursor-grab ${isDragging ? 'dragging-item' : ''}`}
    >
        <div className="flex items-center gap-3">
            <div className="text-[var(--text-secondary)]">{icon}</div>
            <p className="font-medium text-[var(--text-primary)]">{label}</p>
        </div>
        <DragHandleIcon className="w-5 h-5 text-[var(--text-secondary)] opacity-50 group-hover:opacity-100" />
    </div>
);


// --- Main Settings Screen Component ---

interface SettingsScreenProps {
    setActiveScreen: (screen: Screen) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ setActiveScreen }) => {
    const { state, dispatch } = useContext(AppContext);
    const { settings } = state;

    const [isManageSpacesOpen, setIsManageSpacesOpen] = useState(false);
    const [statusMessage, setStatusMessage] = useState<Status>(null);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    
    const [mentors, setMentors] = useState<Mentor[]>([]);
    const [isAddingMentor, setIsAddingMentor] = useState(false);
    const [newMentorName, setNewMentorName] = useState('');
    const [mentorLoadingStates, setMentorLoadingStates] = useState<Record<string, boolean>>({});
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for Nav Bar dragging
    const dragNav = useRef<number | null>(null);
    const dragOverNav = useRef<number | null>(null);
    const [draggingNav, setDraggingNav] = useState(false);

    useEffect(() => {
        const fetchMentors = async () => {
            setMentors(await dataService.getMentors());
        }
        fetchMentors();
    }, []);

    const reloadData = async () => {
        dispatch({ type: 'FETCH_START' });
        try {
            const [feedItems, personalItems, spaces] = await Promise.all([
                dataService.getFeedItems(),
                dataService.getPersonalItems(),
                dataService.getSpaces(),
            ]);
            const newSettings = loadSettings(); // Reload settings as well
            dispatch({ type: 'SET_SETTINGS', payload: newSettings });
            dispatch({ type: 'FETCH_SUCCESS', payload: { feedItems, personalItems, spaces } });
        } catch (error) {
            dispatch({ type: 'FETCH_ERROR', payload: 'Failed to reload data' });
        }
    };

    const showStatus = (type: StatusMessageType, text: string, onUndo?: () => void) => {
        setStatusMessage({ type, text, id: Date.now(), onUndo });
    };

    useEffect(() => {
        // Periodically check notification permission status
        const interval = setInterval(() => {
            if(Notification.permission !== notificationPermission) {
                setNotificationPermission(Notification.permission);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [notificationPermission]);

    const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        saveSettings(newSettings);
        dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    };
    
    const handleThemeSettingChange = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
        const newThemeSettings = { ...settings.themeSettings, [key]: value, name: "Custom" };
        handleSettingChange('themeSettings', newThemeSettings);
    };
    
    const handleLabelChange = (screen: Screen, newLabel: string) => {
        handleSettingChange('screenLabels', { ...settings.screenLabels, [screen]: newLabel });
    };

    const handleSectionLabelChange = (section: HomeScreenComponentId, newLabel: string) => {
        handleSettingChange('sectionLabels', { ...settings.sectionLabels, [section]: newLabel });
    };

    const handleLayoutChange = (newLayout: HomeScreenComponent[]) => {
        handleSettingChange('homeScreenLayout', newLayout);
    };

    const handleNotificationToggle = async (enabled: boolean) => {
        handleSettingChange('notificationsEnabled', enabled);
        if (enabled && notificationPermission === 'default') {
            const permission = await notifications.requestPermission();
            setNotificationPermission(permission);
        }
    };
    
    const handlePeriodicSyncToggle = async (enabled: boolean) => {
        handleSettingChange('enablePeriodicSync', enabled);
        if (enabled) {
            await notifications.registerPeriodicSync();
            showStatus('success', 'סנכרון ברקע הופעל.');
        } else {
            await notifications.unregisterPeriodicSync();
            showStatus('success', 'סנכרון ברקע כובה.');
        }
    };

    const handleExport = async () => {
        try {
            const jsonData = await dataService.exportAllData();
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `spark_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showStatus('success', 'הנתונים יוצאו בהצלחה.');
        } catch (e) {
            showStatus('error', 'שגיאה בעת ייצוא הנתונים.');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const result = event.target?.result;
            if (typeof result === 'string') {
                try {
                    await dataService.importAllData(result);
                    showStatus('success', 'הנתונים יובאו בהצלחה. מרענן...');
                    setTimeout(() => window.location.reload(), 1500);
                } catch (error: any) {
                    showStatus('error', error.message || 'שגיאה בייבוא הנתונים.');
                }
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset for next import
    };
    
    const handleWipeData = async () => {
        if(window.navigator.vibrate) window.navigator.vibrate(100);
        
        const backup = await dataService.exportAllData();
        
        await dataService.wipeAllData();
        
        // Manually clear the state in the app without a full reload
        dispatch({ type: 'FETCH_SUCCESS', payload: { feedItems: [], personalItems: [], spaces: [] } });
        dispatch({ type: 'SET_SETTINGS', payload: loadSettings() }); // loads defaults

        showStatus('error', 'כל הנתונים נמחקו.', async () => {
            // UNDO Action
            // FIX: Added await to the async undo action to ensure it completes before potential subsequent actions.
            await dataService.importAllData(backup);
            // After import, we need to reload data into the state
            await reloadData();
            showStatus('success', 'הנתונים שוחזרו.');
        });
    };

    const handleMentorToggle = (mentorId: string, isEnabled: boolean) => {
        const currentEnabled = settings.enabledMentorIds || [];
        const newEnabled = isEnabled
            ? [...currentEnabled, mentorId]
            : currentEnabled.filter(id => id !== mentorId);
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
        } catch (error: any) {
            showStatus('error', error.message);
        } finally {
            setIsAddingMentor(false);
        }
    };

    const handleRefreshMentor = async (mentorId: string) => {
        setMentorLoadingStates(prev => ({ ...prev, [mentorId]: true }));
        try {
            const updatedMentor = await dataService.refreshMentorContent(mentorId);
            setMentors(prev => prev.map(m => m.id === mentorId ? updatedMentor : m));
            showStatus('success', `התוכן עבור "${updatedMentor.name}" רוענן.`);
        } catch (error) {
            showStatus('error', 'שגיאה ברענון התוכן.');
        } finally {
            setMentorLoadingStates(prev => ({ ...prev, [mentorId]: false }));
        }
    };

    const handleDeleteMentor = async (mentorId: string) => {
        const mentor = mentors.find(m => m.id === mentorId);
        if (!mentor) return;
        
        if(window.navigator.vibrate) window.navigator.vibrate(50);

        await dataService.removeCustomMentor(mentorId);
        setMentors(prev => prev.filter(m => m.id !== mentorId));
        dispatch({ type: 'SET_SETTINGS', payload: loadSettings() });

        showStatus('success', `המנטור "${mentor.name}" נמחק.`, async () => {
            // UNDO Action
            // FIX: Added await to the async undo action to ensure it completes before potential subsequent actions.
            await dataService.reAddCustomMentor(mentor);
            setMentors(prev => [...prev, mentor]);
            dispatch({ type: 'SET_SETTINGS', payload: loadSettings() });
        });
    };

    const navLayout = settings.navBarLayout.filter(id => id !== 'add');

    const handleNavDrop = () => {
        if (dragNav.current !== null && dragOverNav.current !== null) {
            const newLayout = [...navLayout];
            const dragItemContent = newLayout[dragNav.current];
            newLayout.splice(dragNav.current, 1);
            newLayout.splice(dragOverNav.current, 0, dragItemContent);
            
            // Re-insert 'add' at the center
            newLayout.splice(2, 0, 'add');
            handleSettingChange('navBarLayout', newLayout);
        }
        dragNav.current = null;
        dragOverNav.current = null;
        setDraggingNav(false);
    };

    const allNavItemsMap: Record<Screen, { label: string; icon: React.ReactNode }> = {
        feed: { label: 'פיד', icon: <FeedIcon className="w-5 h-5"/> },
        today: { label: 'היום', icon: <TargetIcon className="w-5 h-5"/> },
        add: { label: 'הוספה', icon: <AddIcon className="w-5 h-5"/> },
        library: { label: 'המתכנן', icon: <LayoutDashboardIcon className="w-5 h-5"/> },
        investments: { label: 'השקעות', icon: <ChartBarIcon className="w-5 h-5"/> },
        search: { label: 'חיפוש', icon: <SearchIcon className="w-5 h-5"/> },
        settings: { label: 'הגדרות', icon: <SettingsIcon className="w-5 h-5"/> },
    };


    const defaultLabels: Record<Screen, string> = {
        feed: 'פיד',
        today: 'היום',
        add: 'הוספה',
        investments: 'השקעות',
        library: 'המתכנן',
        search: 'חיפוש',
        settings: 'הגדרות'
    };
    
    const homeScreenComponentNames: Record<HomeScreenComponentId, string> = {
        gratitude: 'הכרת תודה',
        habits: 'הרגלים',
        tasks: 'משימות'
    };

    return (
    <>
      <div className="pt-4 space-y-8">
        <header className="sticky top-0 bg-[var(--bg-primary)]/80 backdrop-blur-md py-3 z-20 -mx-4 px-4">
          <h1 className="text-3xl font-bold themed-title">{settings.screenLabels?.settings || 'הגדרות'}</h1>
        </header>

         <SettingsCard title="PWA ושילובים" icon={<SparklesIcon className="w-6 h-6 text-[var(--text-secondary)]"/>}>
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-[var(--text-primary)] font-medium">התראות</p>
                    <p className="text-sm text-[var(--text-secondary)]">קבל התראות ועדכונים מהאפליקציה</p>
                </div>
                <ToggleSwitch checked={settings.notificationsEnabled} onChange={handleNotificationToggle} />
            </div>
            {settings.notificationsEnabled && (
                 <div className="pl-4 border-l-2 border-[var(--border-primary)] space-y-3">
                    <p className="text-sm text-[var(--text-secondary)]">סטטוס הרשאה: <span className={`font-semibold ${notificationPermission === 'granted' ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{notificationPermission}</span></p>
                    {notificationPermission === 'default' && <button onClick={notifications.requestPermission} className="text-sm text-[var(--accent-highlight)]">בקש הרשאה</button>}
                    {notificationPermission === 'granted' && <button onClick={notifications.showTestNotification} className="text-sm text-[var(--accent-highlight)]">שלח התראת בדיקה</button>}
                </div>
            )}
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-[var(--text-primary)] font-medium">תזכורות להרגלים</p>
                    <p className="text-sm text-[var(--text-secondary)]">קבל התראות על הרגלים שלא הושלמו</p>
                </div>
                <ToggleSwitch checked={settings.enableHabitReminders} onChange={(val) => handleSettingChange('enableHabitReminders', val)} />
            </div>
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-[var(--text-primary)] font-medium">סנכרון רקע תקופתי</p>
                    <p className="text-sm text-[var(--text-secondary)]">בדוק עדכונים ברקע ועדכן את תג האפליקציה</p>
                </div>
                <ToggleSwitch checked={settings.enablePeriodicSync} onChange={handlePeriodicSyncToggle} />
            </div>
             <p className="text-xs text-[var(--text-secondary)] text-center pt-2">תכונות PWA כמו תג אפליקציה, סנכרון רקע ווידג'טים נתמכות באופן שונה בדפדפנים ומערכות הפעלה שונות.</p>
        </SettingsCard>

        <SettingsCard title="ערכת נושא ומראה" icon={<PaletteIcon className="w-6 h-6 text-[var(--text-secondary)]"/>}>
            <div>
                 <p className="text-[var(--text-primary)] font-medium mb-3">ערכות נושא</p>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Object.entries(THEMES).map(([key, theme]) => (
                         <ThemePreviewCard
                            key={key}
                            theme={theme}
                            isSelected={settings.themeSettings.name === theme.name && settings.themeSettings.name !== 'Custom'}
                            onClick={() => handleSettingChange('themeSettings', theme)}
                        />
                    ))}
                     {/* Custom Theme Button */}
                    <div className="text-center group w-full">
                        <button 
                            onClick={() => handleThemeSettingChange('name', 'Custom')}
                            className={`relative w-full aspect-video rounded-xl flex items-center justify-center transition-all duration-300 ring-2 ring-offset-2 ring-offset-[var(--bg-card)] ${settings.themeSettings.name === 'Custom' ? 'ring-[var(--dynamic-accent-start)] shadow-[0_0_15px_var(--dynamic-accent-glow)]' : 'ring-transparent'}`}
                            style={{ background: 'linear-gradient(45deg, var(--bg-secondary), var(--bg-card))' }}
                        >
                            <PaletteIcon className="w-8 h-8 text-[var(--text-secondary)] group-hover:text-white" />
                        </button>
                        <span className={`text-sm mt-2 font-medium transition-colors ${settings.themeSettings.name === 'Custom' ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-white'}`}>מותאם אישית</span>
                    </div>
                 </div>
            </div>
             
            {settings.themeSettings.name === 'Custom' && (
                 <div className="border-t border-[var(--border-primary)] pt-6 space-y-6 mt-6 animate-screen-enter">
                    <p className="text-[var(--text-primary)] font-medium -mb-2">הגדרות מותאמות</p>
                     <div className="flex justify-between items-center">
                        <p className="text-[var(--text-primary)] font-medium">צבע הדגשה</p>
                        <div className="relative w-10 h-10 rounded-full border-2 border-[var(--border-primary)]" style={{ backgroundColor: settings.themeSettings.accentColor }}>
                            <input type="color" value={settings.themeSettings.accentColor} onChange={e => handleThemeSettingChange('accentColor', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                        </div>
                    </div>
                     <div className="flex justify-between items-center">
                        <p className="text-[var(--text-primary)] font-medium">פונט</p>
                        <SegmentedControl 
                            value={settings.themeSettings.font} 
                            onChange={v => handleThemeSettingChange('font', v as AppFont)} 
                            options={[
                                {label: 'Inter', value: 'inter'}, 
                                {label: 'Heebo', value: 'heebo'},
                                {label: 'Rubik', value: 'rubik'},
                                {label: 'Alef', value: 'alef'},
                                {label: 'Lato', value: 'lato'}, 
                                {label: 'Code', value: 'source-code-pro'}
                            ]} 
                        />
                    </div>
                     <div className="flex justify-between items-center">
                        <p className="text-[var(--text-primary)] font-medium">סגנון כרטיסים</p>
                        <SegmentedControl value={settings.themeSettings.cardStyle} onChange={v => handleThemeSettingChange('cardStyle', v as CardStyle)} options={[{label: 'זכוכית', value: 'glass'}, {label: 'שטוח', value: 'flat'}, {label: 'גבול', value: 'bordered'}]} />
                    </div>
                     <div className="flex justify-between items-center">
                        <p className="text-[var(--text-primary)] font-medium">אפקט רקע</p>
                        <ToggleSwitch checked={settings.themeSettings.backgroundEffect} onChange={v => handleThemeSettingChange('backgroundEffect', v)} />
                    </div>
                </div>
            )}
            <div className="border-t border-[var(--border-primary)] pt-6">
                 <p className="text-[var(--text-primary)] font-medium mb-3">צפיפות תצוגה</p>
                 <SegmentedControl
                    value={settings.uiDensity}
                    onChange={(val) => handleSettingChange('uiDensity', val as UiDensity)}
                    options={[
                        { label: 'נוחה', value: 'comfortable' },
                        { label: 'דחוסה', value: 'compact' }
                    ]}
                />
            </div>
            <div className="border-t border-[var(--border-primary)] pt-6">
                 <p className="text-[var(--text-primary)] font-medium mb-3">עוצמת אנימציה</p>
                 <SegmentedControl
                    value={settings.animationIntensity}
                    onChange={(val) => handleSettingChange('animationIntensity', val as AnimationIntensity)}
                    options={[
                        { label: 'כבוי', value: 'off' },
                        { label: 'עדין', value: 'subtle' },
                        { label: 'רגיל', value: 'default' },
                        { label: 'מלא', value: 'full' }
                    ]}
                />
            </div>
        </SettingsCard>

        <SettingsCard title="התאמה אישית" icon={<VisualModeIcon className="w-6 h-6 text-[var(--text-secondary)]"/>}>
            <div>
                <p className="text-[var(--text-primary)] font-medium mb-2">מסך פתיחה</p>
                <SegmentedControl
                    value={settings.defaultScreen}
                    onChange={(val) => handleSettingChange('defaultScreen', val as 'today' | 'feed')}
                    options={[
                        { label: 'היום', value: 'today', icon: <TargetIcon className="w-4 h-4"/> },
                        { label: 'פיד', value: 'feed', icon: <FeedIcon className="w-4 h-4"/> }
                    ]}
                />
            </div>
             <div className="border-t border-[var(--border-primary)] pt-6">
                <p className="text-[var(--text-primary)] font-medium mb-2">סרגל ניווט</p>
                <p className="text-[var(--text-secondary)] text-sm mb-3">סדר מחדש את המסכים (כפתור ההוספה תמיד במרכז).</p>
                <div className="space-y-2">
                    {navLayout.map((screenId, index) => {
                        const item = allNavItemsMap[screenId];
                        return (
                            <DraggableNavItem
                                key={screenId}
                                screenId={screenId}
                                label={settings.screenLabels[screenId] || item.label}
                                icon={item.icon}
                                isDragging={draggingNav && dragNav.current === index}
                                onDragStart={() => { dragNav.current = index; setDraggingNav(true); }}
                                onDragEnter={() => dragOverNav.current = index}
                                onDragEnd={handleNavDrop}
                            />
                        );
                    })}
                </div>
            </div>
             <div className="border-t border-[var(--border-primary)] pt-6">
                <p className="text-[var(--text-primary)] font-medium mb-2">שמות המסכים והאזורים</p>
                <div className="space-y-2">
                    {Object.keys(defaultLabels).map(key => (
                        <div key={key} className="flex items-center gap-4">
                            <label htmlFor={`label-${key}`} className="w-24 text-sm text-[var(--text-secondary)]">{defaultLabels[key as Screen]}</label>
                            <input
                                id={`label-${key}`}
                                type="text"
                                value={settings.screenLabels?.[key as Screen] || ''}
                                placeholder={defaultLabels[key as Screen]}
                                onChange={e => handleLabelChange(key as Screen, e.target.value)}
                                className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md px-2 py-1 text-sm"
                            />
                        </div>
                    ))}
                    {Object.keys(homeScreenComponentNames).map(key => (
                         <div key={key} className="flex items-center gap-4">
                            <label htmlFor={`label-section-${key}`} className="w-24 text-sm text-[var(--text-secondary)]">אזור {homeScreenComponentNames[key as HomeScreenComponentId]}</label>
                            <input
                                id={`label-section-${key}`}
                                type="text"
                                value={settings.sectionLabels?.[key as HomeScreenComponentId] || ''}
                                placeholder={homeScreenComponentNames[key as HomeScreenComponentId]}
                                onChange={e => handleSectionLabelChange(key as HomeScreenComponentId, e.target.value)}
                                className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md px-2 py-1 text-sm"
                            />
                        </div>
                    ))}
                </div>
            </div>
             <div className="border-t border-[var(--border-primary)] pt-6">
                 <p className="text-[var(--text-primary)] font-medium mb-2">פיד מנטורים</p>
                 <p className="text-sm text-[var(--text-secondary)] mb-4">הפעל כדי לקבל פריט יומי בפיד ממקורות השראה אלה, או הוסף מנטור חדש בעזרת AI.</p>
                 <div className="space-y-3">
                     {mentors.map(mentor => (
                         <div key={mentor.id} className="group flex justify-between items-center bg-[var(--bg-secondary)] p-3 rounded-lg">
                             <div className="flex-1 overflow-hidden">
                                 <p className="text-[var(--text-primary)] font-medium truncate">{mentor.name}</p>
                                 <p className="text-sm text-[var(--text-secondary)] truncate">{mentor.description}</p>
                             </div>
                             <div className="flex items-center gap-2 shrink-0">
                                {mentor.isCustom && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleRefreshMentor(mentor.id)} disabled={mentorLoadingStates[mentor.id]} className="p-2 text-[var(--text-secondary)] hover:text-white disabled:opacity-50">
                                            <RefreshIcon className={`w-4 h-4 ${mentorLoadingStates[mentor.id] ? 'animate-spin' : ''}`} />
                                        </button>
                                         <button onClick={() => handleDeleteMentor(mentor.id)} className="p-2 text-[var(--text-secondary)] hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                )}
                                <ToggleSwitch
                                     checked={(settings.enabledMentorIds || []).includes(mentor.id)}
                                     onChange={(isEnabled) => handleMentorToggle(mentor.id, isEnabled)}
                                 />
                             </div>
                         </div>
                     ))}
                 </div>
                 <div className="mt-4 flex gap-2">
                     <input
                        type="text"
                        value={newMentorName}
                        onChange={(e) => setNewMentorName(e.target.value)}
                        placeholder="הזן שם מנטור..."
                        className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--dynamic-accent-start)]/50"
                     />
                     <button onClick={handleAddMentor} disabled={!newMentorName.trim() || isAddingMentor} className="bg-[var(--accent-gradient)] text-white font-bold p-3 rounded-xl disabled:opacity-50 transition-transform transform active:scale-95">
                        {isAddingMentor ? <SparklesIcon className="w-6 h-6 animate-pulse"/> : <AddIcon className="w-6 h-6"/>}
                    </button>
                 </div>
             </div>
        </SettingsCard>
        
        <SettingsCard title="טיימר אינטרוולים (אימון)" icon={<StopwatchIcon className="w-6 h-6 text-[var(--text-secondary)]"/>}>
             <div className="flex justify-between items-center">
                <div>
                    <p className="text-[var(--text-primary)] font-medium">הפעל טיימר אינטרוולים</p>
                    <p className="text-sm text-[var(--text-secondary)]">הצג אפשרות להתחיל סשן אימון.</p>
                </div>
                <ToggleSwitch
                    checked={settings.enableIntervalTimer}
                    onChange={(val) => handleSettingChange('enableIntervalTimer', val)}
                />
            </div>
            {settings.enableIntervalTimer && (
                <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
                    <div className="flex justify-between items-center">
                        <label htmlFor="restDuration" className="text-[var(--text-primary)] font-medium">זמן מנוחה (שניות)</label>
                        <input
                            id="restDuration"
                            type="number"
                            value={settings.intervalTimerSettings.restDuration}
                            onChange={(e) => handleSettingChange('intervalTimerSettings', { ...settings.intervalTimerSettings, restDuration: parseInt(e.target.value, 10) || 0 })}
                            className="w-24 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md px-2 py-1 text-center"
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-[var(--text-primary)] font-medium">התחל סט הבא אוטומטית</p>
                        <ToggleSwitch
                            checked={settings.intervalTimerSettings.autoStartNext}
                            onChange={(val) => handleSettingChange('intervalTimerSettings', { ...settings.intervalTimerSettings, autoStartNext: val })}
                        />
                    </div>
                </div>
            )}
        </SettingsCard>

        <SettingsCard title="סידור מסך 'היום'" icon={<LayoutDashboardIcon className="w-6 h-6 text-[var(--text-secondary)]"/>}>
            <p className="text-[var(--text-secondary)] text-sm -mt-2">הצג או הסתר כל אזור במסך הראשי. ניתן לסדר את האזורים מחדש ישירות ממסך "היום" על ידי גרירה.</p>
            <div className="space-y-2">
                {settings.homeScreenLayout.map((comp) => (
                    <div 
                        key={comp.id}
                        className="group flex items-center justify-between bg-[var(--bg-secondary)] p-3 rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                           <p className="font-medium text-[var(--text-primary)]">{settings.sectionLabels[comp.id] || homeScreenComponentNames[comp.id]}</p>
                        </div>
                        <ToggleSwitch
                            checked={comp.isVisible}
                            onChange={(isVisible) => {
                                const newLayout = settings.homeScreenLayout.map(c => c.id === comp.id ? { ...c, isVisible } : c);
                                handleLayoutChange(newLayout);
                            }}
                        />
                    </div>
                ))}
            </div>
        </SettingsCard>

        <SettingsCard title="בינה מלאכותית" icon={<AiChipIcon className="w-6 h-6 text-[var(--text-secondary)]"/>}>
            <div className="flex justify-between items-center">
                <p className="text-[var(--text-primary)] font-medium">מודל AI</p>
                <SegmentedControl 
                    value={settings.aiModel}
                    onChange={(val) => handleSettingChange('aiModel', val as 'gemini-2.5-flash' | 'gemini-2.5-pro')}
                    options={[ { label: 'Flash', value: 'gemini-2.5-flash' }, { label: 'Pro', value: 'gemini-2.5-pro' } ]}
                />
            </div>
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-[var(--text-primary)] font-medium">סיכום אוטומטי</p>
                    <p className="text-sm text-[var(--text-secondary)]">סכם אוטומטית פריטים חדשים בעת רענון הפיד</p>
                </div>
                <ToggleSwitch checked={settings.autoSummarize} onChange={(val) => handleSettingChange('autoSummarize', val)} />
            </div>
        </SettingsCard>

         <SettingsCard title="ארגון" icon={<FileIcon className="w-6 h-6 text-[var(--text-secondary)]"/>}>
            <p className="text-[var(--text-secondary)] mb-4">נהל את מרחבי התוכן האישיים ומרחבי הפידים שלך.</p>
            <button onClick={() => setIsManageSpacesOpen(true)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-bold py-3 px-4 rounded-xl transition-colors">
                ניהול מרחבים
            </button>
        </SettingsCard>

         <SettingsCard title="ניהול נתונים" icon={<DatabaseIcon className="w-6 h-6 text-[var(--text-secondary)]"/>}>
            <div className="space-y-3">
                 <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                    <DownloadIcon className="h-5 w-5" />
                    ייצוא כל הנתונים
                </button>
                <button onClick={handleImportClick} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-start)] text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                    <UploadIcon className="h-5 w-5" />
                    ייבוא נתונים מקובץ
                </button>
                <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileSelected} className="hidden" />
                <button onClick={handleWipeData} className="w-full flex items-center justify-center gap-2 bg-red-800/20 border border-red-500/30 hover:bg-red-800/40 text-red-300 font-semibold py-3 px-4 rounded-xl transition-colors">
                    <WarningIcon className="h-5 w-5" />
                    איפוס ומחיקת כל הנתונים
                </button>
            </div>
         </SettingsCard>

        <div className="text-center pb-4">
            <p className="text-sm text-gray-600 mt-4">Spark v3.2 - Hyper-Personal Edition</p>
        </div>
      </div>
      
      {isManageSpacesOpen && (
        <ManageSpacesModal onClose={() => {
          setIsManageSpacesOpen(false);
          reloadData();
        }} />
      )}
      {statusMessage && <StatusMessage key={statusMessage.id} type={statusMessage.type} message={statusMessage.text} onDismiss={() => setStatusMessage(null)} onUndo={statusMessage.onUndo} />}
    </>
    );
};

export default SettingsScreen;