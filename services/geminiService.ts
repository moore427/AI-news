
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 批量翻譯標題為專業繁體中文
 */
export const translateHeadlines = async (headlines: string[]): Promise<string[]> => {
  if (headlines.length === 0) return [];
  
  try {
    const prompt = `你是一個專業的財經翻譯官。請將以下金融新聞標題翻譯為準確、簡潔的繁體中文。
保持專業術語的正確性（例如：Fed 翻譯為聯準會, ECB 翻譯為歐洲央行, Short 翻譯為放空/做空）。
請直接回傳翻譯後的清單，每行一個，不要有編號或額外說明。

標題清單：
${headlines.join('\n')}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.1, // 降低隨機性，提高準確度
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const translatedText = response.text || "";
    return translatedText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return headlines; // 失敗時回傳原標題
  }
};

export const summarizeHeadline = async (headline: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `請針對這則金融標題提供一段繁體中文摘要，並說明其對市場的潛在影響： "${headline}"。請確保口吻專業且簡潔。`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "無法生成摘要。";
  } catch (error) {
    console.error("Gemini Summarization Error:", error);
    return "生成摘要時發生錯誤。";
  }
};

export const getMarketAnalysis = async (headlines: NewsItem[]): Promise<string> => {
  const context = headlines.slice(0, 10).map(h => h.text).join('\n');
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位資深定量分析師。請根據以下最新的市場標題，提供三段式的繁體中文市場展望報告。內容需包含當前主導趨勢及潛在風險。

新聞標題：
${context}`,
    });
    return response.text || "目前無法提供市場分析。";
  } catch (error) {
    console.error("Gemini Market Analysis Error:", error);
    return "AI 分析師目前離線。";
  }
};

export const chatWithAnalyst = async (message: string, currentMarketContext: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位專業的金融分析師。請使用以下市場脈絡回答使用者的問題，請務必使用繁體中文。若脈絡中無相關資訊，請根據你的專業知識回答，但需保持謹慎。

市場脈絡：
${currentMarketContext}

使用者提問： ${message}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || "抱歉，我無法處理該請求。";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "連接 AI 分析師失敗。";
  }
};
