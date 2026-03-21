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
      // CE MODÈLE EST LE PLUS GÉNÉREUX EN QUOTA GRATUIT
      model: "gemini-1.5-flash", 
      contents: `Rédige 2 articles de presse pour la catégorie ${category} en ${lang}. Style sérieux.`,
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
    // Retourne un article de secours si le quota est atteint
    return [{
      id: "fallback",
      title: "Briefing en cours de préparation",
      summary: "L'IA prépare votre édition. Veuillez patienter quelques instants.",
      content: "Le Contre du Matin revient vers vous avec les dernières actualités. Propriété de Atmani Bachir.",
      category: category,
      date: new Date().toLocaleDateString(),
      author: "Rédaction IA",
      imageUrl: "https://picsum.photos/seed/news/800/600",
      readTime: "1 min"
    }];
  }
};
