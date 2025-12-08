import React, { useEffect } from 'react';
import { CheckCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, type = 'success' }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[70] flex items-center gap-3 bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl animate-[slideUp_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)] min-w-[300px] max-w-md"
      data-testid="toast-notification"
    >
      <div className={`${type === 'success' ? 'text-emerald-400' : 'text-blue-400'}`}>
        {type === 'success' ? <CheckCircle size={24} /> : <Info size={24} />}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm leading-relaxed">{message}</p>
      </div>
      <button 
        onClick={onClose}
        className="text-slate-400 hover:text-white transition-colors p-1"
      >
        <X size={18} />
      </button>
    </div>
  );
};
