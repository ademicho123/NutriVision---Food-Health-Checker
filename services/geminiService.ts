import { GoogleGenAI, Type, Schema, FunctionDeclaration } from "@google/genai";
import { FoodAnalysisResult, UserSettings, HistoryItem, ChatMessage } from "../types";

// --- Tool Definitions ---

const toolUpdateSettings: FunctionDeclaration = {
  name: "update_dietary_profile",
  description: "Update the user's dietary settings, goals, or preferences. Use this when the user says 'I want to go Keto', 'Set calories to 2000', or 'I have a nut allergy'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      dailyCalorieTarget: { type: Type.NUMBER, description: "The new daily calorie goal (e.g. 2000)." },
      addPreferences: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dietary tags to ADD to the list (e.g. 'Vegan', 'Keto', 'Nut Free')." },
      removePreferences: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Dietary tags to REMOVE from the list." },
      customDietRules: { type: Type.STRING, description: "Custom text rules for the user's diet (e.g. 'Intermittent fasting 16:8', 'No processed sugar')." }
    }
  }
};

const toolLogFood: FunctionDeclaration = {
  name: "log_manual_meal",
  description: "Log a meal manually when the user describes what they ate without a photo. Use this when user says 'I ate a burger', 'Log an apple', etc.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      foodName: { type: Type.STRING, description: "Name of the meal or food item." },
      calories: { type: Type.NUMBER, description: "Estimated calories. CRITICAL: If user doesn't specify, YOU MUST ESTIMATE it based on general nutrition knowledge. Do not ask the user." },
      protein: { type: Type.NUMBER, description: "Estimated protein in grams (optional/estimated)." },
      carbs: { type: Type.NUMBER, description: "Estimated carbs in grams (optional/estimated)." },
      fats: { type: Type.NUMBER, description: "Estimated fats in grams (optional/estimated)." },
      fiber: { type: Type.NUMBER, description: "Estimated fiber in grams (optional/estimated)." }
    },
    required: ["foodName", "calories"]
  }
};

const toolSetReminder: FunctionDeclaration = {
  name: "set_reminder",
  description: "Set a timer to remind the user of a health task. Use when user says 'Remind me to drink water in 30 mins'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      minutes: { type: Type.NUMBER, description: "Number of minutes from now to trigger the reminder." },
      task: { type: Type.STRING, description: "The message to remind the user about." }
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
    
    // Extract real MIME type from base64 string
    // Format: "data:image/png;base64,....."
    const match = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = match ? match[1] : "image/jpeg";
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
          { inlineData: { mimeType: mimeType, data: cleanBase64 } },
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

    // Clean Markdown code blocks if present
    let cleanJson = response.text.trim();
    if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '');
    } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '');
    }

    return JSON.parse(cleanJson);

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
    
    You have access to powerful tools. USE THEM PROACTIVELY when the user implies a need:
    - If they say "I'm going vegan" or "Set calories to 2500" -> Call 'update_dietary_profile'.
    - If they say "I just ate a banana" or "Log a 500 cal sandwich" -> Call 'log_manual_meal'.
    - If they say "Remind me to drink water" -> Call 'set_reminder'.
    - IMPORTANT: If a user asks to log food but doesn't explicitly state calories (e.g., "I ate an apple"), use your knowledge to estimate the calories and call the tool.

    === USER PROFILE ===
    ${buildUserContext(settings, history)}

    === RECENT MEALS (Last 5) ===
    ${lastMeals || "No recent meals recorded."}

    === ACTIVE AGENTS ===
    ${settings.activeAgents?.join(', ') || "None"}

    GUIDELINES:
    1. STRICTLY focus on nutrition, diet, food science, and health.
    2. Use the 'User Context' to personalize every answer.
    3. If a tool was called, the system will provide the result. Use that result to confirm the action to the user in a natural way.
    `;

    // Map chat history to API format
    // Filter out system messages and map to proper structure
    // Limit to last 20 messages to prevent token limits
    const historyContents = chatHistory
      .filter(m => m.role === 'user' || m.role === 'model') 
      .slice(-20) 
      .map(m => ({
        role: m.role as 'user' | 'model',
        parts: [{ text: m.text }]
      }));

    // Append the NEW user message to the conversation history
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
      console.log("Executing Tool:", functionCall.name, functionCall.args);
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
      console.error("Tool Execution Error:", e);
      functionResult = "Error executing function: " + (e as Error).message;
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
        // We don't provide tools in the second turn to prevent loops
      }
    });

    return response2.text || functionResult;

  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm sorry, I'm currently unable to process your request. Please check your connection.";
  }
};