import { GoogleGenAI, Type } from "@google/genai";
import { Category, NewsArticle, Language } from "../types";

const getApiKey = () => {
  // @ts-ignore
  const key = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GMINI_API_KEY || "";
  return key;
};

export const fetchNews = async (category: Category, lang: Language): Promise<NewsArticle[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API introuvable. Vérifiez le nom dans Vercel (VITE_GEMINI_API_KEY).");
  
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Rédige 3 articles pour ${category} en ${lang}. Style journal.`,
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

    return JSON.parse(result.text || "[]");
  } catch (error: any) {
    console.error("Erreur Gemini:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string) => { return ""; }; // Désactivé pour tester le chargement
