import React from 'react';
import { CloseIcon, SparklesIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';

interface DailyBriefingModalProps {
  briefingContent: string;
  onClose: () => void;
  isLoading: boolean;
}

const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({ briefingContent, onClose, isLoading }) => {

  const loadingMessages = [
    "מנתח עדכונים אחרונים...",
    "מזהה תובנות מרכזיות...",
    "מרכיב את התדריך האישי שלך...",
  ];

  const [currentLoadingMessage, setCurrentLoadingMessage] = React.useState(loadingMessages[0]);

  React.useEffect(() => {
    if (isLoading) {
      let i = 0;
      setCurrentLoadingMessage(loadingMessages[0]);
      const interval = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setCurrentLoadingMessage(loadingMessages[i]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" 
      onClick={onClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        className="bg-[var(--bg-secondary)] w-full max-w-2xl max-h-[90vh] responsive-modal rounded-t-3xl shadow-lg flex flex-col border-t border-[var(--border-primary)] animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        <header className="p-4 border-b border-[var(--border-primary)] flex justify-between items-center sticky top-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm z-10 rounded-t-3xl">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-[var(--accent-highlight)]" />
            תדריך יומי
          </h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 rounded-full active:scale-95">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-full text-center text-[var(--text-secondary)]">
              <div className="w-2 h-2 bg-[var(--dynamic-accent-start)] rounded-full animate-pulse mb-4"></div>
              <p className="transition-opacity duration-500">{currentLoadingMessage}</p>
            </div>
          ) : (
             <MarkdownRenderer content={briefingContent || ''} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyBriefingModal;