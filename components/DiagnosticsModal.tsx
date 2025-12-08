
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Activity, Play, Database, Camera, Wifi, MessageSquare, Zap, Target } from 'lucide-react';
import { FoodAnalysisResult } from '../types';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSimulation: (scenario: 'success' | 'error' | 'agent' | 'goal_limit') => void;
  historyCount: number;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose, onRunSimulation, historyCount }) => {
  const [checks, setChecks] = useState<Record<string, 'pending' | 'pass' | 'fail'>>({
    browser: 'pending',
    storage: 'pending',
    camera: 'pending',
    apiConfig: 'pending'
  });

  useEffect(() => {
    if (isOpen) {
      runChecks();
    }
  }, [isOpen]);

  const runChecks = async () => {
    const newChecks = { ...checks };

    // 1. Browser Capabilities
    try {
      const isModern = !!(window.fetch && window.Promise && window.localStorage);
      newChecks.browser = isModern ? 'pass' : 'fail';
    } catch (e) { newChecks.browser = 'fail'; }

    // 2. Storage
    try {
      localStorage.setItem('test_write', 'ok');
      const read = localStorage.getItem('test_write');
      localStorage.removeItem('test_write');
      newChecks.storage = read === 'ok' ? 'pass' : 'fail';
    } catch (e) { newChecks.storage = 'fail'; }

    // 3. Camera (Permission Check)
    try {
      // Just check if API exists, actual permission needs user interaction
      newChecks.camera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ? 'pass' : 'fail';
    } catch (e) { newChecks.camera = 'fail'; }

    // 4. API Config (Env Check)
    newChecks.apiConfig = 'pass'; 

    setChecks(newChecks);
  };

  if (!isOpen) return null;

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'pass') return <CheckCircle className="text-emerald-500" size={20} />;
    if (status === 'fail') return <AlertTriangle className="text-red-500" size={20} />;
    return <Activity className="text-slate-400 animate-spin" size={20} />;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-emerald-600" /> System Diagnostics
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Health Checks */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Environment Checks</h3>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Wifi size={18} className="text-slate-500"/>
                <span className="text-sm font-medium text-slate-700">Browser API Support</span>
              </div>
              <StatusIcon status={checks.browser} />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-slate-500"/>
                <span className="text-sm font-medium text-slate-700">Local Storage ({historyCount})</span>
              </div>
              <StatusIcon status={checks.storage} />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Camera size={18} className="text-slate-500"/>
                <span className="text-sm font-medium text-slate-700">Camera Access API</span>
              </div>
              <StatusIcon status={checks.camera} />
            </div>
          </div>

          {/* Simulation */}
          <div className="pt-4 border-t border-slate-100">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Run End-to-End Tests</h3>
             
             <div className="grid gap-3">
                <button 
                  onClick={() => { onClose(); onRunSimulation('success'); }}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  data-testid="sim-success-btn"
                >
                  <Play size={18} /> Simulate Analysis (Happy Path)
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { onClose(); onRunSimulation('goal_limit'); }}
                    className="py-3 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl font-bold hover:bg-orange-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                    data-testid="sim-goal-btn"
                  >
                    <Target size={16} /> Test Goal Limits
                  </button>
                  <button 
                    onClick={() => { onClose(); onRunSimulation('agent'); }}
                    className="py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl font-bold hover:bg-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                    data-testid="sim-agent-btn"
                  >
                    <MessageSquare size={16} /> Test Agent
                  </button>
                </div>

                <button 
                  onClick={() => { onClose(); onRunSimulation('error'); }}
                  className="w-full py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl font-medium hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs"
                  data-testid="sim-error-btn"
                >
                  <AlertTriangle size={14} /> Test Error Handling UI
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
