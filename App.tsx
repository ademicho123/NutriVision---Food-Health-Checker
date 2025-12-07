import React, { useState, useEffect } from 'react';
import { UploadSection } from './components/UploadSection';
import { ProcessingView } from './components/ProcessingView';
import { ResultsView } from './components/ResultsView';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { AnalysisState, FoodAnalysisResult, HistoryItem, UserSettings } from './types';
import { analyzeFoodImage } from './services/geminiService';
import { History, Settings, Clock, Menu } from 'lucide-react';

const App: React.FC = () => {
  // Main Analysis State
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    image: null,
    result: null,
    error: null,
    progress: 0
  });

  // App Features State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ dietaryPreferences: [] });
  const [activeModal, setActiveModal] = useState<'none' | 'history' | 'settings'>('none');

  // Load persistence on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('nutrivision_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const savedSettings = localStorage.getItem('nutrivision_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  // Simulate progress when status changes to 'analyzing'
  useEffect(() => {
    let interval: any;
    if (state.status === 'analyzing') {
      setState(prev => ({ ...prev, progress: 0 }));
      interval = setInterval(() => {
        setState(prev => {
          if (prev.progress >= 90) return prev;
          const increment = Math.max(1, Math.floor(Math.random() * 10));
          return { ...prev, progress: Math.min(90, prev.progress + increment) };
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [state.status]);

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setState({
        status: 'preview',
        image: base64String,
        result: null,
        error: null,
        progress: 0
      });
    };
    reader.readAsDataURL(file);
  };

  const startAnalysis = async () => {
    if (!state.image) return;

    setState(prev => ({ ...prev, status: 'analyzing', error: null }));

    try {
      const data = await analyzeFoodImage(state.image, settings);
      
      // Save to History
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        image: state.image,
        result: data
      };
      
      const updatedHistory = [newHistoryItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('nutrivision_history', JSON.stringify(updatedHistory));

      // Complete progress bar
      setState(prev => ({ ...prev, progress: 100 }));
      
      setTimeout(() => {
        setState(prev => ({ 
          ...prev, 
          status: 'complete', 
          result: data 
        }));
      }, 600);

    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: err.message || "Failed to analyze image" 
      }));
    }
  };

  const handleReset = () => {
    setState({
      status: 'idle',
      image: null,
      result: null,
      error: null,
      progress: 0
    });
  };

  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('nutrivision_settings', JSON.stringify(newSettings));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('nutrivision_history');
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setState({
      status: 'complete',
      image: item.image,
      result: item.result,
      error: null,
      progress: 100
    });
    setActiveModal('none');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="bg-emerald-500 text-white p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8.5 8.5 0 0 0 0 17 8.5 8.5 0 0 0 0-17z"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Food<span className="text-emerald-500">Cal</span></h1>
          </div>
          <nav className="flex gap-4 text-sm font-medium text-slate-600">
            <button 
              onClick={() => setActiveModal('history')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-emerald-600 transition-colors"
            >
              <History size={18} />
              <span className="hidden md:inline">History</span>
            </button>
            <button 
              onClick={() => setActiveModal('settings')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-emerald-600 transition-colors"
            >
              <Settings size={18} />
              <span className="hidden md:inline">Settings</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 relative">
        
        {state.status === 'idle' && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
                Your Personal AI <br/>
                <span className="text-emerald-500">Nutrition Assistant</span>
              </h2>
              <p className="text-lg text-slate-500">
                Snap a photo of your meal. Get instant calories, macros, and healthy improvement tips powered by Gemini 3.0 Flash.
              </p>
            </div>
            <UploadSection onImageSelect={handleImageSelect} />
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
               {[
                 { title: "Instant Analysis", desc: "Get calories and macros in seconds.", icon: "⚡" },
                 { title: "Smart Swaps", desc: "Discover healthier ingredient alternatives.", icon: "🥑" },
                 { title: "Health Score", desc: "Rate your meal balance from 0-100.", icon: "🎯" }
               ].map((f, i) => (
                 <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-200 transition-colors">
                    <div className="text-3xl mb-3">{f.icon}</div>
                    <h3 className="font-bold text-slate-800 mb-1">{f.title}</h3>
                    <p className="text-slate-500 text-sm">{f.desc}</p>
                 </div>
               ))}
            </div>
          </div>
        )}

        {state.status === 'preview' && state.image && (
          <div className="max-w-2xl mx-auto text-center animate-[fadeIn_0.3s_ease-out]">
             <div className="bg-white p-3 rounded-3xl shadow-lg border border-slate-100 inline-block mb-8">
               <img src={state.image} alt="Preview" className="max-h-80 rounded-2xl object-cover" />
             </div>
             <div className="flex gap-4 justify-center">
                <button 
                  onClick={handleReset}
                  className="px-6 py-3 rounded-full font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={startAnalysis}
                  className="px-8 py-3 bg-emerald-500 text-white rounded-full font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 hover:scale-105 transition-all flex items-center gap-2"
                >
                  <span className="text-lg">✨</span> Analyze Meal
                </button>
             </div>
          </div>
        )}

        {state.status === 'analyzing' && (
          <ProcessingView progress={state.progress} />
        )}

        {state.status === 'error' && (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="bg-red-50 text-red-500 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Analysis Failed</h3>
            <p className="text-slate-500 mb-6">{state.error}</p>
            <button 
              onClick={handleReset}
              className="px-6 py-2 bg-slate-800 text-white rounded-full font-medium hover:bg-slate-900"
            >
              Try Again
            </button>
          </div>
        )}

        {state.status === 'complete' && state.result && state.image && (
          <ResultsView 
            result={state.result} 
            imageSrc={state.image} 
            onReset={handleReset} 
          />
        )}
      </main>

      {/* Modals */}
      <HistoryModal 
        isOpen={activeModal === 'history'}
        onClose={() => setActiveModal('none')}
        history={history}
        onSelect={loadHistoryItem}
        onClear={handleClearHistory}
      />
      
      <SettingsModal 
        isOpen={activeModal === 'settings'}
        onClose={() => setActiveModal('none')}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;