import React from 'react';
import { 
    SparklesIcon, LightbulbIcon, ClipboardListIcon, CheckCircleIcon, LinkIcon, 
    SummarizeIcon, UserIcon, BookOpenIcon, TargetIcon, DumbbellIcon, FeedIcon, 
    ChartBarIcon, BrainCircuitIcon 
} from './icons';

// A map from string identifiers to the actual icon components
const iconMap: { [key: string]: React.FC<any> } = {
    sparkles: SparklesIcon,
    lightbulb: LightbulbIcon,
    clipboard: ClipboardListIcon,
    'check-circle': CheckCircleIcon,
    link: LinkIcon,
    summarize: SummarizeIcon,
    user: UserIcon,
    'book-open': BookOpenIcon,
    target: TargetIcon,
    dumbbell: DumbbellIcon,
    feed: FeedIcon,
    'chart-bar': ChartBarIcon,
    brain: BrainCircuitIcon,
};

/**
 * A utility function to get an icon component by its string name.
 * @param name The string identifier for the icon.
 * @returns The React component for the icon, or a default fallback.
 */
export const getIconForName = (name: string): React.FC<any> => {
    return iconMap[name] || SparklesIcon; // Return SparklesIcon as a fallback
};