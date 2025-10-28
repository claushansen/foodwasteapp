
import { GoogleGenAI, Type } from "@google/genai";
import type { Recipe } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
};

export const identifyIngredients = async (imageBase64: string, mimeType: string): Promise<string[]> => {
  const imagePart = fileToGenerativePart(imageBase64, mimeType);
  const textPart = {
    text: `Analysér det vedhæftede billede af indholdet i et køleskab. Identificer alle spiselige fødevarer. Returner listen som et JSON-array af strenge. For eksempel: ["mælk", "æg", "gulerødder"]. Medtag kun fødevarerne. Oversæt alle ingredienser til dansk.`,
  };
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING
                }
              }
            }
          }
        }
    });

    const responseJson = JSON.parse(response.text);
    if (responseJson && responseJson.ingredients && Array.isArray(responseJson.ingredients)) {
      return responseJson.ingredients;
    }
    return [];

  } catch (error) {
    console.error("Fejl ved identifikation af ingredienser:", error);
    throw new Error("Kunne ikke identificere ingredienser fra billedet.");
  }
};

export const generateRecipes = async (ingredients: string[]): Promise<Recipe[]> => {
  const ingredientsString = ingredients.join(', ');
  const textPart = {
    text: `Du er en hjælpsom kok. Givet følgende liste af ingredienser: ${ingredientsString}. Generer 3 forskellige og kreative opskrifter, der primært bruger disse ingredienser. Du kan antage, at basale spisekammer-ingredienser som salt, peber, olie og vand er tilgængelige. Returner resultatet som et JSON-array, hvor hvert objekt har 'title' (string), 'description' (string, en kort, fængende beskrivelse), 'ingredients' (array af strenge) og 'instructions' (array af strenge). Sørg for at alt output er på dansk.`
  }

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        ingredients: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        instructions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        }
    });

    const recipes = JSON.parse(response.text);
    return recipes as Recipe[];
  } catch (error) {
    console.error("Fejl ved generering af opskrifter:", error);
    throw new Error("Kunne ikke generere opskrifter.");
  }
};
