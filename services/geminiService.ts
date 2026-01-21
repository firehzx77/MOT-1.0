
import { GoogleGenAI, Type } from "@google/genai";
import { MOTStage, Persona, Industry, EvaluationData } from "../types";

export const geminiService = {
  async getResponse(
    industry: Industry,
    persona: Persona,
    stage: MOTStage,
    history: { role: string; parts: { text: string }[] }[]
  ) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: history,
        config: {
          systemInstruction: `你现在扮演一名正在和客服沟通的客户。
          背景行业：${industry.name}。
          你的画像：${persona.name}，特点是${persona.traits.join("、")}。
          当前所处的服务阶段：${stage}。
          你的任务是：根据你的性格特点回复客服。你可以表现出不满、疑惑或满意。
          回复要求：
          1. 保持简短（50字以内）。
          2. 语气口语化，符合你的画像特征。
          3. 如果客服回复得体，你的敌意应逐渐降低；反之则升高。`,
          temperature: 0.8,
        }
      });
      return response.text || "（客户没有说话）";
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("AI 响应失败，请检查 API Key 配置或网络连接。");
    }
  },

  async getCoachAdvice(
    industry: Industry,
    persona: Persona,
    stage: MOTStage,
    lastCustomerMessage: string,
    lastUserMessage: string
  ) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: `客户刚才说: "${lastCustomerMessage}"\n客服回复说: "${lastUserMessage}"\n当前阶段: ${stage}` }] }
        ],
        config: {
          systemInstruction: `你是一名资深的MOT关键时刻服务导师。
          请针对客服的回复给出专业建议。
          如果是${MOTStage.EXPLORE}阶段，强调同理心和需求确认；
          如果是${MOTStage.OFFER}阶段，强调方案的针对性；
          如果是${MOTStage.ACTION}阶段，强调执行力和透明度；
          如果是${MOTStage.CONFIRM}阶段，强调闭环和客户满意度。
          返回格式必须为: "评价内容 | 标签1,标签2"`,
          temperature: 0.7,
        }
      });
      return response.text || "建议加载失败 | #重试";
    } catch (error) {
      return "无法获取导师建议，请检查配置。 | #系统异常";
    }
  },

  async evaluateSession(history: any[]): Promise<EvaluationData> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: 'user', parts: [{ text: `请对以下服务过程进行评估：\n${JSON.stringify(history)}` }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            empathy: { type: Type.NUMBER },
            logic: { type: Type.NUMBER },
            efficiency: { type: Type.NUMBER },
            compliance: { type: Type.NUMBER },
            professionalism: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyMoments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  time: { type: Type.STRING },
                  stage: { type: Type.STRING },
                  content: { type: Type.STRING },
                  comment: { type: Type.STRING }
                },
                required: ["type", "time", "stage", "content", "comment"]
              }
            }
          },
          required: ["overallScore", "summary", "keyMoments"]
        }
      }
    });
    
    return JSON.parse(response.text);
  }
};
