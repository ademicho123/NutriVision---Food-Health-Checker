import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ProcessingViewProps {
  progress: number;
}

const FUN_FACTS = [
  "Did you know? Avocados have more potassium than bananas.",
  "Broccoli contains more protein per calorie than steak!",
  "Dark chocolate is packed with powerful antioxidants.",
  "Drinking water before meals can help with portion control.",
  "Almonds are a great source of Vitamin E.",
  "Spinach loses nutritional value if cooked too long.",
  "Bell peppers have more Vitamin C than oranges."
];

export const ProcessingView: React.FC<ProcessingViewProps> = ({ progress }) => {
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusMessage = (p: number) => {
    if (p < 30) return "Uploading image...";
    if (p < 60) return "Identifying ingredients...";
    if (p < 90) return "Calculating nutritional value...";
    return "Generating health recommendations...";
  };

  return (
    <div className="w-full max-w-xl mx-auto text-center py-12 px-6">
      <div className="relative w-24 h-24 mx-auto mb-8">
        {/* Spinning decorative border */}
        <div className="absolute inset-0 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin"></div>
        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
             <span className="text-2xl">🥗</span>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-slate-800 mb-2">Analyzing your meal</h3>
      <p className="text-emerald-600 font-medium mb-8 animate-pulse">
        {getStatusMessage(progress)}
      </p>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-8">
        <div 
          className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
        </div>
      </div>

      {/* Fun Fact Card */}
      <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl">
        <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">
          Nutrition Fact
        </p>
        <p className="text-slate-700 italic transition-opacity duration-500 min-h-[3rem] flex items-center justify-center">
          "{FUN_FACTS[factIndex]}"
        </p>
      </div>
    </div>
  );
};