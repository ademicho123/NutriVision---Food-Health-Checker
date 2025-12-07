import React, { useState } from 'react';
import { FoodAnalysisResult } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  Leaf, 
  Flame, 
  ChevronDown, 
  ChevronUp, 
  Info,
  ChefHat,
  Share2,
  RefreshCw,
  Check
} from 'lucide-react';

interface ResultsViewProps {
  result: FoodAnalysisResult;
  imageSrc: string;
  onReset: () => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6']; // Protein (Green), Carbs (Orange), Fat (Red), Fiber (Blue)

export const ResultsView: React.FC<ResultsViewProps> = ({ result, imageSrc, onReset }) => {
  const [expandedSection, setExpandedSection] = React.useState<string | null>('items');
  const [showCopied, setShowCopied] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const macroData = [
    { name: 'Protein', value: result.macros.protein },
    { name: 'Carbs', value: result.macros.carbs },
    { name: 'Fats', value: result.macros.fats },
    { name: 'Fiber', value: result.macros.fiber },
  ];

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getHealthRingColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#eab308';
    return '#ef4444';
  };

  const handleShare = async () => {
    const shareText = `🥗 Meal Analysis by NutriVision\n\n` +
      `🔥 Calories: ${result.totalCalories}\n` +
      `🎯 Health Score: ${result.healthScore}/100\n\n` +
      `Macros:\n` +
      `• Protein: ${result.macros.protein}g\n` +
      `• Carbs: ${result.macros.carbs}g\n` +
      `• Fats: ${result.macros.fats}g\n\n` +
      `AI Suggestion: ${result.healthRatingExplanation}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'NutriVision Meal Analysis',
          text: shareText,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (err) {
        alert("Failed to copy to clipboard");
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-20 animate-[fadeIn_0.5s_ease-out]">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={onReset}
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <RefreshCw size={18} />
          <span>Analyze Another</span>
        </button>
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors relative"
        >
          {showCopied ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}
          <span>{showCopied ? "Copied!" : "Share"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Col: Image & Key Stats */}
        <div className="md:col-span-5 space-y-6">
          {/* Image Card */}
          <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <img src={imageSrc} alt="Analyzed Food" className="w-full h-64 object-cover rounded-2xl" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-slate-800">{result.totalCalories}</h2>
                <span className="text-sm font-medium px-3 py-1 bg-slate-100 text-slate-600 rounded-full">kcal</span>
              </div>
              <p className="text-slate-500 text-sm flex items-center gap-1">
                 <Activity size={14} /> Confidence: {result.confidenceLevel}
              </p>
            </div>
          </div>

          {/* Health Score */}
          <div className={`p-6 rounded-3xl border shadow-sm ${getHealthColor(result.healthScore)}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Health Score</h3>
              <div className="relative w-16 h-16 flex items-center justify-center">
                 <svg className="absolute w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-current opacity-20" />
                    <circle 
                      cx="32" cy="32" r="28" 
                      stroke={getHealthRingColor(result.healthScore)} 
                      strokeWidth="4" 
                      fill="transparent" 
                      strokeDasharray={175.9} 
                      strokeDashoffset={175.9 - (175.9 * result.healthScore) / 100} 
                      className="transition-all duration-1000 ease-out"
                    />
                 </svg>
                 <span className="text-xl font-bold">{result.healthScore}</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed opacity-90">{result.healthRatingExplanation}</p>
          </div>

          {/* Activity Equivalent */}
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl flex items-center gap-4">
             <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
               <Activity size={20} />
             </div>
             <div>
               <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">Burn it off</p>
               <p className="font-semibold text-blue-900">{result.exerciseEquivalent}</p>
             </div>
          </div>
        </div>

        {/* Right Col: Detailed Breakdown */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Macros Chart */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Macronutrients</h3>
            <div className="flex flex-col sm:flex-row items-center">
              <div className="w-full h-48 sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {macroData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `${value}g`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 grid grid-cols-2 gap-3">
                {macroData.map((macro, idx) => (
                  <div key={macro.name} className="flex flex-col p-2 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                      <span className="text-xs text-slate-500">{macro.name}</span>
                    </div>
                    <span className="font-bold text-slate-700">{macro.value}g</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Accordion Sections */}
          <div className="space-y-4">
            
            {/* Detected Items */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <button 
                onClick={() => toggleSection('items')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                    <Leaf size={18} />
                  </div>
                  <h3 className="font-semibold text-slate-800">Detected Items</h3>
                </div>
                {expandedSection === 'items' ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>
              
              {expandedSection === 'items' && (
                <div className="px-6 pb-6 pt-2">
                  <div className="space-y-3">
                    {result.foodItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.portionEstimate}</p>
                          <p className="text-xs text-slate-500 mt-1">Ingredients: {item.ingredients.join(', ')}</p>
                        </div>
                        <span className="font-semibold text-slate-600">{item.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Healthier Alternatives */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <button 
                onClick={() => toggleSection('alternatives')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                    <ChefHat size={18} />
                  </div>
                  <h3 className="font-semibold text-slate-800">Smart Swaps</h3>
                </div>
                {expandedSection === 'alternatives' ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>
              
              {expandedSection === 'alternatives' && (
                <div className="px-6 pb-6 pt-2">
                  <div className="grid gap-4">
                    {result.healthierAlternatives.map((alt, idx) => (
                      <div key={idx} className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-purple-900">{alt.name}</h4>
                          <span className="text-xs font-bold text-white bg-purple-400 px-2 py-1 rounded-full">Save {alt.calorieSavings} kcal</span>
                        </div>
                        <p className="text-sm text-purple-800 opacity-90">{alt.explanation}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <h5 className="font-semibold text-orange-800 mb-1 flex items-center gap-2">
                      <Flame size={16} /> Cooking Tip
                    </h5>
                    <p className="text-sm text-orange-800 opacity-90">{result.cookingMethodSuggestions}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Alerts & Tags */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
               <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                 <Info size={18} className="text-blue-500"/> Dietary Insights
               </h3>
               <div className="flex flex-wrap gap-2 mb-4">
                  {result.dietaryTags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))}
               </div>
               {result.allergens.length > 0 && (
                 <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                   <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                   <div>
                     <p className="text-xs font-bold text-red-500 uppercase tracking-wide">Potential Allergens</p>
                     <p className="text-sm text-red-700">{result.allergens.join(', ')}</p>
                   </div>
                 </div>
               )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};