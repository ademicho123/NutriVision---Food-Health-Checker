
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Trash2, Info } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
  onClearChat: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose, messages, onSendMessage, isTyping, onClearChat }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages change OR typing state changes
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" 
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        data-testid="chat-drawer"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white shadow-sm z-10">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-full">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg">NutriAssistant</h2>
              <p className="text-xs text-emerald-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                Online • Personalized
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={onClearChat}
              className="p-2 hover:bg-white/20 rounded-full transition-colors text-emerald-100 hover:text-white"
              title="Clear Chat / New Chat"
              data-testid="clear-chat-btn"
            >
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-emerald-100 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" data-testid="chat-messages">
          {messages.length === 0 ? (
            <div className="text-center py-10 opacity-60 animate-[fadeIn_0.5s_ease-out]">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <Sparkles size={32} />
              </div>
              <p className="font-medium text-slate-800">How can I help you today?</p>
              <p className="text-sm text-slate-500 mt-2">I know your diet rules and what you've eaten recently.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                 <button onClick={() => onSendMessage("How many calories have I eaten today?")} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:border-emerald-400 transition-colors">
                    📊 Calorie Status
                 </button>
                 <button onClick={() => onSendMessage("Suggest a snack based on my diet.")} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:border-emerald-400 transition-colors">
                    🍎 Suggest Snack
                 </button>
                 <button onClick={() => onSendMessage("Remind me to drink water.")} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:border-emerald-400 transition-colors">
                    💧 Hydration
                 </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.role === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center my-4">
                     <div className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                       <Info size={12} /> {msg.text}
                     </div>
                  </div>
                );
              }
              return (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-br-none' 
                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    <div className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {isTyping && (
             <div className="flex justify-start animate-[fadeIn_0.3s_ease-out]">
               <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex gap-1 items-center">
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-100 flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your diet..."
            className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full border border-transparent focus:bg-white focus:border-emerald-500 focus:border-transparent focus:ring-0 outline-none text-sm transition-all"
            disabled={isTyping}
            data-testid="chat-input"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-emerald-200 active:scale-95 transform"
            data-testid="chat-send-btn"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  );
};
