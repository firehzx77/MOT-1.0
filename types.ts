
export enum MOTStage {
  EXPLORE = 'EXPLORE',
  OFFER = 'OFFER',
  ACTION = 'ACTION',
  CONFIRM = 'CONFIRM'
}

export interface Industry {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Persona {
  id: string;
  name: string;
  avatar: string;
  difficulty: '高' | '中' | '低';
  traits: string[];
  description: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  voiceName: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'coach';
  content: string;
  timestamp: number;
}

export interface EvaluationData {
  overallScore: number;
  empathy: number;
  logic: number;
  efficiency: number;
  compliance: number;
  professionalism: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  keyMoments: {
    type: 'positive' | 'negative';
    time: string;
    stage: string;
    content: string;
    comment: string;
  }[];
}

export type ViewState = 'config' | 'training' | 'report' | 'dashboard';
