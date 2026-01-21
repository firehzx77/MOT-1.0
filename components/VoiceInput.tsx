
import React, { useState, useRef, useEffect } from 'react';
import { Mic, X, Send } from 'lucide-react';

interface VoiceInputProps {
  onSendMessage: (text: string) => void;
  onTranscription?: (text: string) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onSendMessage }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscription(finalTranscript || interimTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsRecording(false);
      };
    }
  }, []);

  const handleToggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscription('');
      recognitionRef.current?.start();
      setIsRecording(false);
      setIsRecording(true);
    }
  };

  const handleCancel = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setTranscription('');
  };

  const handleConfirm = () => {
    if (transcription.trim()) {
      onSendMessage(transcription);
      setTranscription('');
    }
    setIsRecording(false);
    recognitionRef.current?.stop();
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggleRecording}
        className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        <Mic className="w-5 h-5" />
      </button>

      {isRecording && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md px-6 text-center">
            <div className="mb-8 relative">
                <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto animate-ping opacity-25"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                     <Mic className="w-12 h-12 text-white" />
                </div>
            </div>
            
            <p className="text-white text-lg font-medium mb-4">正在聆听中...</p>
            
            <div className="bg-white/10 p-6 rounded-2xl min-h-[120px] mb-12 flex items-center justify-center text-white/90 italic">
              {transcription || "请说话..."}
            </div>

            <div className="flex gap-8 justify-center">
              <button
                onClick={handleCancel}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <X className="w-6 h-6 text-white" />
                </div>
                <span className="text-white/60 text-sm">取消</span>
              </button>

              <button
                onClick={handleConfirm}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <span className="text-white/60 text-sm">发送</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
