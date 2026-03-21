import { GoogleGenAI, Type } from "@google/genai";
import { Category, NewsArticle, Language } from "../types";

const getApiKey = () => {
  // @ts-ignore
  return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GMINI_API_KEY || "";
};

export const fetchNews = async (category: Category, lang: Language): Promise<NewsArticle[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante dans Vercel.");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const result = await ai.models.generateContent({
      // 1.5-flash est plus robuste pour le quota gratuit
      model: "gemini-1.5-flash", 
      contents: `Rédige 3 articles courts pour la catégorie ${category} en ${lang}. Style journal sérieux.`,
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
    if (!text) throw new Error("Réponse vide de l'IA");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Erreur Gemini:", error);
    
    // ARTICLES DE SECOURS (Si l'IA est bloquée)
    return [
      {
        id: "fallback-1",
        title: `Actualités ${category} : L'IA est en cours de rédaction`,
        summary: "Nos serveurs de rédaction sont actuellement très sollicités. Les articles complets reviendront dans quelques instants.",
        content: "Le Contre du Matin vous remercie de votre fidélité. Notre équipe d'intelligence artificielle prépare une édition spéciale. Veuillez rafraîchir la page dans une minute.",
        category: category,
        date: new Date().toLocaleDateString(),
        author: "Rédaction Automatique",
        imageUrl: "https://images.unsplash.com/photo-1504711432869-5d39a142df4a?q=80&w=1000&auto=format&fit=crop",
        readTime: "1 min"
      }
    ];
  }
};

export const generateSpeech = async (text: string) => { return ""; };
