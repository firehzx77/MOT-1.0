
import { MOTStage, Persona, Industry, EvaluationData } from "../types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

/**
 * 助手函数：将 App 的历史格式转换为 DeepSeek 的 messages 格式
 */
const transformHistory = (history: any[], systemInstruction: string) => {
  const messages = [
    { role: "system", content: systemInstruction }
  ];
  
  history.forEach(item => {
    messages.push({
      role: item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user',
      content: item.parts?.[0]?.text || item.content || ""
    });
  });
  
  return messages;
};

export const geminiService = {
  async getResponse(
    industry: Industry,
    persona: Persona,
    stage: MOTStage,
    history: { role: string; parts: { text: string }[] }[]
  ) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("环境变量 API_KEY 缺失，请在 Vercel 中配置。");
    }

    const systemInstruction = `你现在扮演一名正在和客服沟通的客户。
    背景行业：${industry.name}。
    你的画像：${persona.name}，特点是${persona.traits.join("、")}。
    当前所处的服务阶段：${stage}。
    任务：根据性格回复客服。保持简短（50字内），语气口语化。
    随着客服表现好坏，你的情绪会有所波动。`;

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
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content || "（客户没有说话）";
    } catch (error: any) {
      console.error("DeepSeek API Error:", error);
      throw new Error(`AI 响应失败: ${error.message}`);
    }
  },

  async getCoachAdvice(
    industry: Industry,
    persona: Persona,
    stage: MOTStage,
    lastCustomerMessage: string,
    lastUserMessage: string
  ) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "配置错误 | #API_KEY_MISSING";

    const systemInstruction = `你是一名资深的MOT关键时刻服务导师。针对客服回复给出专业建议。格式必须为: "评价内容 | 标签1,标签2"`;

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
            { role: "user", content: `客户刚才说: "${lastCustomerMessage}"\n客服回复说: "${lastUserMessage}"\n当前阶段: ${stage}` }
          ],
          temperature: 0.5
        })
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "建议加载失败 | #重试";
    } catch (error) {
      return "无法获取导师建议 | #系统异常";
    }
  },

  async evaluateSession(history: any[]): Promise<EvaluationData> {
    const apiKey = process.env.API_KEY;
    const systemInstruction = `你是一名服务质量评估专家。请对以下对话进行多维度评估，并返回 JSON 格式结果。
    JSON 结构示例：
    {
      "overallScore": 85,
      "empathy": 4,
      "logic": 5,
      "efficiency": 4,
      "compliance": 5,
      "professionalism": 4,
      "summary": "总结...",
      "strengths": ["优点1"],
      "weaknesses": ["缺点1"],
      "keyMoments": [{"type": "positive", "time": "12:00", "stage": "探索", "content": "内容", "comment": "点评"}]
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
            { role: "user", content: `请评估这段对话：${JSON.stringify(history)}` }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error("Evaluation Error:", error);
      throw new Error("生成评估报告失败");
    }
  }
};
