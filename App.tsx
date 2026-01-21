
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

  const handleStartTraining = async () => {
    setView('training');
    setError(null);
    setIsLoading(true);
    setMessages([]);
    setApiHistory([]);
    
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

      const adviceRaw = await geminiService.getCoachAdvice(selectedIndustry, selectedPersona, currentStage, aiResponse, text);
      const [adviceText, tagsStr] = adviceRaw.split('|');
      setCoachAdvice({ 
        text: adviceText.trim(), 
        tags: tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [] 
      });

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
    setView('report');
    setEvalData(null);
    try {
      const historySummary = messages.map(m => ({ role: m.role, content: m.content }));
      const evaluation = await geminiService.evaluateSession(historySummary);
      setEvalData(evaluation);
    } catch (err: any) {
      setError("生成评估报告失败");
      setView('training');
    } finally {
      setIsLoading(false);
    }
  };

  const renderConfig = () => (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">配置您的训练场景</h1>
        <p className="text-slate-500 text-lg">DeepSeek 已就绪。请选择行业背景，系统将为您生成最真实的“关键时刻”挑战。</p>
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
          <span className="font-medium">当前配置：{selectedIndustry.name} (DeepSeek-Chat)</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleStartTraining}
            disabled={isLoading}
            className="px-12 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-xl shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? '加载中...' : '开始训练'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // renderTraining 和 renderReport 复用之前的逻辑...
  // 由于之前的 App.tsx 代码已包含完整的渲染函数，这里仅展示关键的 return 结构以确认完整性。

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
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">实战背景</p>
                <p className="text-xs text-slate-600 font-medium">{selectedIndustry.name}</p>
                <p className="text-xs text-slate-400 mt-1">{selectedPersona.traits.join('/')}</p>
            </div>
        </div>
        <div className="mt-auto pt-6 border-t">
          <button onClick={() => setView('config')} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-2">
            <RefreshCcw className="w-3 h-3" /> 重置
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-hidden relative">
        {error && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 shadow-lg">
            <AlertCircle className="text-red-500" />
            <span className="text-red-700 text-sm font-bold">{error}</span>
            <button onClick={handleStartTraining} className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">重试</button>
          </div>
        )}

        <div className="relative w-64 h-64 border-4 border-dashed border-slate-200 rounded-full flex items-center justify-center animate-pulse">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Stage</p>
              <p className="text-xl font-black text-slate-900">{currentStage}</p>
            </div>
        </div>
      </div>

      <div className="w-[480px] bg-white border-l flex flex-col shadow-2xl">
        <div className="p-6 bg-blue-50/80 border-b">
            <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">AI 导师反馈</h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">"{coachAdvice.text}"</p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
            {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border rounded-tl-none shadow-sm'}`}>
                        {m.content}
                    </div>
                </div>
            ))}
            {isLoading && <div className="text-xs text-slate-400 animate-pulse italic">AI 正在思考中...</div>}
        </div>

        <div className="p-4 border-t bg-white">
            <div className="flex items-center justify-between mb-3 px-1">
                <button onClick={handleFinishTraining} disabled={messages.length < 2 || isLoading} className="text-[10px] font-bold text-blue-600 hover:underline disabled:opacity-30">
                  生成评估报告
                </button>
            </div>
            <div className="flex items-end gap-3">
                <VoiceInput onSendMessage={handleSendMessage} />
                <textarea 
                    rows={2}
                    disabled={isLoading}
                    placeholder="输入您的沟通回复..."
                    className="flex-1 bg-slate-50 border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
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
    <div className="max-w-4xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-black mb-8">测评报告</h1>
        {!evalData ? (
            <div className="p-24 text-center">生成中...</div>
        ) : (
            <div className="space-y-8">
                <div className="bg-white p-8 rounded-3xl border shadow-xl flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold mb-1">综合得分</p>
                        <p className="text-6xl font-black text-blue-600">{evalData.overallScore}</p>
                    </div>
                    <p className="text-slate-600 max-w-md">{evalData.summary}</p>
                </div>
                <button onClick={() => setView('config')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">回到首页</button>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-black text-slate-900">MOT Trainer</h1>
        </div>
      </header>
      <main>
        {view === 'config' && renderConfig()}
        {view === 'training' && renderTraining()}
        {view === 'report' && renderReport()}
      </main>
    </div>
  );
};

export default App;
