
import React, { useState, useEffect } from 'react';
import { UploadSection } from './components/UploadSection';
import { ProcessingView } from './components/ProcessingView';
import { ResultsView } from './components/ResultsView';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { ChatDrawer } from './components/ChatDrawer';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { Toast } from './components/Toast';
import { AnalysisState, FoodAnalysisResult, HistoryItem, UserSettings, ChatMessage } from './types';
import { analyzeFoodImage, chatWithNutritionist, AgentActions } from './services/geminiService';
import { History, Settings, MessageSquare, PlusCircle } from 'lucide-react';

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
  const [settings, setSettings] = useState<UserSettings>({ 
    dietaryPreferences: [], 
    activeAgents: [],
    customDietRules: '',
    dailyCalorieTarget: undefined
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeModal, setActiveModal] = useState<'none' | 'history' | 'settings' | 'diagnostics'>('none');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatTyping, setIsChatTyping] = useState(false);

  // Notification State
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  // Load persistence on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('nutrivision_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.error("Failed to load history", e);
    }

    try {
      const savedSettings = localStorage.getItem('nutrivision_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          ...parsed,
          activeAgents: parsed.activeAgents || [],
          dietaryPreferences: parsed.dietaryPreferences || []
        }));
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }

    try {
      const savedChat = localStorage.getItem('nutrivision_chat');
      if (savedChat) setChatMessages(JSON.parse(savedChat));
    } catch (e) {
      console.error("Failed to load chat", e);
    }
  }, []);

  // --- Helpers defined BEFORE usage to prevent Reference Errors ---

  const calculateDailyTotal = (currentHistory: HistoryItem[]) => {
    const today = new Date().toDateString();
    return currentHistory
      .filter(item => new Date(item.timestamp).toDateString() === today)
      .reduce((sum, item) => sum + item.result.totalCalories, 0);
  };

  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('nutrivision_settings', JSON.stringify(newSettings));
  };

  // --- Features Logic ---

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
      const data = await analyzeFoodImage(state.image, settings, history);
      
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        image: state.image,
        result: data
      };
      
      const updatedHistory = [newHistoryItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('nutrivision_history', JSON.stringify(updatedHistory));

      setState(prev => ({ ...prev, progress: 100 }));
      
      // Calculate status for notification
      const todayTotal = calculateDailyTotal(updatedHistory);
      let toastMsg = "";
      
      if (settings.dailyCalorieTarget) {
        const percent = Math.round((todayTotal / settings.dailyCalorieTarget) * 100);
        const remaining = settings.dailyCalorieTarget - todayTotal;
        const status = remaining >= 0 ? `${remaining} kcal left` : `${Math.abs(remaining)} kcal over`;
        toastMsg = `Logged! ${percent}% of goal used (${status}).`;
      } else {
        toastMsg = `Logged! Total: ${todayTotal} kcal. Tip: Update your Daily Goal below to track limits.`;
      }

      setTimeout(() => {
        setState(prev => ({ ...prev, status: 'complete', result: data }));
        setToast({ visible: true, message: toastMsg });
      }, 600);

    } catch (err: any) {
      setState(prev => ({ ...prev, status: 'error', error: err.message || "Failed to analyze image" }));
    }
  };

  // --- Agent Actions Definition ---
  
  const agentActions: AgentActions = {
    updateSettings: async (args: any) => {
      const newSettings = { ...settings };
      let changes = [];
      let standingInfo = "";

      if (args.dailyCalorieTarget) {
        newSettings.dailyCalorieTarget = args.dailyCalorieTarget;
        changes.push(`Target: ${args.dailyCalorieTarget} kcal`);
        
        // Calculate standing for AI response context
        const currentTotal = calculateDailyTotal(history);
        const remaining = args.dailyCalorieTarget - currentTotal;
        const percent = Math.round((currentTotal / args.dailyCalorieTarget) * 100);
        
        if (remaining >= 0) {
            standingInfo = ` You've consumed ${percent}% of your daily budget (${remaining} kcal remaining).`;
        } else {
            standingInfo = ` You've exceeded your daily budget by ${Math.abs(remaining)} kcal.`;
        }
      }
      
      if (args.customDietRules) {
        newSettings.customDietRules = args.customDietRules;
        changes.push(`Rules: "${args.customDietRules}"`);
      }
      
      if (args.addPreferences && Array.isArray(args.addPreferences)) {
        newSettings.dietaryPreferences = [...new Set([...newSettings.dietaryPreferences, ...args.addPreferences])];
        changes.push(`Added: ${args.addPreferences.join(', ')}`);
      }
      
      if (args.removePreferences && Array.isArray(args.removePreferences)) {
        newSettings.dietaryPreferences = newSettings.dietaryPreferences.filter(p => !args.removePreferences.includes(p));
        changes.push(`Removed: ${args.removePreferences.join(', ')}`);
      }

      handleSaveSettings(newSettings);
      
      if (changes.length === 0) return "No settings were changed.";
      return `Settings updated: ${changes.join(', ')}.${standingInfo}`;
    },

    logFood: async (args: any) => {
      const manualResult: FoodAnalysisResult = {
        totalCalories: args.calories,
        confidenceLevel: 'High',
        foodItems: [{
          name: args.foodName,
          calories: args.calories,
          portionEstimate: '1 serving (Manual Log)',
          ingredients: [args.foodName]
        }],
        macros: {
          protein: args.protein || 0,
          carbs: args.carbs || 0,
          fats: args.fats || 0,
          fiber: args.fiber || 0
        },
        micronutrients: [],
        healthScore: 50, // Default neutral score for manual
        healthRatingExplanation: `Manually logged meal: ${args.foodName}. Health score is estimated neutral.`,
        healthierAlternatives: [],
        allergens: [],
        dietaryTags: ["Manual Entry"],
        exerciseEquivalent: "N/A",
        cookingMethodSuggestions: "N/A",
        isManual: true
      };

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        image: "MANUAL_ENTRY_MARKER",
        result: manualResult
      };

      setHistory(prevHistory => {
        const updated = [newItem, ...prevHistory];
        localStorage.setItem('nutrivision_history', JSON.stringify(updated));
        
        const todayTotal = calculateDailyTotal(updated);
        let msg = `Logged ${args.foodName}. Today: ${todayTotal} kcal.`;
        if (settings.dailyCalorieTarget) {
           const remaining = settings.dailyCalorieTarget - todayTotal;
           const status = remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`;
           msg = `Logged ${args.foodName}. ${status}.`;
        }
        setToast({ visible: true, message: msg });
        
        return updated;
      });
      
      return `Logged ${args.foodName} (${args.calories} kcal).`;
    },

    setReminder: async (args: any) => {
      const minutes = args.minutes;
      const task = args.task;
      setTimeout(() => {
        alert(`⏰ REMINDER: ${task}`);
      }, minutes * 60000);
      return `Timer set. I will alert you in ${minutes} minutes to "${task}".`;
    }
  };

  const handleChatSubmit = async (text: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatTyping(true);

    try {
      const responseText = await chatWithNutritionist(text, history, settings, chatMessages, agentActions);
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
      setChatMessages(prev => {
        const updated = [...prev, botMsg];
        localStorage.setItem('nutrivision_chat', JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error(e);
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: "Sorry, I encountered an error. Please try again.", timestamp: Date.now() };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const handleUpdateGoal = (newGoal: number) => {
     const updated = { ...settings, dailyCalorieTarget: newGoal };
     handleSaveSettings(updated);
     
     // Calculate standing for the toast
     const currentTotal = calculateDailyTotal(history);
     const remaining = newGoal - currentTotal;
     const percent = Math.round((currentTotal / newGoal) * 100);
     
     let statusMsg = "";
     if (remaining >= 0) {
       statusMsg = `${remaining} kcal remaining`;
     } else {
       statusMsg = `${Math.abs(remaining)} kcal over budget`;
     }

     setToast({ visible: true, message: `Goal set to ${newGoal} kcal. ${statusMsg} (${percent}%).` });
  };

  // --- End-to-End Simulation ---
  const handleSimulation = (scenario: 'success' | 'error' | 'agent' | 'goal_limit' = 'success') => {
    
    // Mock Result Base
    const mockResult: FoodAnalysisResult = {
      totalCalories: 650,
      confidenceLevel: "High",
      foodItems: [
        { name: "Grilled Chicken", calories: 250, portionEstimate: "150g", ingredients: ["Chicken", "Oil"] },
        { name: "Quinoa Salad", calories: 300, portionEstimate: "1 cup", ingredients: ["Quinoa", "Veg"] },
        { name: "Avocado", calories: 100, portionEstimate: "1/2", ingredients: ["Avocado"] }
      ],
      macros: { protein: 45, carbs: 50, fats: 25, fiber: 8 },
      micronutrients: ["Vitamin C", "Potassium"],
      healthScore: 92,
      healthRatingExplanation: "Excellent balance.",
      healthierAlternatives: [],
      allergens: [],
      dietaryTags: ["High Protein"],
      exerciseEquivalent: "60 mins walk",
      cookingMethodSuggestions: "Grill is good.",
      isManual: true
    };

    if (scenario === 'error') {
      setState({
        status: 'analyzing',
        image: "MANUAL_ENTRY_MARKER", 
        result: null,
        error: null,
        progress: 0
      });
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: "Simulation: Connection Failed.",
          progress: 0
        }));
      }, 2000);
      return;
    }

    if (scenario === 'agent') {
      setIsChatOpen(true);
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: "Simulated: Log coffee (5 kcal)", timestamp: Date.now() };
      setChatMessages(prev => [...prev, userMsg]);
      setIsChatTyping(true);
      
      setTimeout(() => {
        // Execute Agent Action
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          image: "MANUAL_ENTRY_MARKER",
          result: {
            ...mockResult,
            totalCalories: 5,
            foodItems: [{ name: "Black Coffee", calories: 5, portionEstimate: "1 cup", ingredients: ["Coffee"] }],
            macros: { protein: 0, carbs: 1, fats: 0, fiber: 0 },
            healthScore: 85,
            dietaryTags: ["Low Cal"]
          }
        };
        setHistory(prev => {
           const updated = [newItem, ...prev];
           const todayTotal = calculateDailyTotal(updated);
           setToast({ visible: true, message: `Logged Coffee. Today: ${todayTotal} kcal.` });
           return updated;
        });
        
        const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: "Logged Coffee (5 kcal).", timestamp: Date.now() };
        setChatMessages(prev => [...prev, botMsg]);
        setIsChatTyping(false);
      }, 2000);
      return;
    }

    if (scenario === 'goal_limit') {
      // 1. Set a 2000 kcal Goal
      const target = 2000;
      handleSaveSettings({ ...settings, dailyCalorieTarget: target });
      
      // 2. Clear history and add a heavy meal
      const pastMeal: HistoryItem = {
         id: (Date.now() - 1000).toString(),
         timestamp: Date.now() - 1000,
         image: "MANUAL_ENTRY_MARKER",
         result: {
            ...mockResult,
            totalCalories: 1500,
            foodItems: [{ name: "Heavy Lunch", calories: 1500, portionEstimate: "Large", ingredients: ["Burger", "Fries"] }],
            macros: { protein: 40, carbs: 120, fats: 80, fiber: 5 },
            healthScore: 40
         }
      };
      
      setHistory([pastMeal]);

      // 3. Simulate analyzing a new meal that puts user over budget (600 kcal -> Total 2100)
      setState({ status: 'analyzing', image: "MANUAL_ENTRY_MARKER", result: null, error: null, progress: 0 });
      
      setTimeout(() => {
         const newResult = { 
           ...mockResult, 
           totalCalories: 600,
           foodItems: [{ name: "Dinner", calories: 600, portionEstimate: "Plate", ingredients: ["Pasta"] }] 
         };

         setHistory(prev => {
            const updated = [{ id: Date.now().toString(), timestamp: Date.now(), image: "MANUAL_ENTRY_MARKER", result: newResult }, ...prev];
            const total = 2100;
            const over = total - target;
            setToast({ visible: true, message: `Logged! Over budget by ${over} kcal.` });
            return updated;
         });

         setState(prev => ({
           ...prev,
           status: 'complete',
           result: newResult,
           progress: 100
         }));
      }, 1500);
      return;
    }

    // Default: Success
    setState({
      status: 'analyzing',
      image: "MANUAL_ENTRY_MARKER",
      result: null,
      error: null,
      progress: 0
    });

    setTimeout(() => {
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        image: "MANUAL_ENTRY_MARKER",
        result: mockResult
      };

      setHistory(prev => {
        const updated = [newItem, ...prev];
        localStorage.setItem('nutrivision_history', JSON.stringify(updated));
        
        const todayTotal = calculateDailyTotal(updated);
        setToast({ visible: true, message: `Simulated Log. Total: ${todayTotal} kcal.` });

        return updated;
      });

      setState(prev => ({
        ...prev,
        status: 'complete',
        result: mockResult,
        progress: 100
      }));
    }, 2500);
  };

  const handleClearChat = () => {
    if (chatMessages.length === 0) return;
    if (window.confirm("Clear chat history?")) {
      setChatMessages([]);
      localStorage.removeItem('nutrivision_chat');
    }
  };

  const handleReset = () => {
    setState({ status: 'idle', image: null, result: null, error: null, progress: 0 });
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={handleReset}>
            <div className="bg-emerald-500 text-white p-1.5 rounded-lg group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8.5 8.5 0 0 0 0 17 8.5 8.5 0 0 0 0-17z"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Food<span className="text-emerald-500">Cal</span></h1>
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
              <span className="hidden md:inline">Diet Profile</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 relative">
        {state.status === 'idle' && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
                Your AI <span className="text-emerald-500">Nutrition Assistant</span>
              </h2>
              <p className="text-lg text-slate-500">
                Snap a photo. Get instant analysis tailored to your personal diet rules.
              </p>
            </div>
            
            <UploadSection onImageSelect={handleImageSelect} />

            <div className="mt-12 max-w-2xl mx-auto">
              <div 
                onClick={() => setActiveModal('settings')}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-6 text-white shadow-lg cursor-pointer transform transition-all hover:scale-[1.01] hover:shadow-xl flex items-center justify-between group"
              >
                <div>
                   <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                     <PlusCircle className="text-emerald-200" /> Create Your Dietary Pattern
                   </h3>
                   <p className="text-emerald-100 text-sm opacity-90">
                     Define custom rules, set calorie targets, and enable AI Agents.
                   </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full group-hover:bg-white/30 transition-colors">
                  <Settings size={24} />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
               {[
                 { title: "Smart Memory", desc: "The AI remembers your daily intake.", icon: "🧠" },
                 { title: "Diet Agents", desc: "Ask chat to set reminders or log meals.", icon: "🤖" },
                 { title: "Instant Analysis", desc: "Get calories and macros in seconds.", icon: "⚡" }
               ].map((f, i) => (
                 <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
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

        {state.status === 'analyzing' && <ProcessingView progress={state.progress} />}

        {state.status === 'error' && (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="bg-red-50 text-red-500 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Analysis Failed</h3>
            <p className="text-slate-500 mb-6">{state.error}</p>
            <button onClick={handleReset} className="px-6 py-2 bg-slate-800 text-white rounded-full font-medium hover:bg-slate-900">
              Try Again
            </button>
          </div>
        )}

        {state.status === 'complete' && state.result && state.image && (
          <ResultsView 
            result={state.result} 
            imageSrc={state.image} 
            onReset={handleReset} 
            dailyGoal={settings.dailyCalorieTarget}
            consumedToday={calculateDailyTotal(history)}
            onUpdateGoal={handleUpdateGoal}
          />
        )}
      </main>

      <Toast 
        message={toast.message} 
        isVisible={toast.visible} 
        onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
      />

      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-slate-800 text-white rounded-full shadow-2xl hover:bg-slate-700 hover:scale-105 transition-all z-40 flex items-center gap-2"
      >
        <MessageSquare size={24} />
        <span className="font-bold pr-1 hidden sm:inline">Ask AI Assistant</span>
      </button>

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
        onOpenDiagnostics={() => setActiveModal('diagnostics')}
      />

      <DiagnosticsModal 
        isOpen={activeModal === 'diagnostics'}
        onClose={() => setActiveModal('none')}
        onRunSimulation={handleSimulation}
        historyCount={history.length}
      />

      <ChatDrawer 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleChatSubmit}
        isTyping={isChatTyping}
        onClearChat={handleClearChat}
      />
    </div>
  );
};

export default App;
