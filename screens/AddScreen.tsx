import React, { useState, useEffect, useContext } from 'react';
import type { Screen } from '../types';
import { 
    CheckCircleIcon, LinkIcon, ClipboardListIcon, BookOpenIcon, 
    DumbbellIcon, TargetIcon, ChartBarIcon, SparklesIcon,
    SummarizeIcon, UserIcon, LightbulbIcon, RoadmapIcon
} from '../components/icons';
import { ItemCreationForm } from '../components/ItemCreationForm';
import { PersonalItemType, AddableType } from '../types';
import { AppContext } from '../state/AppContext';

interface AddScreenProps {
  setActiveScreen: (screen: Screen) => void;
}

const allItemTypes: { type: AddableType; label: string; icon: React.ReactNode; color: string; }[] = [
    { type: 'spark', label: 'ספארק', icon: <SparklesIcon />, color: 'var(--accent-start)' },
    { type: 'idea', label: 'רעיון', icon: <LightbulbIcon />, color: 'var(--warning)' },
    { type: 'note', label: 'פתק', icon: <ClipboardListIcon />, color: '#FBBF24' },
    { type: 'task', label: 'משימה', icon: <CheckCircleIcon />, color: 'var(--success)' },
    { type: 'link', label: 'קישור', icon: <LinkIcon />, color: '#60A5FA' },
    { type: 'learning', label: 'למידה', icon: <SummarizeIcon />, color: '#38BDF8' },
    { type: 'journal', label: 'יומן', icon: <UserIcon />, color: '#F0ABFC' },
    { type: 'book', label: 'ספר', icon: <BookOpenIcon />, color: '#A78BFA' },
    { type: 'goal', label: 'פרויקט', icon: <TargetIcon />, color: '#2DD4BF' },
    { type: 'workout', label: 'אימון', icon: <DumbbellIcon />, color: '#F472B6' },
    { type: 'roadmap', label: 'מפת דרכים', icon: <RoadmapIcon />, color: '#3B82F6' },
    { type: 'ticker', label: 'מניה / מטבע', icon: <ChartBarIcon />, color: 'var(--text-secondary)' },
];

const AddItemButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color: string;
    style?: React.CSSProperties;
}> = ({ icon, label, onClick, color, style }) => (
    <button
        onClick={onClick}
        className="themed-card p-3 flex flex-col items-center justify-center text-center aspect-square hover:-translate-y-1 animate-item-enter-fi"
        aria-label={`הוסף ${label}`}
        style={style}
    >
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{backgroundColor: color + '20', color: color}}>
            {React.isValidElement<{ className?: string }>(icon)
                ? React.cloneElement(icon, { ...icon.props, className: 'w-6 h-6' })
                : icon
            }
        </div>
        <span className="font-semibold text-white text-xs">{label}</span>
    </button>
);


const AddScreen: React.FC<AddScreenProps> = ({ setActiveScreen }) => {
    const { state } = useContext(AppContext);
    const { settings } = state;
    const { addScreenLayout } = settings;
    const [selectedType, setSelectedType] = useState<AddableType | null>(null);

    useEffect(() => {
        const preselect = sessionStorage.getItem('preselect_add');
        if (preselect && allItemTypes.some(it => it.type === preselect)) {
            setSelectedType(preselect as AddableType);
            sessionStorage.removeItem('preselect_add');
        }

        const sharedData = sessionStorage.getItem('sharedData');
        if (sharedData) {
            const { url } = JSON.parse(sharedData);
            if(url) {
                setSelectedType('link');
            } else {
                setSelectedType('note');
            }
        }

    }, []);

    const handleItemClick = (type: AddableType) => {
        if (window.navigator.vibrate) {
            window.navigator.vibrate(20);
        }
        setSelectedType(type);
    }

    const handleCloseForm = () => {
        setSelectedType(null);
    };
    
    return (
        <div className="pt-4 pb-8">
            <header className="mb-8 text-center">
                <h1 className="hero-title themed-title">מה להוסיף?</h1>
                <p className="text-[var(--dynamic-accent-highlight)] opacity-90 mt-1 themed-glow-text">בחר סוג פריט כדי להתחיל.</p>
            </header>
            
            <div className={`transition-all duration-500 var(--fi-cubic-bezier) ${selectedType ? 'receding-background' : ''}`}>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {addScreenLayout.map((type, index) => {
                        const item = allItemTypes.find(it => it.type === type);
                        if (!item) return null;
                        return (
                            <AddItemButton 
                                key={item.type}
                                label={item.label}
                                icon={item.icon}
                                color={item.color}
                                onClick={() => handleItemClick(item.type)}
                                style={{ animationDelay: `${index * 25}ms` }}
                            />
                        )
                    })}
                </div>
            </div>

            {selectedType && (
                <ItemCreationForm
                    key={selectedType} // Reset component on type change
                    itemType={selectedType}
                    onClose={handleCloseForm}
                    setActiveScreen={setActiveScreen}
                />
            )}
        </div>
    );
};

export default AddScreen;