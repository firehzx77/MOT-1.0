
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
  Award,
  RefreshCcw
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
  const [apiHistory, setApiHistory] = useState<{role: string; parts: {text: string}[]}[]>([]);
  const [coachAdvice, setCoachAdvice] = useState({ text: '点击开始对话，我将为您提供实时指导。', tags: [] as string[] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evalData, setEvalData] = useState<EvaluationData | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Training Session Logic
  const handleStartTraining = async () => {
    setView('training');
    setError(null);
    setIsLoading(true);
    
    const initialPrompt = `(系统提示：作为${selectedPersona.name}，你现在来到了${selectedIndustry.name}服务台，由于某些原因你现在心情很不好，请开始你的第一句对话，直接进入角色，不要跳戏。)`;
    
    try {
      const firstUserTurn = { role: 'user', parts: [{ text: initialPrompt }] };
      const firstMsg = await geminiService.getResponse(selectedIndustry, selectedPersona, MOTStage.EXPLORE, [firstUserTurn]);
      
      const aiMsg: Message = { id: '1', role: 'assistant', content: firstMsg, timestamp: Date.now() };
      setMessages([aiMsg]);
      setApiHistory([firstUserTurn, { role: 'model', parts: [{ text: firstMsg }] }]);
    } catch (err: any) {
      setError(err.message || "初始化对话失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const newApiHistory = [...apiHistory, { role: 'user', parts: [{ text: text }] }];
      
      const aiResponse = await geminiService.getResponse(selectedIndustry, selectedPersona, currentStage, newApiHistory);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: aiResponse, timestamp: Date.now() };
      
      setMessages(prev => [...prev, aiMsg]);
      setApiHistory([...newApiHistory, { role: 'model', parts: [{ text: aiResponse }] }]);

      // Get coach advice
      const adviceRaw = await geminiService.getCoachAdvice(selectedIndustry, selectedPersona, currentStage, aiResponse, text);
      const [adviceText, tagsStr] = adviceRaw.split('|');
      setCoachAdvice({ 
        text: adviceText.trim(), 
        tags: tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [] 
      });

      // Simple stage progression logic
      const turnCount = messages.length + 2;
      if (turnCount > 4 && currentStage === MOTStage.EXPLORE) setCurrentStage(MOTStage.OFFER);
      else if (turnCount > 7 && currentStage === MOTStage.OFFER) setCurrentStage(MOTStage.ACTION);
      else if (turnCount > 10 && currentStage === MOTStage.ACTION) setCurrentStage(MOTStage.CONFIRM);

    } catch (err: any) {
      setError(err.message || "发送消息失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishTraining = async () => {
    setIsLoading(true);
    try {
      const historySummary = messages.map(m => ({ role: m.role, content: m.content }));
      const evaluation = await geminiService.evaluateSession(historySummary);
      setEvalData(evaluation);
      setView('report');
    } catch (err: any) {
      setError("生成评估报告失败");
    } finally {
      setIsLoading(false);
    }
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {INDUSTRIES.map((ind) => (
            <div 
              key={ind.id}
              onClick={() => setSelectedIndustry(ind)}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-lg ${selectedIndustry.id === ind.id ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-slate-100 bg-white'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${selectedIndustry.id === ind.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {getIndustryIcon(ind.icon)}
              </div>
              <h3 className="font-bold text-slate-900 mb-1 text-sm">{ind.name}</h3>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{ind.description}</p>
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
              <img src={p.avatar} alt={p.name} className="w-20 h-20 rounded-xl object-cover shadow-sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${p.difficulty === '高' ? 'bg-red-100 text-red-600' : p.difficulty === '中' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    难度: {p.difficulty}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">{p.description}</p>
                <div className="flex flex-wrap gap-1">
                  {p.traits.map(t => <span key={t} className="text-[9px] bg-white border border-slate-100 text-slate-500 px-2 py-0.5 rounded shadow-sm">{t}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-4 px-6 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4 text-slate-600 text-sm">
          <AlertCircle className="w-5 h-5 text-blue-500" />
          <span className="font-medium">已就绪：{selectedIndustry.name} × {selectedPersona.name}</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleStartTraining}
            disabled={isLoading}
            className="px-12 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-xl shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? '初始化中...' : '立即开始训练'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderTraining = () => (
    <div className="flex h-screen bg-slate-50">
      <div className="w-80 border-r bg-white p-6 flex flex-col shadow-sm">
        <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">目标客户信息</h3>
            <div className="relative rounded-2xl overflow-hidden mb-4 aspect-square shadow-lg border-4 border-white">
                <img src={selectedPersona.avatar} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <p className="text-white font-bold">{selectedPersona.name}</p>
                </div>
            </div>
            
            <div className="space-y-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">实战背景</p>
                    <div className="flex items-start gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5" />
                        <span className="text-xs text-slate-600 font-medium">{selectedIndustry.name}场景对话</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                        <span className="text-xs text-slate-600 font-medium">性格：{selectedPersona.traits.join('/')}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-auto pt-6 border-t">
          <button 
            onClick={() => setView('config')}
            className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-3 h-3" /> 重新配置场景
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-hidden relative">
        {error && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 shadow-lg animate-bounce">
            <AlertCircle className="text-red-500" />
            <span className="text-red-700 text-sm font-bold">{error}</span>
            <button onClick={handleStartTraining} className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">重试</button>
          </div>
        )}

        <div className="relative w-72 h-72">
            <div className="absolute inset-0 border-4 border-dashed border-slate-200 rounded-full animate-[spin_20s_linear_infinite]"></div>
            <div className="absolute inset-0 flex items-center justify-center flex-col z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Stage</p>
                <p className="text-2xl font-black text-slate-900">{currentStage}</p>
            </div>

            <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-full border-4 shadow-xl flex flex-col items-center transition-all ${currentStage === MOTStage.EXPLORE ? 'bg-blue-600 border-white text-white scale-110 z-20' : 'bg-white border-slate-50 text-slate-400'}`}>
                <BrainCircuit className="w-6 h-6" />
                <span className="text-[9px] font-bold mt-1">探索</span>
            </div>
            <div className={`absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 p-4 rounded-full border-4 shadow-xl flex flex-col items-center transition-all ${currentStage === MOTStage.OFFER ? 'bg-orange-500 border-white text-white scale-110 z-20' : 'bg-white border-slate-50 text-slate-400'}`}>
                <Lightbulb className="w-6 h-6" />
                <span className="text-[9px] font-bold mt-1">提议</span>
            </div>
            <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 p-4 rounded-full border-4 shadow-xl flex flex-col items-center transition-all ${currentStage === MOTStage.ACTION ? 'bg-emerald-500 border-white text-white scale-110 z-20' : 'bg-white border-slate-50 text-slate-400'}`}>
                <Send className="w-6 h-6" />
                <span className="text-[9px] font-bold mt-1">行动</span>
            </div>
            <div className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-full border-4 shadow-xl flex flex-col items-center transition-all ${currentStage === MOTStage.CONFIRM ? 'bg-purple-600 border-white text-white scale-110 z-20' : 'bg-white border-slate-50 text-slate-400'}`}>
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-[9px] font-bold mt-1">确认</span>
            </div>
        </div>
        
        <div className="mt-16 text-center max-w-sm">
            <p className="text-slate-400 text-[10px] font-bold uppercase mb-4 tracking-widest">服务要点提示</p>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-left">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {currentStage === MOTStage.EXPLORE && "积极倾听客户诉求，使用同理心话术化解负面情绪。"}
                {currentStage === MOTStage.OFFER && "根据客户需求提供具体的解决方案，并征得客户同意。"}
                {currentStage === MOTStage.ACTION && "清晰告知客户接下来的处理流程和预计所需时间。"}
                {currentStage === MOTStage.CONFIRM && "确认客户已完全理解并对当前结果表示接受。"}
              </p>
            </div>
        </div>
      </div>

      <div className="w-[480px] bg-white border-l flex flex-col shadow-2xl">
        <div className="p-6 bg-blue-50/80 border-b backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">AI 导师即时反馈</h3>
                <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold ml-auto uppercase">Coach Mode</span>
            </div>
            <p className="text-xs text-slate-700 mb-4 leading-relaxed font-medium">"{coachAdvice.text}"</p>
            <div className="flex flex-wrap gap-2">
                {coachAdvice.tags.map(t => <span key={t} className="text-[9px] bg-white text-blue-600 px-2 py-1 rounded-md font-bold shadow-sm border border-blue-100">{t}</span>)}
            </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50/30">
            {messages.length === 0 && !isLoading && !error && (
              <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <RefreshCcw className="w-12 h-12 mb-4 animate-spin-slow" />
                <p className="text-sm font-medium">等待初始化...</p>
              </div>
            )}
            
            {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-lg' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm'}`}>
                        {m.content}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-1.5 shadow-sm">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t bg-white">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex gap-4">
                  <button className="text-slate-400 hover:text-blue-600 transition-colors"><Settings className="w-4 h-4" /></button>
                  <button className="text-slate-400 hover:text-blue-600 transition-colors"><History className="w-4 h-4" /></button>
                </div>
                <button 
                  onClick={handleFinishTraining}
                  disabled={messages.length < 3 || isLoading}
                  className="text-[10px] font-bold text-blue-600 uppercase hover:underline disabled:opacity-30"
                >
                  结束并生成评分报告
                </button>
            </div>
            <div className="flex items-end gap-3">
                <VoiceInput onSendMessage={handleSendMessage} />
                <div className="flex-1 relative">
                    <textarea 
                        rows={2}
                        disabled={isLoading}
                        placeholder="输入您的沟通回复..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none disabled:opacity-50"
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
                        disabled={isLoading}
                        className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  const renderReport = () => (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
          <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Training Report</p>
              <h1 className="text-3xl font-black text-slate-900 mt-2">服务能力专业测评报告</h1>
          </div>
          <button 
            onClick={() => setView('config')}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all flex items-center gap-2"
          >
            返回重新训练 <RefreshCcw className="w-4 h-4" />
          </button>
      </div>

      {!evalData ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed">
          <RefreshCcw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="font-bold text-slate-500">正在通过 AI 生成深度评估报告...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-3xl border shadow-xl shadow-slate-200/50 flex flex-col items-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-12">Total Score</p>
                <div className="relative w-52 h-52 mb-10">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="104" cy="104" r="94" fill="transparent" stroke="#F1F5F9" strokeWidth="14" />
                        <circle cx="104" cy="104" r="94" fill="transparent" stroke="#3B82F6" strokeWidth="14" strokeDasharray={590.6} strokeDashoffset={590.6 * (1 - evalData.overallScore / 100)} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-7xl font-black text-slate-900 tracking-tighter">{evalData.overallScore}</span>
                    </div>
                </div>
                <div className="bg-blue-600 text-white px-8 py-2 rounded-full font-bold text-sm mb-8 shadow-lg shadow-blue-200">
                    {evalData.overallScore >= 90 ? '卓越服务专家' : evalData.overallScore >= 80 ? '专业服务达人' : '潜力服务者'}
                </div>
                <p className="text-center text-slate-500 text-sm leading-relaxed px-4">{evalData.summary}</p>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-3xl border shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-8 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" /> 关键时刻回溯
                  </h3>
                  <div className="space-y-8">
                      {evalData.keyMoments.map((m, i) => (
                          <div key={i} className="flex gap-6">
                              <div className="flex flex-col items-center">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${m.type === 'positive' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                      {m.type === 'positive' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                  </div>
                                  <div className="flex-1 w-px bg-slate-100 my-2"></div>
                              </div>
                              <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded tracking-widest ${m.type === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                          {m.type === 'positive' ? 'EXCELLENT' : 'CRITICAL'}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400">{m.stage}</span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-900 mb-2 leading-relaxed">"{m.content}"</p>
                                  <div className="bg-slate-50 p-4 rounded-xl">
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium"><span className="text-slate-900 font-bold">导师点评：</span>{m.comment}</p>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
            </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-md border-b px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-black text-slate-900 leading-none mb-1 tracking-tight">MOT Trainer</h1>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Moments of Truth AI</p>
            </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-10">
            <button onClick={() => setView('config')} className={`text-xs font-black uppercase tracking-widest transition-colors ${view === 'config' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-400 hover:text-slate-600'}`}>场景配置</button>
            <button onClick={() => setView('dashboard')} className={`text-xs font-black uppercase tracking-widest transition-colors ${view === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-400 hover:text-slate-600'}`}>成长分析</button>
        </nav>

        <div className="flex items-center gap-6">
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-xl overflow-hidden bg-slate-200">
                <img src="https://picsum.photos/seed/user123/100/100" alt="User" />
            </div>
        </div>
      </header>

      <main className="pb-32">
        {view === 'config' && renderConfig()}
        {view === 'training' && renderTraining()}
        {view === 'report' && renderReport()}
        {view === 'dashboard' && <div className="p-12 text-center text-slate-400 font-bold">看板模块正在同步历史数据...</div>}
      </main>
    </div>
  );
};

export default App;
