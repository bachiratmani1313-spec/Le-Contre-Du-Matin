import { GoogleGenAI, Type } from "@google/genai";
import { Category, NewsArticle, Language } from "../types";

const getApiKey = () => {
  // @ts-ignore
  return import.meta.env.VITE_GEMINI_API_KEY || "";
}

export const fetchNews = async (category: Category, lang: Language): Promise<NewsArticle[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante dans les variables d'environnement Vercel.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Utilisation de la version stable
      contents: `Rédige 3 articles de presse pour la catégorie ${category} en langue ${lang}. 
      Style: Journalistique, sérieux. Propriété exclusive de Atmani Bachir.`,
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

    const text = response.text;
    if (!text) return [];
    
    const articles = JSON.parse(text);
    return articles.map((a: any) => ({
      ...a,
      imageUrl: `https://picsum.photos/seed/${a.id}/800/600`
    }));
  } catch (error) {
    console.error("Erreur Gemini:", error);
    throw error;
  }
};
