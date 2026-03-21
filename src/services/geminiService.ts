import { GoogleGenAI, Type, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Category, NewsArticle, Language } from "../types";

/**
 * SERVICE DE VÉRITÉ - LE CONTRE DU MATIN
 * Propriété de Atmani Bachir.
 */

const getApiKey = () => {
  try {
    // @ts-ignore
    const envKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY || process.env.GEMINI_API_KEY : "") || "";
    const localKey = localStorage.getItem('GEMINI_API_KEY');
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
  if (!apiKey) throw new Error("Clé API manquante.");
  
  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toLocaleDateString('fr-FR');

  const prompt = `
    RÉDACTEUR EN CHEF : LE CONTRE DU MATIN (Fondateur: Atmani Bachir). 
    DATE : ${today}.
    MISSION : Génère 3 articles complets pour la catégorie : ${category}.
    LANGUE : ${lang}.
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              content: { type: Type.STRING },
              location: { type: Type.STRING },
              timestamp: { type: Type.STRING },
              truthContent: { type: Type.STRING },
              physicalFacts: { type: Type.STRING },
              strategicAdvice: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  details: { type: Type.STRING }
                },
                required: ["action", "details"]
              },
              imagePrompt: { type: Type.STRING },
              audioAnnounce: { type: Type.STRING }
            },
            required: ["type", "title", "summary", "content", "location", "timestamp", "truthContent", "physicalFacts", "strategicAdvice", "imagePrompt", "audioAnnounce"]
          }
        }
      }
    }));

    const text = response.text;
    if (!text) throw new Error("Aucune réponse du modèle.");
    
    const data = JSON.parse(text);
    return data.map((item: any, i: number) => ({
      ...item,
      id: `art-${category}-${i}-${Date.now()}`,
      category: category,
      sources: []
    }));
  } catch (error: any) {
    console.error("Erreur Gemini:", error);
    throw error;
  }
};

export const speakArticle = async (text: string, lang: Language): Promise<Uint8Array | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }], 
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { 
          voiceConfig: { prebuiltVoiceConfig: { voiceName: lang === Language.AR ? 'Zephyr' : 'Kore' } } 
        }
      }
    }));
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch (e) { 
    return null; 
  }
};

// CETTE LIGNE EST LA CORRECTION POUR VERCEL
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
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = data.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const dataInt8 = new Uint8Array(buffer, 44);
  dataInt8.set(data);

  return new Blob([buffer], { type: 'audio/wav' });
}
