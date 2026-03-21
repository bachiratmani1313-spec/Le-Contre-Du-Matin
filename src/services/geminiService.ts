import { GoogleGenAI, Type } from "@google/genai";
import { Category, NewsArticle, Language } from "../types";

const getApiKey = () => {
  // @ts-ignore
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GMINI_API_KEY || "";
};

export const fetchNews = async (category: Category, lang: Language): Promise<NewsArticle[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante.");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const result = await ai.models.generateContent({
      // Utilisation du modèle 1.5-flash qui est le plus généreux
      model: "gemini-1.5-flash", 
      contents: `Rédige 2 articles très courts pour ${category} en ${lang}. Style direct.`,
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
    return JSON.parse(text || "[]");
  } catch (error: any) {
    console.error("Erreur Gemini:", error);
    // Retourne les articles de secours si l'IA est bloquée
    return [
      {
        id: "fallback-1",
        title: `Édition Spéciale : ${category}`,
        summary: "Le Contre du Matin prépare ses rotatives numériques. Nos articles arrivent d'ici quelques minutes.",
        content: "Merci de votre patience. Notre IA est en train de synthétiser les dernières informations mondiales pour vous offrir le meilleur briefing possible. Propriété de Atmani Bachir.",
        category: category,
        date: new Date().toLocaleDateString(),
        author: "Rédaction IA",
        imageUrl: "https://picsum.photos/seed/news/800/600",
        readTime: "1 min"
      }
    ];
  }
};

export const generateSpeech = async (text: string) => { return ""; };
