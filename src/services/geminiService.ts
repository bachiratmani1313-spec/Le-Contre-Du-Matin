import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

export async function generateSectionContent(section: string) {
  const prompts: Record<string, string> = {
    intro: "Génère l'éditorial du jour pour 'Le Contre'. Analyse l'état du monde avec recul et exigence intellectuelle.",
    world: "Rédige un article d'investigation sur les actualités mondiales réelles des dernières 24h. Ne rapporte que des faits vérifiables.",
    geopolitics: "Analyse les enjeux géopolitiques profonds basés sur les événements réels récents.",
    weather: "Donne les prévisions météo réelles pour la Belgique et analyse l'impact climatique local aujourd'hui.",
    europe: "Analyse les décisions réelles prises à Bruxelles et leur impact sur les citoyens européens.",
    finance: "Fais un point sur la Bourse et les Cryptomonnaies avec les chiffres réels des dernières 24h.",
    ai: "Rapporte les avancées technologiques réelles en IA et leurs implications concrètes."
  };

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompts[section] || "Rédige un article de journal basé sur des faits réels.",
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          content: { type: Type.STRING },
          truthContent: { type: Type.STRING, description: "L'analyse de fond, ce que les médias classiques ne disent pas." },
          physicalFacts: { type: Type.STRING, description: "Les faits bruts, chiffres et données vérifiables." },
          strategicAdvice: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, description: "Action concrète recommandée." },
              details: { type: Type.STRING, description: "Détails de l'action." }
            },
            required: ["action", "details"]
          }
        },
        required: ["title", "summary", "content", "truthContent", "physicalFacts", "strategicAdvice"]
      },
      systemInstruction: "Tu es le rédacteur en chef de 'Le Contre' (Fondateur: Atmani Bachir). Ta mission est la VÉRITÉ ABSOLUE. Il est STRICTEMENT INTERDIT d'inventer quoi que ce soit. Utilise Google Search pour valider chaque information. Ton style est incisif, professionnel et sans concession.",
    },
  }));

  return JSON.parse(response.text);
}

export async function generateJournalImage(prompt: string) {
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `Une illustration journalistique de haute qualité, style minimaliste et sérieux. Thème : ${prompt}.` }],
    },
    config: {
      imageConfig: { aspectRatio: "16:9" }
    },
  }));

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function generateJournalAudio(text: string) {
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Lecture professionnelle pour Le Contre : ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  }));

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/mp3;base64,${base64Audio}`;
  }
  return null;
}
