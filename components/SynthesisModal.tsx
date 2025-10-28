import React from 'react';
import { CloseIcon } from './icons';
import MarkdownRenderer from './MarkdownRenderer';

interface SynthesisModalProps {
  synthesisResult: string | null;
  onClose: () => void;
  isLoading: boolean;
}

const SynthesisModal: React.FC<SynthesisModalProps> = ({ synthesisResult, onClose, isLoading }) => {
  if (!synthesisResult && !isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end justify-center z-50" onClick={onClose}>
      <div 
        className="bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-t-2xl shadow-lg flex flex-col transform animate-slide-up border-t border-blue-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        `}</style>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-gray-100">סינתזת תוכן</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-full text-center text-gray-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mb-4"></div>
              <p>הבינה המלאכותית מנתחת את התוכן...</p>
              <p className="text-xs text-gray-600">זה עשוי לקחת מספר רגעים.</p>
            </div>
          ) : (
             <MarkdownRenderer content={synthesisResult || ''} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SynthesisModal;
