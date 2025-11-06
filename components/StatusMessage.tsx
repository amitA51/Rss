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

const StatusMessage: React.FC<StatusMessageProps> = ({ type, message, onDismiss, onUndo, duration = 2500 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  const handleUndo = async () => {
    if (onUndo) {
        await onUndo();
    }
    onDismiss();
  };

  const isSuccess = type === 'success';
  const isError = type === 'error';

  const textColor = isSuccess ? 'text-[var(--success)]' : isError ? 'text-[var(--danger)]' : 'text-blue-300';

  return (
    <div 
        className={`fixed bottom-24 right-1/2 translate-x-1/2 z-50 animate-slide-up-in`}
        role="alert"
    >
      <div className="glass-modal-bg flex items-center gap-3 py-3 px-5 rounded-full text-sm font-semibold shadow-2xl">
          <div className={textColor}>
            {isSuccess ? <CheckCheckIcon className="w-5 h-5"/> : <WarningIcon className="w-5 h-5"/>}
          </div>
          <span className="flex-grow text-white">{message}</span>
          {onUndo && (
            <button onClick={handleUndo} className="font-bold text-[var(--dynamic-accent-highlight)] hover:underline whitespace-nowrap ml-4 pl-4 border-l border-white/20">
                בטל
            </button>
          )}
      </div>
    </div>
  );
};

export default StatusMessage;