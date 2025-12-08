
// Data model returned by Gemini
export interface FoodItem {
  name: string;
  calories: number;
  portionEstimate: string;
  ingredients: string[];
}

export interface Macronutrients {
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface HealthierAlternative {
  name: string;
  calories: number;
  explanation: string;
  calorieSavings: number;
}

export interface FoodAnalysisResult {
  totalCalories: number;
  confidenceLevel: string; // "High", "Medium", "Low"
  foodItems: FoodItem[];
  macros: Macronutrients;
  micronutrients: string[]; // List of key vitamins/minerals detected
  healthScore: number; // 0-100
  healthRatingExplanation: string;
  healthierAlternatives: HealthierAlternative[];
  allergens: string[];
  dietaryTags: string[]; // e.g. "High Protein", "Keto Friendly"
  exerciseEquivalent: string; // e.g., "45 mins walking"
  cookingMethodSuggestions: string;
  isManual?: boolean; // Flag for manually logged meals via chat
}

export type AnalysisStatus = 'idle' | 'preview' | 'analyzing' | 'complete' | 'error';

export interface AnalysisState {
  status: AnalysisStatus;
  image: string | null; // Base64
  result: FoodAnalysisResult | null;
  error: string | null;
  progress: number; // 0-100 for simulated progress bar
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  image: string;
  result: FoodAnalysisResult;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
}

export interface UserSettings {
  dietaryPreferences: string[];
  dailyCalorieTarget?: number;
  customDietRules?: string; // e.g. "Intermittent fasting, window 12-8pm"
  activeAgents?: string[]; // e.g. "hydration_reminder", "weekly_report"
}
