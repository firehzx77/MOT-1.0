
import React from 'react';
import { Industry, Persona, VoiceOption } from './types';
import { ShoppingCart, Landmark, Radio, Hotel, Truck } from 'lucide-react';

export const INDUSTRIES: Industry[] = [
  { id: 'retail', name: '零售服务', icon: 'ShoppingCart', description: '处理退换货、物流延迟及会员积分纠纷。' },
  { id: 'banking', name: '金融银行业', icon: 'Landmark', description: '涉及理财咨询、转账失败或账户异常提醒。' },
  { id: 'telecom', name: '电信通讯', icon: 'Radio', description: '处理资费账单争议、网络覆盖及宽带报修。' },
  { id: 'hospitality', name: '酒店旅游', icon: 'Hotel', description: '预订冲突、客房质量及加急服务响应。' },
  { id: 'freight', name: '货物运输代理', icon: 'Truck', description: '处理国际物流延迟、报关异常及运费核算纠纷。' },
];

export const PERSONAS: Persona[] = [
  {
    id: 'angry_elder',
    name: '愤怒的高龄客户',
    avatar: 'https://picsum.photos/seed/p1/200/200',
    difficulty: '高',
    traits: ['传统保守', '极度焦虑'],
    description: '性格固执、情绪化。对数字技术感到挫败，需要极大的耐心和同理心。'
  },
  {
    id: 'busy_pro',
    name: '精明的商务人士',
    avatar: 'https://picsum.photos/seed/p2/200/200',
    difficulty: '中',
    traits: ['效率优先', '结果导向'],
    description: '逻辑清晰，极度关注时间成本 and 解决方案的有效性，反感场面话。'
  },
  {
    id: 'tech_youth',
    name: '科技达人青年',
    avatar: 'https://picsum.photos/seed/p3/200/200',
    difficulty: '低',
    traits: ['快速反馈', '网络敏感'],
    description: '善于使用社交媒体发声，对流程非常熟悉，希望获得个性化待遇。'
  }
];

export const VOICES: VoiceOption[] = [
  { id: 'v1', name: '标准男声', description: '沉稳、专业', voiceName: 'Kore' },
  { id: 'v2', name: '标准女声', description: '亲切、温和', voiceName: 'Puck' },
  { id: 'v3', name: '活力女声', description: '热情、迅速', voiceName: 'Charon' },
  { id: 'v4', name: '严肃男声', description: '正式、威严', voiceName: 'Fenrir' },
];

export const getIndustryIcon = (iconName: string) => {
    switch (iconName) {
        case 'ShoppingCart': return <ShoppingCart className="w-6 h-6" />;
        case 'Landmark': return <Landmark className="w-6 h-6" />;
        case 'Radio': return <Radio className="w-6 h-6" />;
        case 'Hotel': return <Hotel className="w-6 h-6" />;
        case 'Truck': return <Truck className="w-6 h-6" />;
        default: return <ShoppingCart className="w-6 h-6" />;
    }
}
