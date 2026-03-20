import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Category, NewsArticle, Language } from "../types";

/**
 * SERVICE DE VÉRITÉ - LE CONTRE DU MATIN
 * Propriété de Atmani Bachir.
 * Nettoyé et optimisé pour la rapidité.
 */

const getApiKey = () => {
  try {
    // @ts-ignore
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY || process.env.GEMINI_API_KEY : "") || "";
    const localKey = localStorage.getItem('GEMINI_API_KEY');
    
    if (envKey) console.log("[Gemini] Clé API détectée dans l'environnement.");
    else if (localKey) console.log("[Gemini] Clé API détectée dans le stockage local.");
    
    return envKey || localKey || "";
  } catch (e) {
    return "";
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable = error?.message?.includes("503") || 
                          error?.message?.includes("high demand") || 
                          error?.message?.includes("429") ||
                          error?.message?.includes("rate limit");
      
      if (isRetryable && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Gemini occupé (503/429). Nouvel essai dans ${Math.round(delay)}ms...`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const fetchNews = async (category: Category, lang: Language): Promise<NewsArticle[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante. Veuillez configurer votre accès.");
  
  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toLocaleDateString('fr-FR');

  console.log(`[Gemini] Début fetchNews pour ${category} (${lang})`);

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: `Rédige 3 articles de presse pour la catégorie ${category} en langue ${lang}. 
      Date du jour: ${today}. 
      Style: Journalistique, sérieux, informatif. 
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
              readTime: { type: Type.STRING },
              isBreaking: { type: Type.BOOLEAN }
            },
            required: ["id", "title", "summary", "content", "category", "date", "author", "imageUrl", "readTime"]
          }
        }
      }
    });

    const articles = JSON.parse(response.text || "[]");
    return articles.map((a: any) => ({
      ...a,
      imageUrl: a.imageUrl || `https://picsum.photos/seed/${a.id}/800/600`
    }));
  });
};

export const generateSpeech = async (text: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Lis cet article de presse avec une voix calme et professionnelle : ${text}` }] }],
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
    console.error("[Gemini TTS] Erreur:", e);
    return "";
  }
};
