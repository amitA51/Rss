import React, { useState, useEffect } from 'react';
import { CheckCheckIcon, WarningIcon } from './icons';

export type StatusMessageType = 'success' | 'error' | 'info';

interface StatusMessageProps {
  type: StatusMessageType;
  message: string;
  onDismiss: () => void;
  onUndo?: () => Promise<void> | void;
  duration?: number;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ type, message, onDismiss, onUndo, duration = 5000 }) => {
  useEffect(() => {
    if (!onUndo) { // Only set timeout if there's no undo action
        const timer = setTimeout(() => {
          onDismiss();
        }, duration);
        return () => clearTimeout(timer);
    }
  }, [onDismiss, duration, onUndo]);

  const handleUndo = async () => {
    if (onUndo) {
        await onUndo();
    }
    onDismiss();
  };

  const isSuccess = type === 'success';
  const isError = type === 'error';

  const bgColor = isSuccess ? 'bg-green-500/20' : isError ? 'bg-red-500/20' : 'bg-blue-500/20';
  const textColor = isSuccess ? 'text-green-300' : isError ? 'text-red-300' : 'text-blue-300';
  const borderColor = isSuccess ? 'border-green-500/30' : isError ? 'border-red-500/30' : 'border-blue-500/30';

  return (
    <div 
        className={`flex items-center gap-4 p-3 rounded-xl text-sm font-semibold animate-slide-up-in fixed bottom-24 right-4 left-4 sm:left-auto max-w-md mx-auto sm:mx-0 z-50 border ${bgColor} ${textColor} ${borderColor} backdrop-blur-sm shadow-lg`}
        role="alert"
    >
      {isSuccess ? <CheckCheckIcon className="w-5 h-5"/> : <WarningIcon className="w-5 h-5"/>}
      <span className="flex-grow">{message}</span>
      {onUndo && (
        <button onClick={handleUndo} className="font-bold text-white hover:underline whitespace-nowrap">
            בטל
        </button>
      )}
    </div>
  );
};

export default StatusMessage;