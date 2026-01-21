
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Industry, Persona, VoiceOption, MOTStage, Message, EvaluationData } from './types';
import { INDUSTRIES, PERSONAS, VOICES, getIndustryIcon } from './constants';
import { geminiService } from './services/geminiService';
import VoiceInput from './components/VoiceInput';
import { 
  Users, 
  Send, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  LayoutDashboard,
  History,
  Settings,
  BrainCircuit,
  Lightbulb,
  Award
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('config');
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>(INDUSTRIES[0]);
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[1]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[1]);
  
  const [currentStage, setCurrentStage] = useState<MOTStage>(MOTStage.EXPLORE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [coachAdvice, setCoachAdvice] = useState({ text: '点击开始对话，我将为您提供实时指导。', tags: [] as string[] });
  const [isLoading, setIsLoading] = useState(false);
  const [evalData, setEvalData] = useState<EvaluationData | null>(null);

  // Training Session Logic
  const handleStartTraining = async () => {
    setView('training');
    const initialPrompt = `(系统提示：作为${selectedPersona.name}，你刚刚来到${selectedIndustry.name}服务窗口。你的第一句话是什么？)`;
    setIsLoading(true);
    const firstMsg = await geminiService.getResponse(selectedIndustry, selectedPersona, MOTStage.EXPLORE, [{ role: 'user', parts: [{ text: initialPrompt }] }]);
    setMessages([{ id: '1', role: 'assistant', content: firstMsg, timestamp: Date.now() }]);
    setIsLoading(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const history = newMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const aiResponse = await geminiService.getResponse(selectedIndustry, selectedPersona, currentStage, history);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: aiResponse, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);

      // Get coach advice
      const adviceRaw = await geminiService.getCoachAdvice(selectedIndustry, selectedPersona, currentStage, aiResponse, text);
      const [adviceText, tagsStr] = adviceRaw.split('|');
      setCoachAdvice({ text: adviceText.trim(), tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [] });

      // Automatically advance stages if conversation seems to progress (simulated for demo)
      if (newMessages.length > 4 && currentStage === MOTStage.EXPLORE) setCurrentStage(MOTStage.OFFER);
      else if (newMessages.length > 7 && currentStage === MOTStage.OFFER) setCurrentStage(MOTStage.ACTION);
      else if (newMessages.length > 10 && currentStage === MOTStage.ACTION) setCurrentStage(MOTStage.CONFIRM);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishTraining = async () => {
    setIsLoading(true);
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const evaluation = await geminiService.evaluateSession(history);
    setEvalData(evaluation);
    setView('report');
    setIsLoading(false);
  };

  // Rendering Components
  const renderConfig = () => (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">配置您的训练场景</h1>
        <p className="text-slate-500 text-lg">请选择行业背景、客户画像以及AI教练的语音，系统将为您生成最真实的“关键时刻”服务挑战。</p>
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
          <h2 className="text-xl font-bold text-slate-800">选择行业领域</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {INDUSTRIES.map((ind) => (
            <div 
              key={ind.id}
              onClick={() => setSelectedIndustry(ind)}
              className={`p-6 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-lg ${selectedIndustry.id === ind.id ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-slate-100 bg-white'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${selectedIndustry.id === ind.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {getIndustryIcon(ind.icon)}
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{ind.name}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{ind.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
          <h2 className="text-xl font-bold text-slate-800">选择客户画像</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PERSONAS.map((p) => (
            <div 
              key={p.id}
              onClick={() => setSelectedPersona(p)}
              className={`flex gap-4 p-6 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-lg ${selectedPersona.id === p.id ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-slate-100 bg-white'}`}
            >
              <img src={p.avatar} alt={p.name} className="w-20 h-20 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${p.difficulty === '高' ? 'bg-red-100 text-red-600' : p.difficulty === '中' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    难度: {p.difficulty}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">{p.description}</p>
                <div className="flex gap-2">
                  {p.traits.map(t => <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 px-6 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4 text-slate-600 text-sm">
          <AlertCircle className="w-5 h-5 text-blue-500" />
          <span>已选：{selectedIndustry.name} | {selectedPersona.name} | {selectedVoice.name}</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => {}} className="px-6 py-2.5 rounded-xl border font-bold text-slate-600 hover:bg-slate-50 transition-colors">重置配置</button>
          <button 
            onClick={handleStartTraining}
            className="px-10 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
          >
            开始训练 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderTraining = () => (
    <div className="flex h-screen bg-slate-50">
      {/* Left Sidebar - Customer & Scenario */}
      <div className="w-80 border-r bg-white p-6 flex flex-col">
        <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">当前对话场景</h3>
            <div className="relative rounded-2xl overflow-hidden mb-4 aspect-square">
                <img src={selectedPersona.avatar} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold">实时模拟</div>
            </div>
            <h4 className="font-bold text-lg text-slate-900 mb-1">客户：{selectedPersona.name}</h4>
            <p className="text-slate-500 text-sm italic mb-6">"{messages[messages.length-1]?.role === 'assistant' ? messages[messages.length-1].content : '等待回复...'}"</p>
            
            <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">场景背景</p>
                    <div className="flex items-start gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5" />
                        <span className="text-xs text-slate-600">订单 #88219 - 高优先级</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                        <span className="text-xs text-slate-600">情绪状态：沮丧 / 不耐烦</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-4 pt-6 border-t">
            <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">92%</p>
                <p className="text-[10px] text-slate-400">平均成功率</p>
            </div>
            <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">12:45</p>
                <p className="text-[10px] text-slate-400">会话时长</p>
            </div>
        </div>
      </div>

      {/* Main Center - MOT Stage Visualization */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-hidden">
        <div className="relative w-80 h-80">
            {/* MOT Cycle Circle */}
            <div className="absolute inset-0 border-4 border-dashed border-slate-200 rounded-full"></div>
            
            <div className="absolute inset-0 flex items-center justify-center flex-col z-10">
                <p className="text-xs font-bold text-slate-400 italic">Moments of Truth</p>
                <p className="text-xl font-bold text-slate-900">关键时刻</p>
                <div className="mt-2 flex gap-1">
                    {[1,2,3,4].map(i => <div key={i} className={`h-1.5 w-4 rounded-full ${i <= Object.values(MOTStage).indexOf(currentStage) + 1 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>)}
                </div>
            </div>

            {/* Stages */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-full border-4 shadow-xl flex flex-col items-center transition-all ${currentStage === MOTStage.EXPLORE ? 'bg-blue-600 border-white text-white scale-110' : 'bg-white border-slate-50 text-slate-400'}`}>
                <BrainCircuit className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">EXPLORE 探索</span>
            </div>
            <div className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 p-4 rounded-full border-4 shadow-xl flex flex-col items-center transition-all ${currentStage === MOTStage.OFFER ? 'bg-red-500 border-white text-white scale-110' : 'bg-white border-slate-50 text-slate-400'}`}>
                <Lightbulb className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">OFFER 提议</span>
            </div>
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 p-4 rounded-full border-4 shadow-xl flex flex-col items-center transition-all ${currentStage === MOTStage.ACTION ? 'bg-green-500 border-white text-white scale-110' : 'bg-white border-slate-50 text-slate-400'}`}>
                <Send className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">ACTION 行动</span>
            </div>
            <div className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-full border-4 shadow-xl flex flex-col items-center transition-all ${currentStage === MOTStage.CONFIRM ? 'bg-purple-600 border-white text-white scale-110' : 'bg-white border-slate-50 text-slate-400'}`}>
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-[10px] font-bold mt-1">CONFIRM 确认</span>
            </div>
        </div>
        
        <div className="mt-16 text-center max-w-sm">
            <p className="text-slate-400 text-sm font-bold uppercase mb-2">当前阶段重点要点 ({currentStage})</p>
            <ul className="text-left space-y-2">
                <li className="flex gap-2 text-xs text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div> 提供满足甚至超出客户预期的解决方案</li>
                <li className="flex gap-2 text-xs text-slate-600"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div> 在提议中加入情感补偿，降低客户敌意</li>
            </ul>
        </div>
      </div>

      {/* Right Sidebar - Chat & Coach */}
      <div className="w-[450px] bg-white border-l flex flex-col">
        {/* Coach Header */}
        <div className="p-6 bg-blue-50/50 border-b relative">
            <div className="flex items-center gap-2 mb-4">
                <BrainCircuit className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">AI 导师建议 ({currentStage}阶段)</h3>
                <Award className="w-4 h-4 text-orange-500 ml-auto" />
                <span className="text-[10px] font-bold text-orange-600">AI导师</span>
            </div>
            <p className="text-sm text-slate-700 mb-4 italic">"{coachAdvice.text}"</p>
            <div className="flex gap-2">
                {coachAdvice.tags.map(t => <span key={t} className="text-[10px] bg-white border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{t}</span>)}
            </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="text-center"><span className="text-[10px] text-slate-300 font-bold uppercase">阶段：{currentStage} 进行中</span></div>
            {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                        {m.content}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-1">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                </div>
            )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t bg-white">
            <div className="flex items-center gap-2 mb-2">
                <button className="text-slate-400 hover:text-blue-600"><Settings className="w-4 h-4" /></button>
                <button className="text-slate-400 hover:text-blue-600"><History className="w-4 h-4" /></button>
                <button 
                  onClick={handleFinishTraining} 
                  className="ml-auto text-[10px] font-bold text-blue-600 uppercase hover:underline"
                >
                  结束对话并评估
                </button>
            </div>
            <div className="flex items-end gap-3">
                <VoiceInput onSendMessage={handleSendMessage} />
                <div className="flex-1 relative">
                    <textarea 
                        rows={2}
                        placeholder="根据导师建议输入您的回复..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage((e.target as HTMLTextAreaElement).value);
                                (e.target as HTMLTextAreaElement).value = '';
                            }
                        }}
                    />
                    <button 
                        onClick={(e) => {
                            const area = (e.currentTarget.previousSibling as HTMLTextAreaElement);
                            handleSendMessage(area.value);
                            area.value = '';
                        }}
                        className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  const renderReport = () => {
    if (!evalData) return <div>评估数据加载中...</div>;
    
    const radarData = [
      { subject: '同理心', A: evalData.empathy || 85 },
      { subject: '逻辑性', A: evalData.logic || 70 },
      { subject: 'MOT合规性', A: evalData.compliance || 90 },
      { subject: '处理效率', A: evalData.efficiency || 80 },
      { subject: '专业度', A: evalData.professionalism || 85 },
    ];

    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
            <div>
                <p className="text-slate-400 text-sm font-bold uppercase">训练中心 / 历史记录 / 详情</p>
                <h1 className="text-3xl font-bold text-slate-900 mt-2">练习结果专业度评分报告</h1>
                <p className="text-slate-500">评估模型: Moments of Truth (MOT) 交互式训练框架</p>
            </div>
            <div className="flex gap-4">
                <button className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50">导出 PDF</button>
                <button className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900">分享报告</button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">OVERALL PERFORMANCE</p>
                <div className="relative w-48 h-48 mb-8">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="96" cy="96" r="88" fill="transparent" stroke="#F1F5F9" strokeWidth="12" />
                        <circle cx="96" cy="96" r="88" fill="transparent" stroke="#0EA5E9" strokeWidth="12" strokeDasharray={552.92} strokeDashoffset={552.92 * (1 - evalData.overallScore / 100)} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-6xl font-bold text-slate-900">{evalData.overallScore}</span>
                        <span className="text-slate-400 font-bold">/ 100</span>
                    </div>
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-6 py-2 rounded-full font-bold text-sm mb-6 flex items-center gap-2">
                    <Award className="w-4 h-4" /> 共情大师 (Master of Empathy)
                </div>
                <p className="text-center text-slate-500 text-sm leading-relaxed">{evalData.summary}</p>
                
                <div className="w-full mt-10">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-l-4 border-blue-600 pl-4">五维能力分析</h4>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#E2E8F0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10 }} />
                                <Radar name="Score" dataKey="A" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.6} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">探索 (Explore)</h3>
                            <div className="flex gap-0.5"><CheckCircle2 className="w-4 h-4 text-orange-400" /><CheckCircle2 className="w-4 h-4 text-orange-400" /><CheckCircle2 className="w-4 h-4 text-orange-400" /><CheckCircle2 className="w-4 h-4 text-orange-400" /><CheckCircle2 className="w-4 h-4 text-slate-200" /></div>
                        </div>
                        <ul className="space-y-2">
                            {evalData.strengths.slice(0, 2).map((s, i) => (
                                <li key={i} className="flex gap-2 text-xs text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {s}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">提议 (Offer)</h3>
                            <div className="flex gap-0.5"><CheckCircle2 className="w-4 h-4 text-orange-400" /><CheckCircle2 className="w-4 h-4 text-orange-400" /><CheckCircle2 className="w-4 h-4 text-orange-400" /><CheckCircle2 className="w-4 h-4 text-orange-400" /><CheckCircle2 className="w-4 h-4 text-orange-400" /></div>
                        </div>
                         <ul className="space-y-2">
                            {evalData.strengths.slice(2, 4).map((s, i) => (
                                <li key={i} className="flex gap-2 text-xs text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {s}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-8 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" /> 关键时刻回顾 (Key Moments)
                    </h3>
                    <div className="space-y-6">
                        {evalData.keyMoments.map((m, i) => (
                            <div key={i} className="flex gap-6">
                                <div className="flex flex-col items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${m.type === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {m.type === 'positive' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 w-px bg-slate-100 my-2"></div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${m.type === 'positive' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {m.type === 'positive' ? 'BEST MOMENT' : 'CRITICAL GAP'}
                                        </span>
                                        <span className="text-xs text-slate-400">{m.time} - {m.stage}</span>
                                    </div>
                                    <div className={`p-4 rounded-xl mb-3 text-sm italic ${m.type === 'positive' ? 'bg-emerald-50/50 text-emerald-800' : 'bg-rose-50/50 text-rose-800'}`}>
                                        "{m.content}"
                                    </div>
                                    <p className="text-xs text-slate-600"><span className="font-bold text-slate-900">专家点评：</span> {m.comment}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-12 flex justify-center gap-4">
             <button 
                onClick={() => setView('config')}
                className="px-10 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
                重新练习 (Re-train)
            </button>
            <button 
                onClick={() => setView('dashboard')}
                className="px-10 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 transition-colors flex items-center gap-2"
            >
                查看成长详情 (Full Analysis) <ChevronRight className="w-4 h-4" />
            </button>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-12">
        <div>
          <p className="text-slate-400 text-sm font-bold uppercase">训练中心 / 统计分析 / 个人成长</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">历史成长趋势分析</h1>
        </div>
        <div className="flex gap-4">
           <button className="px-6 py-2 bg-white border rounded-lg text-sm font-bold flex items-center gap-2"><History className="w-4 h-4" /> 查看历史列表</button>
           <button onClick={() => setView('config')} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center gap-2"><Send className="w-4 h-4" /> 开始新训练</button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border shadow-sm mb-8">
        <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">成长曲线 (Overall Progress)</h3>
            <div className="flex gap-2 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> 专业度得分</span>
            </div>
        </div>
        <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                    { name: '10-01', score: 65 }, { name: '10-05', score: 72 }, { name: '10-10', score: 68 },
                    { name: '10-15', score: 78 }, { name: '10-20', score: 85 }, { name: '10-25', score: 92 }
                ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dx={-10} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Line type="monotone" dataKey="score" stroke="#0EA5E9" strokeWidth={4} dot={{r: 6, fill: '#0EA5E9', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
             <div className="bg-white p-8 rounded-3xl border shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6">分维度进步趋势 (Progress by Dimension)</h3>
                <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                    {[
                        { label: '同理心', value: 32, icon: 'Users' },
                        { label: '逻辑性', value: 15, icon: 'BrainCircuit' },
                        { label: 'MOT合规', value: 28, icon: 'CheckCircle2' },
                        { label: '专业度', value: 20, icon: 'Award' }
                    ].map(d => (
                        <div key={d.label}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-600">{d.label}</span>
                                <span className="text-xs text-emerald-500 font-bold">+{d.value}%</span>
                            </div>
                            <div className="h-10 bg-slate-50 rounded overflow-hidden flex gap-0.5">
                                <div className="h-full bg-slate-200" style={{width: '60%'}}></div>
                                <div className="h-full bg-emerald-500" style={{width: `${d.value}%`}}></div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
             <div className="bg-white p-8 rounded-3xl border shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6">待提升领域 (Areas for Improvement)</h3>
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 border border-orange-100">
                        <Clock className="w-5 h-5 text-orange-500 mt-1" />
                        <div>
                            <p className="font-bold text-slate-900 text-sm">探索阶段的时长控制</p>
                            <p className="text-xs text-slate-500">数据提示您在“探索”环节时长比专家标准多出25%，建议精简开放式提问。</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                        <Users className="w-5 h-5 text-blue-500 mt-1" />
                        <div>
                            <p className="font-bold text-slate-900 text-sm">极端负面情绪的应对</p>
                            <p className="text-xs text-slate-500">在最近3场包含“客户愤怒”标签的训练中，您的逻辑性评分保持稳定但共情分有所下滑。</p>
                        </div>
                    </div>
                </div>
             </div>
        </div>

        <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border shadow-sm">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><Award className="w-5 h-5 text-blue-600" /> 里程碑成就 (Milestones)</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600"><CheckCircle2 /></div>
                        <div><p className="text-sm font-bold">7天连续训练</p><p className="text-[10px] text-slate-400">达成日期: 2023-10-20</p></div>
                    </div>
                    <div className="flex items-center gap-4 opacity-50 grayscale">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><BrainCircuit /></div>
                        <div><p className="text-sm font-bold">共情之王 (Empathy King)</p><p className="text-[10px] text-slate-400">解锁条件：同理心连续5次满分</p></div>
                    </div>
                    <button className="w-full py-2 border rounded-lg text-xs font-bold text-slate-500 mt-4">查看所有 12 项成就</button>
                </div>
            </div>
            <div className="bg-slate-900 p-8 rounded-3xl text-white">
                <h3 className="text-sm font-bold opacity-60 mb-8">成长数据总览</h3>
                <div className="grid grid-cols-2 gap-8">
                    <div><p className="text-3xl font-bold">42</p><p className="text-[10px] opacity-60 mt-1 uppercase">累计训练场次</p></div>
                    <div><p className="text-3xl font-bold">+24%</p><p className="text-[10px] opacity-60 mt-1 uppercase">平均分增长率</p></div>
                    <div><p className="text-3xl font-bold">15.5h</p><p className="text-[10px] opacity-60 mt-1 uppercase">练习总时长</p></div>
                    <div><p className="text-3xl font-bold">Top 5%</p><p className="text-[10px] opacity-60 mt-1 uppercase">全平台排名</p></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Universal Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-slate-900 leading-none mb-1">Moments of Truth</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AI 交互式训练引擎</p>
            </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => setView('config')} className={`text-sm font-bold transition-colors ${view === 'config' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>场景配置</button>
            <button onClick={() => setView('dashboard')} className={`text-sm font-bold transition-colors ${view === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>成长分析</button>
            <button className="text-sm font-bold text-slate-400 hover:text-slate-600">训练大厅</button>
        </nav>

        <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">当前步骤</p>
                <p className="text-sm font-bold text-blue-600">{view === 'config' ? '场景配置与初始化' : view === 'training' ? 'AI 互动实战演练' : '评估报告生成中'}</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-slate-100">
                <img src="https://picsum.photos/seed/user/100/100" alt="User" />
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pb-32">
        {view === 'config' && renderConfig()}
        {view === 'training' && renderTraining()}
        {view === 'report' && renderReport()}
        {view === 'dashboard' && renderDashboard()}
      </main>
    </div>
  );
};

export default App;
