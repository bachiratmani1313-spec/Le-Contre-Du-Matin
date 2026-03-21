import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Category, NewsArticle, Language } from "../types";

/**
 * SERVICE HAUTE PERFORMANCE - LE CONTRE DU MATIN
 * Modèle : Gemini 3.1 Pro (Le plus puissant)
 */

const getApiKey = () => {
  try {
    // @ts-ignore
    return import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : "") || "";
  } catch (e) {
    return "";
  }
}

export const fetchNews = async (category: Category, lang: Language): Promise<NewsArticle[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Clé API manquante.");
  
  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toLocaleDateString('fr-FR');

  try {
    const response = await ai.models.generateContent({
      // ON UTILISE LE MODÈLE PRO POUR UNE QUALITÉ 10X SUPÉRIEURE
      model: "gemini-3.1-pro-preview", 
      contents: `Tu es le rédacteur en chef de 'LE CONTRE DU MATIN'. 
      Génère 3 articles de très haute qualité pour la catégorie ${category} en ${lang}. 
      Date : ${today}. Style : Grand reportage, analytique et profond.`,
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
    const articles = JSON.parse(text || "[]");
    
    // On s'assure que chaque article a une belle image
    return articles.map((a: any) => ({
      ...a,
      imageUrl: a.imageUrl || `https://picsum.photos/seed/${a.id}/1200/600`
    }));
  } catch (error: any) {
    console.error("Erreur Gemini Pro:", error);
    throw error;
  }
};

// FONCTION DE PAROLE (TTS)
export const speakArticle = async (text: string, lang: Language): Promise<Uint8Array | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }], 
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { 
          voiceConfig: { prebuiltVoiceConfig: { voiceName: lang === Language.AR ? 'Zephyr' : 'Kore' } } 
        }
      }
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch (e) { return null; }
};

// EXPORTATIONS OBLIGATOIRES POUR ÉVITER LES ERREURS VERCEL
export const generateSpeech = speakArticle;

export async function decodeAudio(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
  return buffer;
}

export function createWavBlob(data: Uint8Array): Blob {
  const sampleRate = 24000;
  const buffer = new ArrayBuffer(44 + data.length);
  const view = new DataView(buffer);
  const writeString = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + data.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, data.length, true);
  new Uint8Array(buffer, 44).set(data);
  return new Blob([buffer], { type: 'audio/wav' });
}
