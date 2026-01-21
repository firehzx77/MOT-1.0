
import { MOTStage, Persona, Industry, EvaluationData } from "../types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

// 助手函数：将对话历史转换为 OpenAI/DeepSeek 兼容格式
const transformHistory = (history: any[], systemInstruction: string) => {
  const messages = [{ role: "system", content: systemInstruction }];
  history.forEach(item => {
    messages.push({
      role: item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user',
      content: item.parts?.[0]?.text || item.content || ""
    });
  });
  return messages;
};

export const geminiService = {
  // 获取 API KEY 的安全方法
  getApiKey() {
    // 兼容 Vercel 注入和本地环境
    return process.env.API_KEY || "";
  },

  async getResponse(
    industry: Industry,
    persona: Persona,
    stage: MOTStage,
    history: { role: string; parts: { text: string }[] }[]
  ) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("API_KEY 缺失：请在 Vercel 环境变量中设置 'API_KEY' (不要带前缀)。");
    }

    const systemInstruction = `你扮演一名在${industry.name}场景下的客户。
    你的名字是${persona.name}，性格特点：${persona.traits.join("、")}。
    当前处于：${stage}阶段。
    要求：语气口语化，保持回复在50字以内。根据客服表现给出真实反应，表现出你的性格。`;

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: transformHistory(history, systemInstruction),
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "接口调用失败");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      throw new Error(`[DeepSeek] ${error.message}`);
    }
  },

  async getCoachAdvice(industry: Industry, persona: Persona, stage: MOTStage, lastCustomer: string, lastUser: string) {
    const apiKey = this.getApiKey();
    if (!apiKey) return "配置错误 | #KEY_MISSING";

    const systemInstruction = `你是一名MOT关键时刻专家导师。请根据客服对"${persona.name}"的回复给出点评和改进建议。返回格式：点评内容 | 标签1,标签2`;

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `阶段: ${stage}\n客户说: "${lastCustomer}"\n客服回: "${lastUser}"` }
          ]
        })
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch {
      return "建议获取失败 | #ERROR";
    }
  },

  async evaluateSession(history: any[]): Promise<EvaluationData> {
    const apiKey = this.getApiKey();
    const systemInstruction = `你是一名服务质量评估专家。请对对话进行打分，必须返回 JSON。
    JSON格式: {
      "overallScore": 80,
      "empathy": 4, "logic": 5, "efficiency": 3, "compliance": 5, "professionalism": 4,
      "summary": "...", "strengths": [], "weaknesses": [],
      "keyMoments": [{"type": "positive", "time": "1s", "stage": "探索", "content": "...", "comment": "..."}]
    }`;

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `评估此对话: ${JSON.stringify(history)}` }
          ],
          response_format: { type: "json_object" }
        })
      });
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch {
      throw new Error("评估生成失败");
    }
  }
};
