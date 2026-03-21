import { GoogleGenAI, Type } from "@google/genai";
import { Category, NewsArticle, Language } from "../types";

const getApiKey = () => {
  // @ts-ignore
  return import.meta.env.VITE_GEMINI_API_KEY || "";
};

export const fetchNews = async (category: Category, lang: Language): Promise<NewsArticle[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante dans Vercel.");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const result = await ai.models.generateContent({
      // Utilisation du modèle 1.5-flash (plus de quota gratuit)
      model: "gemini-1.5-flash", 
      contents: `Rédige 2 articles courts pour la catégorie ${category} en ${lang}. Style journal sérieux.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              content: { type: Type.STRING },
              category: { type: Type.STRING },
              date: { type: Type.STRING },
              author: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              readTime: { type: Type.STRING }
            },
            required: ["id", "title", "summary", "content", "category", "date", "author", "imageUrl", "readTime"]
          }
        }
      }
    });

    const text = result.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Erreur Gemini:", error);
    // Message d'erreur plus doux
    if (error.message?.includes("429")) {
      throw new Error("L'IA fait une pause (Quota atteint). Revenez dans 2 minutes.");
    }
    throw new Error("Impossible de joindre l'IA. Vérifiez votre connexion.");
  }
};

// Fonction vide pour éviter les erreurs si elle est appelée
export const generateSpeech = async (text: string) => { return ""; };
