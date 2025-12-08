import React from 'react';
import { X, Check, Target, BookOpen, Bot, Bell, FileText } from 'lucide-react';
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

const AGENTS = [
  { id: "hydration_reminder", label: "Hydration Coach", desc: "Reminds you to drink water.", icon: <Bell size={14}/> },
  { id: "weekly_report", label: "Weekly Reporter", desc: "Summarizes your week every Sunday.", icon: <FileText size={14}/> },
  { id: "sugar_watch", label: "Sugar Watchdog", desc: "Warns about high sugar content.", icon: <Bot size={14}/> },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = React.useState<UserSettings>(settings);
  const [activeTab, setActiveTab] = React.useState<'pattern' | 'agents'>('pattern');

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

  const toggleAgent = (agentId: string) => {
    const current = localSettings.activeAgents || [];
    const updated = current.includes(agentId)
      ? current.filter(a => a !== agentId)
      : [...current, agentId];
    setLocalSettings({ ...localSettings, activeAgents: updated });
  };

  const handleInputChange = (field: keyof UserSettings, value: any) => {
    setLocalSettings({ ...localSettings, [field]: value });
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Dietary Profile</h2>
            <p className="text-xs text-slate-500">Configure your personal nutrition system</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
           <button 
             onClick={() => setActiveTab('pattern')}
             className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'pattern' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             Diet Pattern & Rules
           </button>
           <button 
             onClick={() => setActiveTab('agents')}
             className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'agents' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             AI Agents & Tools
           </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          
          {activeTab === 'pattern' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              {/* Goals */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Target size={14} /> Daily Targets
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Calorie Budget (kcal)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 2000" 
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    value={localSettings.dailyCalorieTarget || ''}
                    onChange={(e) => handleInputChange('dailyCalorieTarget', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>

              {/* Custom Rules */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen size={14} /> Custom Pattern
                </h3>
                <textarea 
                  placeholder="Describe your diet (e.g., 'Intermittent Fasting 16:8', 'High Protein for muscle gain', 'No processed sugar'). The AI will analyze every meal against these rules." 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all min-h-[100px] text-sm resize-none"
                  value={localSettings.customDietRules || ''}
                  onChange={(e) => handleInputChange('customDietRules', e.target.value)}
                />
              </div>

              {/* Preferences */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Strict Preferences</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PREFERENCES.map(pref => {
                    const isSelected = localSettings.dietaryPreferences.includes(pref);
                    return (
                      <button
                        key={pref}
                        onClick={() => togglePreference(pref)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs ${
                          isSelected 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
                        }`}
                      >
                        {pref}
                        {isSelected && <Check size={14} className="text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
             <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                  <p className="text-sm text-blue-800 flex gap-2">
                    <Bot size={18} className="shrink-0"/>
                    <span>Enable specialized AI Agents to automate tasks and keep you on track.</span>
                  </p>
                </div>

                {AGENTS.map(agent => {
                  const isActive = (localSettings.activeAgents || []).includes(agent.id);
                  return (
                    <div 
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                        isActive 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${isActive ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {agent.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className={`font-bold ${isActive ? 'text-emerald-900' : 'text-slate-700'}`}>{agent.label}</h4>
                          {isActive && <span className="text-xs font-bold text-emerald-600 bg-emerald-200 px-2 py-0.5 rounded-full">Active</span>}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{agent.desc}</p>
                      </div>
                    </div>
                  );
                })}
             </div>
          )}

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-colors w-full sm:w-auto"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};