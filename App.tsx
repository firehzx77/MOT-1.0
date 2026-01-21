
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Industry, Persona, VoiceOption, MOTStage, Message, EvaluationData } from './types';
import { INDUSTRIES, PERSONAS, VOICES, getIndustryIcon } from './constants';
import { geminiService } from './services/geminiService';
import VoiceInput from './components/VoiceInput';
import { 
  Send, 
  ChevronRight, 
  AlertCircle, 
  BrainCircuit, 
  Lightbulb, 
  CheckCircle2,
  RefreshCcw,
  History,
  Settings,
  Star,
  Trophy
} from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('config');
  const [selectedIndustry, setSelectedIndustry] = useState<Industry>(INDUSTRIES[0]);
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[1]);
  const [currentStage, setCurrentStage] = useState<MOTStage>(MOTStage.EXPLORE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiHistory, setApiHistory] = useState<any[]>([]);
  const [coachAdvice, setCoachAdvice] = useState({ text: '点击开始对话，我将为您提供实时指导。', tags: [] as string[] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evalData, setEvalData] = useState<EvaluationData | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleStartTraining = async () => {
    setView('training');
    setError(null);
    setIsLoading(true);
    setMessages([]);
    setApiHistory([]);
    setCurrentStage(MOTStage.EXPLORE);
    
    try {
      const initialPrompt = `(系统提示：作为${selectedPersona.name}，你来到了${selectedIndustry.name}服务台，由于某些原因你心情不好。请直接说出第一句挑衅或不满的话。)`;
      const firstUserTurn = { role: 'user', parts: [{ text: initialPrompt }] };
      const firstMsg = await geminiService.getResponse(selectedIndustry, selectedPersona, MOTStage.EXPLORE, [firstUserTurn]);
      
      const aiMsg: Message = { id: '1', role: 'assistant', content: firstMsg, timestamp: Date.now() };
      setMessages([aiMsg]);
      setApiHistory([firstUserTurn, { role: 'model', parts: [{ text: firstMsg }] }]);
    } catch (err: any) {
      setError(err.message);
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
      const lastAiMsg = messages[messages.length - 1]?.content || "";
      const newApiHistory = [...apiHistory, { role: 'user', parts: [{ text: text }] }];
      const aiResponse = await geminiService.getResponse(selectedIndustry, selectedPersona, currentStage, newApiHistory);
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: aiResponse, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
      setApiHistory([...newApiHistory, { role: 'model', parts: [{ text: aiResponse }] }]);

      const adviceRaw = await geminiService.getCoachAdvice(selectedIndustry, selectedPersona, currentStage, aiResponse, text);
      const [adviceText, tagsStr] = adviceRaw.split('|');
      setCoachAdvice({ 
        text: adviceText.trim(), 
        tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [] 
      });

      // 阶段逻辑跳转
      const count = messages.length;
      if (count > 4 && currentStage === MOTStage.EXPLORE) setCurrentStage(MOTStage.OFFER);
      if (count > 8 && currentStage === MOTStage.OFFER) setCurrentStage(MOTStage.ACTION);
      if (count > 12 && currentStage === MOTStage.ACTION) setCurrentStage(MOTStage.CONFIRM);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderConfig = () => (
    <div className="max-w-6xl mx-auto px-6 py-12 pb-32">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">MOT Trainer AI</h1>
        <p className="text-slate-500">DeepSeek 关键时刻智能体 - 提升您的服务沟通技巧</p>
      </div>

      <section className="mb-10">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div> 1. 选择行业场景
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {INDUSTRIES.map(ind => (
            <div 
              key={ind.id}
              onClick={() => setSelectedIndustry(ind)}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedIndustry.id === ind.id ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-100 bg-white hover:border-slate-300'}`}
            >
              <div className={`mb-4 w-10 h-10 rounded-xl flex items-center justify-center ${selectedIndustry.id === ind.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {getIndustryIcon(ind.icon)}
              </div>
              <p className="font-bold text-sm text-slate-900">{ind.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div> 2. 选择对手画像
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PERSONAS.map(p => (
            <div 
              key={p.id}
              onClick={() => setSelectedPersona(p)}
              className={`flex gap-4 p-6 rounded-3xl border-2 cursor-pointer transition-all ${selectedPersona.id === p.id ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-100 bg-white hover:border-slate-300'}`}
            >
              <img src={p.avatar} alt={p.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.difficulty === '高' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {p.difficulty}难度
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500">已选：{selectedIndustry.name} | 对手：{selectedPersona.name}</div>
        <button 
          onClick={handleStartTraining}
          className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          进入实战训练 <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderTraining = () => (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="w-80 border-r bg-white flex flex-col p-6 shadow-sm">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">目标客户信息</h3>
        <div className="rounded-3xl overflow-hidden border-4 border-white shadow-xl mb-6">
            <img src={selectedPersona.avatar} alt="P" className="w-full aspect-square object-cover" />
        </div>
        <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 mb-1">当前阶段</p>
                <p className="text-sm font-black text-slate-800">{currentStage}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-400 mb-1">关键特征</p>
                <div className="flex flex-wrap gap-1">
                    {selectedPersona.traits.map(t => <span key={t} className="text-[10px] bg-white text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">{t}</span>)}
                </div>
            </div>
        </div>
        <button onClick={() => setView('config')} className="mt-auto w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors flex items-center justify-center gap-2">
            <RefreshCcw className="w-3 h-3" /> 重置训练场景
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative p-12">
        {error && (
            <div className="absolute top-10 bg-red-50 border border-red-200 p-4 rounded-2xl text-red-700 text-xs font-bold flex items-center gap-2 shadow-lg animate-bounce">
                <AlertCircle className="w-4 h-4" /> {error}
            </div>
        )}
        
        <div className="relative w-80 h-80 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-full animate-[spin_30s_linear_infinite]"></div>
            <div className="text-center z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">STAGE</p>
                <p className="text-3xl font-black text-slate-900">{currentStage}</p>
            </div>
            
            {/* 阶段指示器 */}
            <div className={`absolute -top-6 left-1/2 -translate-x-1/2 p-4 rounded-full border-4 shadow-xl transition-all ${currentStage === MOTStage.EXPLORE ? 'bg-blue-600 text-white border-white scale-125' : 'bg-white text-slate-300 border-slate-50'}`}>
                <BrainCircuit className="w-6 h-6" />
            </div>
            <div className={`absolute top-1/2 -right-6 -translate-y-1/2 p-4 rounded-full border-4 shadow-xl transition-all ${currentStage === MOTStage.OFFER ? 'bg-orange-500 text-white border-white scale-125' : 'bg-white text-slate-300 border-slate-50'}`}>
                <Lightbulb className="w-6 h-6" />
            </div>
            <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 p-4 rounded-full border-4 shadow-xl transition-all ${currentStage === MOTStage.ACTION ? 'bg-emerald-500 text-white border-white scale-125' : 'bg-white text-slate-300 border-slate-50'}`}>
                <Send className="w-6 h-6" />
            </div>
            <div className={`absolute top-1/2 -left-6 -translate-y-1/2 p-4 rounded-full border-4 shadow-xl transition-all ${currentStage === MOTStage.CONFIRM ? 'bg-purple-600 text-white border-white scale-125' : 'bg-white text-slate-300 border-slate-50'}`}>
                <CheckCircle2 className="w-6 h-6" />
            </div>
        </div>
      </div>

      <div className="w-[500px] bg-white border-l shadow-2xl flex flex-col">
        <div className="p-6 bg-blue-600 text-white">
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">AI 导师即时反馈</h3>
            <p className="text-sm font-bold leading-relaxed mb-4">"{coachAdvice.text}"</p>
            <div className="flex gap-2">
                {coachAdvice.tags.map(t => <span key={t} className="text-[9px] bg-white/20 px-2 py-1 rounded-md font-bold">#{t}</span>)}
            </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
            {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-lg' : 'bg-white text-slate-800 border rounded-tl-none shadow-sm'}`}>
                        {m.content}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex gap-1 p-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce delay-200"></div>
                </div>
            )}
        </div>

        <div className="p-6 border-t bg-white">
            <div className="flex items-center justify-between mb-4">
                <div className="flex gap-3 text-slate-400">
                    <History className="w-4 h-4 cursor-pointer hover:text-blue-600" />
                    <Settings className="w-4 h-4 cursor-pointer hover:text-blue-600" />
                </div>
                <button 
                  onClick={() => { setView('report'); geminiService.evaluateSession(messages).then(setEvalData); }}
                  className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
                >
                  结束对话并评分
                </button>
            </div>
            <div className="flex gap-3 items-end">
                <VoiceInput onSendMessage={handleSendMessage} />
                <textarea 
                    rows={2}
                    className="flex-1 bg-slate-100 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600/20 resize-none"
                    placeholder="输入您的沟通回复..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage((e.target as HTMLTextAreaElement).value);
                            (e.target as HTMLTextAreaElement).value = '';
                        }
                    }}
                />
            </div>
        </div>
      </div>
    </div>
  );

  const renderReport = () => (
    <div className="max-w-4xl mx-auto py-16 px-6">
        <div className="mb-12 text-center">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-4xl font-black text-slate-900">实战服务报告</h1>
            <p className="text-slate-500 mt-2">您的表现已被专家系统详细评估</p>
        </div>

        {!evalData ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border shadow-sm">
                <RefreshCcw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="font-bold text-slate-600 text-sm">正在深度解析对话逻辑...</p>
            </div>
        ) : (
            <div className="space-y-8 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-3xl border shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">综合得分</p>
                        <div className="text-7xl font-black text-blue-600 mb-4">{evalData.overallScore}</div>
                        <p className="text-sm text-slate-600 leading-relaxed">{evalData.summary}</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border shadow-sm grid grid-cols-2 gap-6">
                        {['同理心', '逻辑性', '效率', '专业度'].map((label, idx) => (
                            <div key={label}>
                                <p className="text-xs font-bold text-slate-400 mb-2">{label}</p>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${s <= [evalData.empathy, evalData.logic, evalData.efficiency, evalData.professionalism][idx] ? 'text-blue-600 fill-blue-600' : 'text-slate-100'}`} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={() => setView('config')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-2xl hover:bg-slate-800 transition-all">
                    开始下一轮实战
                </button>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen font-['Inter']">
      {view === 'config' && renderConfig()}
      {view === 'training' && renderTraining()}
      {view === 'report' && renderReport()}
    </div>
  );
};

export default App;
