import React, { useState, useRef, useMemo, useCallback, useEffect, DragEvent } from 'react';
import { ViewProps, EditProps } from './common';
import { PersonalItem, RoadmapPhase, RoadmapTask, Attachment } from '../../types';
import { DragHandleIcon, AddIcon, TrashIcon, SparklesIcon, CopyIcon, LayoutDashboardIcon, ListIcon, getFileIcon, UploadIcon, CalendarIcon, DownloadIcon, MicrophoneIcon, ChevronLeftIcon, CheckCircleIcon } from '../icons';
import ErrorBoundary from '../ErrorBoundary';
import LoadingSpinner from '../LoadingSpinner';
import DailyProgressCircle from '../DailyProgressCircle';

// --- Types ---
type RoadmapViewMode = 'list' | 'kanban' | 'timeline';
type Status = 'pending' | 'active' | 'completed';
type ActiveTab = 'overview' | 'tasks' | 'notes' | 'files' | 'analytics' | 'ai';

interface RoadmapScreenProps {
    item: PersonalItem;
    onUpdate: (id: string, updates: Partial<PersonalItem>) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

// --- Mock Data ---
const today = new Date();
const formatDate = (date: Date): string => date.toISOString().split('T')[0];
const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
const sampleRoadmapData: RoadmapPhase[] = [
    {
      id:"s1", title:"שלב 1: חזון ומטרות", description:"הגדרת מטרת-על ומדדי הצלחה ברורים לפרויקט.", order: 0, status: "completed",
      duration: "2 days",
      startDate: formatDate(today), endDate: formatDate(addDays(today, 2)),
      attachments: [], dependencies: [], estimatedHours: 4, notes: "## מחשבות ראשוניות\n- להתמקד בבעיה המרכזית של המשתמש\n- להגדיר KPI מדיד",
      tasks:[ { id: "t1-1", title: "הגדרת מדדי הצלחה (KPIs)", isCompleted: true, order: 0 } ],
      aiSummary: 'This stage is about laying a solid foundation by defining clear, measurable goals.',
      aiActions: ['Draft a project brief', 'Identify key stakeholders', 'Setup analytics dashboard'],
      aiQuote: 'A goal without a plan is just a wish.'
    },
];

// --- Sub-Components ---
const Confetti: React.FC = () => (
    <div className="confetti">
        {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="confetti-piece" style={{
                left: `${Math.random() * 100}%`,
                transform: `rotate(${Math.random() * 360}deg)`,
                animation: `confetti-fall ${Math.random() * 2 + 3}s ${Math.random() * 2}s linear infinite`
            }}></div>
        ))}
    </div>
);

const TaskItem: React.FC<{ task: RoadmapTask; onToggle: () => void; }> = ({ task, onToggle }) => (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
        <input type="checkbox" checked={task.isCompleted} onChange={onToggle} className="roadmap-task-checkbox" aria-label={task.title} />
        <span className={`flex-1 ${task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-100'}`}>{task.title}</span>
    </div>
);

const TasksTab: React.FC<{ stage: RoadmapPhase; onUpdate: (updates: Partial<RoadmapPhase>) => void; }> = ({ stage, onUpdate }) => {
    const handleToggleTask = (taskId: string) => {
        const newTasks = stage.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t);
        onUpdate({ tasks: newTasks });
    };

    return (
        <div className="space-y-2">
            {stage.tasks.map(task => <TaskItem key={task.id} task={task} onToggle={() => handleToggleTask(task.id)} />)}
        </div>
    );
};

const NotesTab: React.FC<{ stage: RoadmapPhase; onUpdate: (updates: Partial<RoadmapPhase>) => void; showToast: (message: string) => void; }> = ({ stage, onUpdate, showToast }) => {
    const [noteContent, setNoteContent] = useState(stage.notes || '');

    const handleSaveNotes = () => {
        if (stage.notes !== noteContent) {
            onUpdate({ notes: noteContent });
            showToast('הפתק נשמר ✅');
        }
    };

    return (
        <textarea
            value={noteContent}
            onChange={e => setNoteContent(e.target.value)}
            onBlur={handleSaveNotes}
            rows={8}
            className="w-full bg-black/20 text-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-[var(--accent-start)] focus:outline-none"
            placeholder="כתוב כאן את הפתקים והמחשבות שלך..."
        />
    );
};

const AiInsightsTab: React.FC<{ stage: RoadmapPhase }> = ({ stage }) => (
    <div className="space-y-4">
        <div>
            <h4 className="font-semibold text-sm text-gray-400 mb-1">סיכום AI</h4>
            <p className="text-gray-200 bg-black/20 p-3 rounded-lg">{stage.aiSummary || 'לחץ על "נתח שלב" כדי ליצור סיכום.'}</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm text-gray-400 mb-1">3 הפעולות הבאות המומלצות</h4>
            <ul className="list-disc list-inside text-gray-200 bg-black/20 p-3 rounded-lg space-y-1">
                {(stage.aiActions && stage.aiActions.length > 0) ? stage.aiActions.map((action, i) => <li key={i}>{action}</li>) : <li>אין המלצות זמינות.</li>}
            </ul>
        </div>
        <div>
            <h4 className="font-semibold text-sm text-gray-400 mb-1">ציטוט מוטיבציה</h4>
            <blockquote className="text-gray-200 bg-black/20 p-3 rounded-lg border-r-4 border-[var(--accent-start)] italic">
                {stage.aiQuote || 'המשך להתקדם!'}
            </blockquote>
        </div>
    </div>
);

const FilesTab: React.FC = () => <div className="text-center text-gray-500 py-8">ניהול קבצים יתווסף בקרוב.</div>;

const SimpleBarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0) || 1;
    return (
        <div className="simple-bar-chart flex items-end gap-2 h-32 p-2 bg-black/20 rounded-lg">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex-1 w-full flex items-end">
                        <div
                            className="bar w-full rounded-t-sm bg-[var(--accent-start)] opacity-70"
                            style={{ height: `${(d.value / maxValue) * 100}%` }}
                            title={`${d.label}: ${d.value}`}
                        ></div>
                    </div>
                    <span className="text-xs text-gray-400">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

const AnalyticsTab: React.FC<{ stage: RoadmapPhase }> = ({ stage }) => {
    const mockChartData = [
        { label: 'ש\' 1', value: 2 }, { label: 'ש\' 2', value: 5 }, { label: 'ש\' 3', value: 3 },
        { label: 'ש\' 4', value: 7 }, { label: 'ש\' 5', value: 4 }, { label: 'ש\' 6', value: 6 },
        { label: 'היום', value: 8 },
    ];
    const progress = stage.tasks.length > 0 ? Math.round(stage.tasks.filter(t=>t.isCompleted).length/stage.tasks.length*100) : 0;
    return (
        <div className="space-y-4">
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="roadmap-stat-card">
                    <p className="text-sm text-gray-400">התקדמות</p>
                    <p className="text-xl font-bold text-white">{progress}%</p>
                </div>
                 <div className="roadmap-stat-card">
                    <p className="text-sm text-gray-400">זמן מוערך</p>
                    <p className="text-xl font-bold text-white">{stage.estimatedHours} שעות</p>
                </div>
                 <div className="roadmap-stat-card">
                    <p className="text-sm text-gray-400">זמן בפועל</p>
                    <p className="text-xl font-bold text-white">~{stage.estimatedHours * 0.8} שעות</p>
                </div>
            </div>
            <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">פעילות שבועית (משימות שהושלמו)</h4>
                <SimpleBarChart data={mockChartData} />
            </div>
        </div>
    );
};

const OverallProgressSummary: React.FC<{ progress: number; text: string }> = ({ progress, text }) => (
    <div className="themed-card flex items-center gap-4 p-4">
        <DailyProgressCircle percentage={progress} size={64} />
        <div>
            <h2 className="text-xl font-bold text-white">אתה {Math.round(progress)}% יותר קרוב למטרה!</h2>
            <p className="text-gray-300">{text}</p>
        </div>
    </div>
);

const StageCard: React.FC<{ stage: RoadmapPhase; onUpdate: (updates: Partial<RoadmapPhase>) => void; onDelete: () => void; showToast: (message: string) => void }> = ({ stage, onUpdate, onDelete, showToast }) => {
    const [isExpanded, setIsExpanded] = useState(stage.status === 'active');
    const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');
    const [showConfetti, setShowConfetti] = useState(false);

    const { progress, status, statusColor, isCompleted, completedTasks, totalTasks } = useMemo(() => {
        const completed = stage.tasks.filter(t => t.isCompleted).length;
        const total = stage.tasks.length;
        const prog = total > 0 ? (completed / total) * 100 : (stage.status === 'completed' ? 100 : 0);
        const hasCompleted = prog === 100 && total > 0;
        
        let currentStatus: Status = stage.status;
        if (hasCompleted && stage.status !== 'completed') currentStatus = 'completed';
        else if (prog > 0 && stage.status === 'pending') currentStatus = 'active';

        // FIX: The 'active' status was missing a 'color' property and had an incorrect 'label'.
        const statusMap = {
            completed: { label: 'הושלם', color: 'var(--success)'},
            active: { label: 'פעיל', color: '#3B82F6'},
            pending: { label: 'ממתין', color: 'var(--text-secondary)'}
        };

        return { progress: prog, isCompleted: hasCompleted, status: statusMap[currentStatus].label, statusColor: statusMap[currentStatus].color, completedTasks: completed, totalTasks: total };
    }, [stage.tasks, stage.status]);

    useEffect(() => {
        if (isCompleted && stage.status !== 'completed') {
            onUpdate({ status: 'completed' });
            setShowConfetti(true);
            showToast('ציון דרך הושג! 🎉');
            setTimeout(() => setShowConfetti(false), 5000);
        }
    }, [isCompleted, stage.status, onUpdate, showToast]);

    const tabs: { id: ActiveTab; label: string }[] = [ { id: 'tasks', label: 'משימות' }, { id: 'notes', label: 'פתקים' }, { id: 'ai', label: 'תובנות AI' }, { id: 'analytics', label: 'ניתוח' }, { id: 'files', label: 'קבצים' }];

    return (
        <div className="roadmap-stage-card-v2 overflow-hidden">
            {showConfetti && <Confetti />}
            <div onClick={() => setIsExpanded(!isExpanded)} className="p-4 cursor-pointer">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold" style={{ color: statusColor }}>{stage.order + 1}</span>
                        <h3 className="text-xl font-bold text-white">{stage.title}</h3>
                        <span className="text-sm font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>{status}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">{completedTasks}/{totalTasks} משימות</span>
                        <ChevronLeftIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-0'}`} />
                    </div>
                </div>
                <div className="mt-2 mr-10">
                     <p className="text-sm text-gray-400 mb-2">{stage.description}</p>
                    <div className="w-full bg-black/20 rounded-full h-1.5">
                        <div className="bg-[var(--accent-gradient)] h-1.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}></div>
                    </div>
                </div>
            </div>
            
            <div style={{ maxHeight: isExpanded ? '1000px' : '0px', transition: 'max-height 0.3s ease-out' }}>
                <div className="border-b border-t border-[var(--border-primary)] px-4 flex items-center gap-4 overflow-x-auto stage-tabs">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }} className={`stage-tab-button py-2 px-1 text-sm font-semibold shrink-0 ${activeTab === tab.id ? 'text-white active' : 'text-gray-400 hover:text-white'}`}>{tab.label}</button>
                    ))}
                </div>
                <div className="p-4 tab-panel">
                    {activeTab === 'tasks' && <TasksTab stage={stage} onUpdate={onUpdate} />}
                    {activeTab === 'notes' && <NotesTab stage={stage} onUpdate={onUpdate} showToast={showToast} />}
                    {activeTab === 'files' && <FilesTab />}
                    {activeTab === 'ai' && <AiInsightsTab stage={stage} />}
                    {activeTab === 'analytics' && <AnalyticsTab stage={stage} />}
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
const RoadmapScreen: React.FC<RoadmapScreenProps> = ({ item, onUpdate, onDelete, onClose }) => {
    const [phases, setPhases] = useState<RoadmapPhase[]>(item.phases && item.phases.length > 0 ? [...item.phases].sort((a,b) => a.order - b.order) : sampleRoadmapData);
    const [toastMessage, setToastMessage] = useState('');

    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3000);
    }, []);

    const updatePhases = (newPhases: RoadmapPhase[], toastMessage?: string) => {
        const sortedPhases = newPhases.map((p, i) => ({ ...p, order: i }));
        setPhases(sortedPhases);
        onUpdate(item.id, { phases: sortedPhases });
        if (toastMessage) {
            showToast(toastMessage);
        }
    };

    const { overallProgress, motivationalText } = useMemo(() => {
        const allTasks = phases.flatMap(p => p.tasks);
        if (allTasks.length === 0) return { overallProgress: 0, motivationalText: "בוא נתחיל להוסיף משימות!" };
        
        const completedTasks = allTasks.filter(t => t.isCompleted).length;
        const progress = (completedTasks / allTasks.length) * 100;
        
        let text = "בוא נתחיל!";
        if (progress > 0 && progress < 30) text = "אתה בדרך הנכונה!";
        if (progress >= 30 && progress < 70) text = "התקדמות מצוינת!";
        if (progress >= 70 && progress < 100) text = "כמעט שם, המשך כך!";
        if (progress === 100) text = "המטרה הושגה! כל הכבוד!";
        
        return { overallProgress: progress, motivationalText: text };
    }, [phases]);

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 roadmap-modal-overlay roadmap-no-print" onClick={onClose}>
        <div className="roadmap-modal-content bg-black w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
          <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white"><ChevronLeftIcon className="w-6 h-6"/></button>
              <div>
                <p className="text-sm text-[var(--dynamic-accent-highlight)]">מפת דרכים</p>
                <h1 className="text-2xl font-bold text-white">{item.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => showToast('שוכפל')} className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white"><CopyIcon className="w-5 h-5"/></button>
                <button onClick={() => showToast('יוצא...')} className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white"><DownloadIcon className="w-5 h-5"/></button>
                <button onClick={() => onDelete(item.id)} className="p-2 rounded-full text-gray-400 hover:bg-red-500/10 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 space-y-4">
              <OverallProgressSummary progress={overallProgress} text={motivationalText} />
              {phases.map(phase => (
                  <StageCard 
                      key={phase.id}
                      stage={phase}
                      onUpdate={(updates) => updatePhases(phases.map(p => p.id === phase.id ? {...p, ...updates} : p))}
                      onDelete={() => updatePhases(phases.filter(p => p.id !== phase.id), "השלב נמחק")}
                      showToast={showToast}
                  />
              ))}
          </main>
          {toastMessage && <div className="roadmap-toast bg-green-500/20 text-green-300 text-sm font-semibold py-2 px-4 rounded-full flex items-center gap-2"><CheckCircleIcon className="w-5 h-5"/> {toastMessage}</div>}
           <button onClick={() => showToast('AI מסכם את ההתקדמות שלך...')} className="fab" aria-label="Summarize my progress">
                <SparklesIcon className="w-7 h-7 text-white" />
            </button>
        </div>
      </div>
    );
};

export default RoadmapScreen;