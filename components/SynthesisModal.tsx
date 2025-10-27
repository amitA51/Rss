import React from 'react';
import { CloseIcon } from './icons';

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
        className="bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-t-2xl shadow-lg flex flex-col transform animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .animate-slide-up { animation: slide-up 0.3s ease-out; }
        `}</style>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
          <h2 className="text-xl font-bold text-gray-100">סינתזת תוכן</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-400">הבינה המלאכותית מנתחת את התוכן...</p>
            </div>
          ) : (
             <div 
                className="prose prose-invert prose-base max-w-none text-gray-300" 
                dangerouslySetInnerHTML={{ __html: synthesisResult ? synthesisResult.replace(/\n/g, '<br />') : '' }}
             />

          )}
        </div>
      </div>
    </div>
  );
};

export default SynthesisModal;
