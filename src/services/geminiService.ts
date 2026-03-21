import { GoogleGenAI, Type } from "@google/genai";
import { Category, NewsArticle, Language } from "../types";

const getApiKey = () => {
  // @ts-ignore
  return import.meta.env.VITE_GEMINI_API_KEY || "";
};

export const fetchNews = async (category: Category, lang: Language): Promise<NewsArticle[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante.");

  // --- SYSTÈME DE CACHE ---
  const cacheKey = `news_${category}_${lang}`;
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    const { articles, timestamp } = JSON.parse(cachedData);
    // Si les articles ont moins de 30 minutes, on les utilise sans appeler l'IA
    if (Date.now() - timestamp < 30 * 60 * 1000) {
      console.log(`[Cache] Chargement des articles pour ${category}`);
      return articles;
    }
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash", // On utilise 1.5-flash qui a souvent des quotas plus généreux
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

    const articles = JSON.parse(result.text || "[]");
    
    // On enregistre dans le cache
    localStorage.setItem(cacheKey, JSON.stringify({
      articles,
      timestamp: Date.now()
    }));

    return articles;
  } catch (error: any) {
    if (error.message?.includes("429")) {
      throw new Error("L'IA est fatiguée (Quota dépassé). Attendez 1 minute ou réessayez plus tard.");
    }
    throw error;
  }
};
