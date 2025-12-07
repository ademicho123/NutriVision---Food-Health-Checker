import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FoodAnalysisResult, UserSettings } from "../types";

// Define the response schema for structured output
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

export const analyzeFoodImage = async (base64Image: string, settings?: UserSettings): Promise<FoodAnalysisResult> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please set process.env.API_KEY.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Clean base64 string if it contains metadata
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    let systemInstruction = BASE_SYSTEM_PROMPT;
    if (settings?.dietaryPreferences && settings.dietaryPreferences.length > 0) {
      systemInstruction += `\n\nIMPORTANT: The user has the following dietary preferences/restrictions: ${settings.dietaryPreferences.join(', ')}. 
      In the 'healthRatingExplanation' and 'dietaryTags', explicitly mention if the meal complies with these preferences or violates them.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", 
              data: cleanBase64
            }
          },
          {
            text: "Analyze this meal strictly according to the requested JSON schema."
          }
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

    const data: FoodAnalysisResult = JSON.parse(response.text);
    return data;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze food image. Please try again.");
  }
};