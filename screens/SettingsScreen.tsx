import React, { useState, useEffect, useRef } from 'react';
import type { AppSettings } from '../types';
import { loadSettings, saveSettings, wipeAllData } from '../services/settingsService';
import { exportAllData, importAllData } from '../services/geminiService';
import { HomeIcon, AiChipIcon, DatabaseIcon, DownloadIcon, UploadIcon, WarningIcon, FeedIcon, UserIcon, FileIcon } from '../components/icons';
import ToggleSwitch from '../components/ToggleSwitch';
import ManageContentModal from '../components/ManageContentModal';

const SettingsCard: React.FC<{title: string, children: React.ReactNode, icon: React.ReactNode}> = ({ title, children, icon }) => (
  <div className="bg-gray-900/50 border border-[var(--border-color)] rounded-xl shadow-lg">
    <div className="flex items-center gap-3 p-4 border-b border-[var(--border-color)]">
        {icon}
        <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
    </div>
    <div className="p-4 sm:p-6">
        {children}
    </div>
  </div>
);

const SettingsScreen: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings>(loadSettings);
    const [isManageContentOpen, setIsManageContentOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        saveSettings(settings);
    }, [settings]);

    const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleExport = () => {
        const jsonData = exportAllData();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spark_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string') {
                importAllData(result);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset for next import
    };
    
    return (
    <>
      <div className="pt-4 space-y-8">
        <h1 className="text-3xl font-bold text-gray-100">הגדרות</h1>
        
        <SettingsCard title="כללי" icon={<HomeIcon className="w-6 h-6 text-gray-400"/>}>
            <div className="flex justify-between items-center">
                <p className="text-gray-300">מסך פתיחה</p>
                <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-full">
                    <button onClick={() => handleSettingChange('defaultScreen', 'feed')} className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${settings.defaultScreen === 'feed' ? 'bg-blue-600' : ''}`}><FeedIcon className="w-4 h-4"/> פיד</button>
                    <button onClick={() => handleSettingChange('defaultScreen', 'personal')} className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${settings.defaultScreen === 'personal' ? 'bg-blue-600' : ''}`}><UserIcon className="w-4 h-4"/> אישי</button>
                </div>
            </div>
        </SettingsCard>

        <SettingsCard title="בינה מלאכותית" icon={<AiChipIcon className="w-6 h-6 text-gray-400"/>}>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <p className="text-gray-300">מודל AI</p>
                    <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-full">
                        <button onClick={() => handleSettingChange('aiModel', 'gemini-2.5-flash')} className={`px-3 py-1 text-sm rounded-full ${settings.aiModel === 'gemini-2.5-flash' ? 'bg-blue-600' : ''}`}>Flash</button>
                        <button onClick={() => handleSettingChange('aiModel', 'gemini-2.5-pro')} className={`px-3 py-1 text-sm rounded-full ${settings.aiModel === 'gemini-2.5-pro' ? 'bg-blue-600' : ''}`}>Pro</button>
                    </div>
                </div>
                 <div className="flex justify-between items-center">
                    <div>
                        <p className="text-gray-300">סיכום אוטומטי</p>
                        <p className="text-xs text-gray-500">סכם אוטומטית פריטים חדשים בעת רענון הפיד</p>
                    </div>
                    <ToggleSwitch checked={settings.autoSummarize} onChange={(val) => handleSettingChange('autoSummarize', val)} />
                </div>
            </div>
        </SettingsCard>

        <SettingsCard title="ניהול תוכן" icon={<FileIcon className="w-6 h-6 text-gray-400"/>}>
            <p className="text-gray-400 mb-4">נהל את מקורות ה-RSS והתגיות שלך.</p>
            <button onClick={() => setIsManageContentOpen(true)} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                פתח ניהול תוכן
            </button>
        </SettingsCard>

         <SettingsCard title="ניהול נתונים" icon={<DatabaseIcon className="w-6 h-6 text-gray-400"/>}>
            <div className="space-y-3">
                 <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 bg-gray-700/80 hover:bg-gray-600/80 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    <DownloadIcon className="h-5 w-5" />
                    ייצוא כל הנתונים
                </button>
                <button onClick={handleImportClick} className="w-full flex items-center justify-center gap-2 bg-gray-700/80 hover:bg-gray-600/80 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    <UploadIcon className="h-5 w-5" />
                    ייבוא נתונים מקובץ
                </button>
                <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileSelected} className="hidden" />
                <button onClick={wipeAllData} className="w-full flex items-center justify-center gap-2 bg-red-800/80 hover:bg-red-700/80 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
                    <WarningIcon className="h-5 w-5" />
                    איפוס ומחיקת כל הנתונים
                </button>
            </div>
         </SettingsCard>

        <div className="text-center pb-4">
            <p className="text-sm text-gray-600 mt-4">Spark v2.2 - Premium Edition</p>
        </div>
      </div>
      
      {isManageContentOpen && (
        <ManageContentModal onClose={() => setIsManageContentOpen(false)} />
      )}
    </>
    );
};

export default SettingsScreen;