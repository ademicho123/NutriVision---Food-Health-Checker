import React from 'react';
import { X, Check } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
}

const PREFERENCES = [
  "Vegetarian",
  "Vegan",
  "Gluten Free",
  "Keto",
  "Paleo",
  "Dairy Free",
  "Nut Free",
  "Low Carb"
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<UserSettings>(settings);

  // Sync with props when modal opens
  React.useEffect(() => {
    if (isOpen) setLocalSettings(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const togglePreference = (pref: string) => {
    const current = localSettings.dietaryPreferences;
    const updated = current.includes(pref)
      ? current.filter(p => p !== pref)
      : [...current, pref];
    
    setLocalSettings({ ...localSettings, dietaryPreferences: updated });
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Settings</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Dietary Preferences</h3>
            <p className="text-sm text-slate-500 mb-4">Select any preferences to help AI better analyze your food health score.</p>
            
            <div className="grid grid-cols-2 gap-3">
              {PREFERENCES.map(pref => {
                const isSelected = localSettings.dietaryPreferences.includes(pref);
                return (
                  <button
                    key={pref}
                    onClick={() => togglePreference(pref)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                    }`}
                  >
                    {pref}
                    {isSelected && <Check size={16} className="text-emerald-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};