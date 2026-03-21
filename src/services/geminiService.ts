import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, NewsArticle, Language } from "../types";

/**
 * SERVICE DE RÉDACTION IA - LE CONTRE DU MATIN
 * Optimisé pour Vercel et Google AI Studio.
 */

const getApiKey = () => {
  // @ts-ignore - Récupère la clé configurée dans Vercel
  const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
  // Récupère la clé configurée dans AI Studio Build
  const processKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : "";
  
  return viteKey || processKey || "";
};

export const fetchNews = async (category: Category, lang: Language): Promise<NewsArticle[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Clé API manquante. Ajoutez VITE_GEMINI_API_KEY dans les paramètres Vercel.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toLocaleDateString('fr-FR');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Modèle stable, rapide et gratuit
      contents: `Rédige 3 articles de presse pour la catégorie ${category} en langue ${lang}. 
      Date: ${today}. Style: Journalistique, factuel, percutant. 
      Propriété exclusive de Atmani Bachir.`,
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

    // Utilisation de la propriété .text (et non la méthode .text())
    const jsonText = response.text;
    if (!jsonText) return [];

    const articles = JSON.parse(jsonText);
    
    return articles.map((a: any) => ({
      ...a,
      imageUrl: `https://picsum.photos/seed/${a.id}/800/600`
    }));

  } catch (error: any) {
    console.error("[Gemini Service Error]:", error);
    if (error.message?.includes("403")) throw new Error("Clé API invalide. Vérifiez vos paramètres Vercel.");
    if (error.message?.includes("429")) throw new Error("Quota dépassé. Réessayez dans une minute.");
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Lis ceci avec une voix de présentateur radio : ${text.substring(0, 1000)}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio ? `data:audio/mp3;base64,${base64Audio}` : "";
  } catch (e) {
    console.error("[TTS Error]:", e);
    return "";
  }
};
