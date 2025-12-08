
import { GoogleGenAI, Type, Schema, FunctionDeclaration } from "@google/genai";
import { FoodAnalysisResult, UserSettings, HistoryItem, ChatMessage } from "../types";

// --- Tool Definitions ---

const toolUpdateSettings: FunctionDeclaration = {
  name: "update_dietary_profile",
  description: "Update the user's dietary settings, goals, or preferences.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      dailyCalorieTarget: { type: Type.NUMBER, description: "The new daily calorie goal." },
      addPreferences: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dietary tags to add (e.g. 'Vegan', 'Keto')." },
      removePreferences: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dietary tags to remove." },
      customDietRules: { type: Type.STRING, description: "Custom text rules for the user's diet (e.g. 'Intermittent fasting')." }
    }
  }
};

const toolLogFood: FunctionDeclaration = {
  name: "log_manual_meal",
  description: "Log a meal manually when the user describes what they ate without a photo.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      foodName: { type: Type.STRING, description: "Name of the meal or food item." },
      calories: { type: Type.NUMBER, description: "Estimated calories." },
      protein: { type: Type.NUMBER, description: "Estimated protein in grams." },
      carbs: { type: Type.NUMBER, description: "Estimated carbs in grams." },
      fats: { type: Type.NUMBER, description: "Estimated fats in grams." },
      fiber: { type: Type.NUMBER, description: "Estimated fiber in grams." }
    },
    required: ["foodName", "calories"]
  }
};

const toolSetReminder: FunctionDeclaration = {
  name: "set_reminder",
  description: "Set a timer to remind the user of a health task.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      minutes: { type: Type.NUMBER, description: "Number of minutes from now to trigger the reminder." },
      task: { type: Type.STRING, description: "The message to remind the user about (e.g. 'Drink water')." }
    },
    required: ["minutes", "task"]
  }
};

// --- Analysis Schema ---

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    totalCalories: { type: Type.NUMBER, description: "Total estimated calories for the entire meal." },
    confidenceLevel: { type: Type.STRING, description: "Confidence in the estimation (High, Medium, Low)." },
    foodItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          portionEstimate: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["name", "calories", "portionEstimate", "ingredients"]
      }
    },
    macros: {
      type: Type.OBJECT,
      properties: {
        protein: { type: Type.NUMBER, description: "Total protein in grams" },
        carbs: { type: Type.NUMBER, description: "Total carbohydrates in grams" },
        fats: { type: Type.NUMBER, description: "Total fats in grams" },
        fiber: { type: Type.NUMBER, description: "Total fiber in grams" }
      },
      required: ["protein", "carbs", "fats", "fiber"]
    },
    micronutrients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of potential vitamins and minerals." },
    healthScore: { type: Type.NUMBER, description: "Health score from 0 to 100 based on nutritional balance." },
    healthRatingExplanation: { type: Type.STRING, description: "Brief explanation of the health score." },
    healthierAlternatives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
          calorieSavings: { type: Type.NUMBER }
        },
        required: ["name", "calories", "explanation", "calorieSavings"]
      }
    },
    allergens: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Potential allergens like Nuts, Dairy, Gluten, etc." },
    dietaryTags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tags like High Protein, Vegan, Keto, etc." },
    exerciseEquivalent: { type: Type.STRING, description: "Exercise needed to burn these calories (e.g., '30 mins jogging')." },
    cookingMethodSuggestions: { type: Type.STRING, description: "Tips on how to cook this healthier next time." }
  },
  required: [
    "totalCalories", "confidenceLevel", "foodItems", "macros",
    "healthScore", "healthRatingExplanation", "healthierAlternatives",
    "allergens", "dietaryTags", "exerciseEquivalent", "cookingMethodSuggestions"
  ]
};

const BASE_SYSTEM_PROMPT = `
You are a world-class Nutritionist and Food Scientist AI.
Analyze the provided food image with high precision.
1. Identify every visible food item and ingredient.
2. Estimate portions realistically.
3. Calculate nutritional values.
4. Assess the healthiness of the meal objectively.
5. Provide actionable advice for improvement.

If the image is NOT food, return a response indicating 0 calories and a health score of 0 with an explanation that no food was detected.
`;

const getApiKey = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return apiKey;
};

const buildUserContext = (settings?: UserSettings, history?: HistoryItem[]) => {
  let contextData = "";

  // 1. Dietary Preferences (Tags)
  if (settings?.dietaryPreferences && settings.dietaryPreferences.length > 0) {
    contextData += `\n- Dietary Strict Preferences: ${settings.dietaryPreferences.join(', ')}.`;
  }

  // 2. Custom Diet Rules
  if (settings?.customDietRules) {
    contextData += `\n- User's Custom Diet Pattern/Rules: "${settings.customDietRules}".`;
  }

  // 3. Daily Goals & History (Memory)
  if (history) {
    const today = new Date().toDateString();
    const todaysMeals = history.filter(item => new Date(item.timestamp).toDateString() === today);
    
    const consumedCalories = todaysMeals.reduce((sum, item) => sum + item.result.totalCalories, 0);
    const consumedProtein = todaysMeals.reduce((sum, item) => sum + item.result.macros.protein, 0);
    
    contextData += `\n- Today's Intake So Far: ${consumedCalories} kcal, ${consumedProtein}g Protein.`;
    
    if (settings?.dailyCalorieTarget) {
      const remaining = settings.dailyCalorieTarget - consumedCalories;
      contextData += `\n- Daily Calorie Target: ${settings.dailyCalorieTarget} kcal.`;
      contextData += `\n- Remaining Budget: ${remaining} kcal.`;
    }
  }
  return contextData;
};

export const analyzeFoodImage = async (
  base64Image: string, 
  settings?: UserSettings,
  history?: HistoryItem[]
): Promise<FoodAnalysisResult> => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    let systemInstruction = BASE_SYSTEM_PROMPT;
    const contextData = buildUserContext(settings, history);

    if (contextData) {
      systemInstruction += `\n\n=== USER CONTEXT & MEMORY ===${contextData}\n
      INSTRUCTIONS FOR PERSONALIZATION:
      1. 'healthRatingExplanation': Explicitly mention how this meal fits into their daily remaining calories (if target set) and if it adheres to their Custom Diet Rules.
      2. 'dietaryTags': Flag violations of their preferences if any.
      3. 'healthierAlternatives': Suggest swaps that align with their specific Custom Diet Rules (e.g. if 'Keto', suggest lower carb options).
      4. If they have exceeded their daily target, provide kind but firm advice.
      `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: "Analyze this meal strictly according to the requested JSON schema, keeping the User Context in mind." }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2 
      }
    });

    if (!response.text) {
      throw new Error("No response received from Gemini.");
    }

    return JSON.parse(response.text);

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze food image. Please try again.");
  }
};

export type AgentActions = {
  updateSettings: (args: any) => Promise<string>;
  logFood: (args: any) => Promise<string>;
  setReminder: (args: any) => Promise<string>;
};

export const chatWithNutritionist = async (
  message: string,
  history: HistoryItem[],
  settings: UserSettings,
  chatHistory: ChatMessage[],
  actions: AgentActions
): Promise<string> => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });

    // Build History Summary for Context
    const lastMeals = history.slice(0, 5).map(h => 
      `- ${new Date(h.timestamp).toLocaleTimeString()}: ${h.result.foodItems.map(f => f.name).join(', ')} (${h.result.totalCalories}kcal)`
    ).join('\n');

    const systemInstruction = `
    You are 'NutriAI', a friendly, professional, and highly knowledgeable Personal Nutrition Assistant.
    Your goal is to help the user achieve their dietary goals based on their settings and eating history.
    You have access to tools to modify settings, log food, and set reminders. USE THEM whenever the user asks.

    === USER PROFILE ===
    ${buildUserContext(settings, history)}

    === RECENT MEALS (Last 5) ===
    ${lastMeals || "No recent meals recorded."}

    === ACTIVE AGENTS ===
    ${settings.activeAgents?.join(', ') || "None"}

    GUIDELINES:
    1. STRICTLY focus on nutrition, diet, food science, and health.
    2. If the user asks to change a setting, log a meal (without image), or set a reminder, CALL THE APPROPRIATE FUNCTION.
    3. Use the 'User Context' to personalize every answer.
    4. Be encouraging but scientific.
    `;

    // Map chat history to API format
    const historyContents = chatHistory
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

    const currentContents = [
      ...historyContents,
      { role: 'user', parts: [{ text: message }] }
    ];

    // First Turn: Check for tool calls
    const response1 = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: currentContents,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: [toolUpdateSettings, toolLogFood, toolSetReminder] }],
      }
    });

    const functionCall = response1.functionCalls?.[0];

    // If no tool called, return text
    if (!functionCall) {
      return response1.text || "I'm thinking...";
    }

    // Handle Tool Execution
    let functionResult = "";
    try {
      if (functionCall.name === "update_dietary_profile") {
        functionResult = await actions.updateSettings(functionCall.args);
      } else if (functionCall.name === "log_manual_meal") {
        functionResult = await actions.logFood(functionCall.args);
      } else if (functionCall.name === "set_reminder") {
        functionResult = await actions.setReminder(functionCall.args);
      } else {
        functionResult = "Error: Unknown function.";
      }
    } catch (e) {
      functionResult = "Error executing function.";
    }

    // Second Turn: Send tool result back to model for final natural response
    const response2 = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...currentContents,
        { role: 'model', parts: [{ functionCall: functionCall }] },
        { role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { result: functionResult } } }] }
      ],
      config: {
        systemInstruction: systemInstruction, 
        // We don't provide tools in the second turn to prevent loops, usually not needed for confirmation
      }
    });

    return response2.text || "Action completed.";

  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm sorry, I'm currently unable to process your request. Please check your connection.";
  }
};
