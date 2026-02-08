import { GoogleGenAI } from "@google/genai";
import { Occurrence } from "../types";

/**
 * Analyzes a security occurrence using Gemini 2.5 Flash.
 * Provides risk assessment and corrective action suggestions.
 */
export const analyzeOccurrenceWithAI = async (occurrence: Occurrence): Promise<string> => {
  try {
    // Fallback to hardcoded key if env var fails (EMERGENCY FIX)
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || "AIzaSyBdkPmBFMmcCd5Ga4_H9HT-ZxltGpggnVI";

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      console.error("AI Error: API Key is missing or invalid.");
      return "Erro de configuração: Chave da API Google não encontrada ou inválida. Verifique o arquivo .env.local";
    }

    const ai = new GoogleGenAI({ apiKey });

    // Model changed to gemini-2.5-flash (found in user's model list)
    const prompt = `
      Analise a seguinte ocorrência de segurança e forneça um breve resumo, sugestões de ações corretivas e uma avaliação de risco baseada na descrição.
      
      Título: ${occurrence.title}
      Tipo: ${occurrence.type}
      Descrição: ${occurrence.description}
      Urgência: ${occurrence.urgency}
      Local: ${occurrence.location}
      
      Responda em formato de parágrafo profissional para um gestor de segurança em português.
    `;

    console.log("Requesting AI analysis from Gemini (2.5-flash)...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    console.log("AI Response received successfully");
    // In @google/genai v1.40+, response.text is a string property, not a function
    return response.text as string || "Não foi possível gerar análise no momento.";

  } catch (error: any) {
    console.error("AI Analysis Failed. Details:", error);
    // Expose more details to the user for debugging
    const errorMessage = error?.message || error?.toString() || "Erro desconhecido";
    return `Erro ao conectar com a Inteligência Artificial: ${errorMessage}`;
  }
};

/**
 * Generates management insights for the dashboard based on recent occurrences.
 */
export const getDashboardInsights = async (occurrences: Occurrence[]): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || "AIzaSyBdkPmBFMmcCd5Ga4_H9HT-ZxltGpggnVI";
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') return "Insights indisponíveis: Chave API não configurada.";

    const ai = new GoogleGenAI({ apiKey });

    const summary = occurrences.map(o => `${o.type} (${o.urgency}) no local ${o.location}`).join(', ');

    const prompt = `
      Com base nestas ocorrências recentes: ${summary.slice(0, 1000)}...
      Identifique as 3 principais tendências ou preocupações de segurança e sugira uma estratégia preventiva global.
      Responda em tópicos curtos e diretos em português.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text as string || "Insights não disponíveis.";
  } catch (error: any) {
    console.error("AI Insight Error:", error);
    const errorMessage = error?.message || error?.toString() || "Erro desconhecido";
    return `Erro ao obter insights gerenciais: ${errorMessage}`;
  }
};