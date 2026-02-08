import { GoogleGenAI } from "@google/genai";
import { Occurrence } from "../types";

/**
 * Analyzes a security occurrence using Gemini 3 Flash.
 * Provides risk assessment and corrective action suggestions.
 */
export const analyzeOccurrenceWithAI = async (occurrence: Occurrence): Promise<string> => {
  // Always initialize right before use with named parameter
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analise a seguinte ocorrência de segurança e forneça um breve resumo, sugestões de ações corretivas e uma avaliação de risco baseada na descrição.
    
    Título: ${occurrence.title}
    Tipo: ${occurrence.type}
    Descrição: ${occurrence.description}
    Urgência: ${occurrence.urgency}
    Local: ${occurrence.location}
    
    Responda em formato de parágrafo profissional para um gestor de segurança em português.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Access property directly per documentation
    return response.text || "Não foi possível gerar análise no momento.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "Erro ao processar análise inteligente.";
  }
};

/**
 * Generates management insights for the dashboard based on recent occurrences.
 */
export const getDashboardInsights = async (occurrences: Occurrence[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = occurrences.map(o => `${o.type} (${o.urgency}) no local ${o.location}`).join(', ');
  
  const prompt = `
    Com base nestas ocorrências recentes: ${summary.slice(0, 1000)}...
    Identifique as 3 principais tendências ou preocupações de segurança e sugira uma estratégia preventiva global.
    Responda em tópicos curtos e diretos em português.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Access property directly per documentation
    return response.text || "Insights não disponíveis.";
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Erro ao obter insights gerenciais.";
  }
};