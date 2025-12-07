import React, { useState } from 'react';
import { X, Calendar, ChevronRight, Trash2 } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onSelect, onClear }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  // Reset confirmation state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) setIsConfirming(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    onClear();
    setIsConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-lg max-h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Meal History</h2>
            <p className="text-sm text-slate-500">{history.length} meals analyzed</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-6 space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="mb-4 text-4xl">🕰️</div>
              <p>No history yet.</p>
              <p className="text-sm">Scan your first meal to get started!</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => onSelect(item)}
                className="group flex gap-4 p-3 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all cursor-pointer"
              >
                <img 
                  src={item.image} 
                  alt="Meal thumbnail" 
                  className="w-20 h-20 rounded-xl object-cover border border-slate-100"
                />
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-slate-800 line-clamp-1">
                      {item.result.foodItems[0]?.name || "Unknown Meal"}
                    </h3>
                    <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {item.result.totalCalories} kcal
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.result.healthScore >= 70 ? 'bg-emerald-500' : item.result.healthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                        style={{ width: `${item.result.healthScore}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-slate-600">{item.result.healthScore}/100</span>
                  </div>
                </div>
                <div className="self-center text-slate-300 group-hover:text-emerald-400 transition-colors">
                  <ChevronRight size={20} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            {!isConfirming ? (
              <button 
                onClick={() => setIsConfirming(true)}
                className="w-full py-3 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
                type="button"
              >
                <Trash2 size={16} />
                Clear History
              </button>
            ) : (
              <div className="flex gap-3 animate-[fadeIn_0.2s_ease-out]">
                <button 
                  onClick={() => setIsConfirming(false)}
                  className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm font-medium"
                  type="button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleClear}
                  className="flex-1 py-3 bg-red-500 text-white hover:bg-red-600 rounded-xl transition-colors text-sm font-medium shadow-md shadow-red-200"
                  type="button"
                >
                  Yes, Clear All
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};