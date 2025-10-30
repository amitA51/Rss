import React from 'react';
import { CloseIcon } from './icons';
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-900/80 backdrop-blur-xl w-full max-w-2xl max-h-[90vh] rounded-t-2xl shadow-lg flex flex-col transform animate-slide-up border-t border-purple-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        `}</style>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
          <h2 className="text-xl font-bold text-gray-100">תדריך יומי</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-full text-center text-gray-400">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mb-4"></div>
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
