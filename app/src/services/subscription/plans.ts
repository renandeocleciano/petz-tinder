import type { IconName } from '@/components/ui/Icon';
import type { Tone } from '@/theme';

import type { PremiumFeature, SubscriptionPlan } from './types';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'annual',
    title: 'Anual',
    pricePerMonth: 14.9,
    billedAmount: 178.8,
    description: 'R$ 178,80 por ano (economize 40%)',
    badge: 'Mais popular',
    discountLabel: '40%',
  },
  {
    id: 'monthly',
    title: 'Mensal',
    pricePerMonth: 24.9,
    billedAmount: 24.9,
    description: 'Cancele quando quiser.',
  },
];

export interface PremiumFeatureInfo {
  feature: PremiumFeature;
  title: string;
  description: string;
  icon: IconName;
  tone: Tone;
}

export const PREMIUM_FEATURES: PremiumFeatureInfo[] = [
  {
    feature: 'see_unmatched_on_map',
    title: 'Ver pets sem match no mapa',
    description: 'Explore todos os pets da sua região, sem limites.',
    icon: 'map-marker',
    tone: 'teal',
  },
  {
    feature: 'direct_message',
    title: 'Mandar mensagem direta',
    description: 'Converse mesmo sem dar match.',
    icon: 'chat-processing',
    tone: 'coral',
  },
  {
    feature: 'advanced_filters',
    title: 'Filtros avançados',
    description: 'Encontre pets ideais por espécie, porte, personalidade e distância.',
    icon: 'tune-variant',
    tone: 'sky',
  },
  {
    feature: 'profile_boost',
    title: 'Boost do perfil',
    description: 'Apareça para mais tutores e aumente suas chances de novos amigos.',
    icon: 'lightning-bolt',
    tone: 'lavender',
  },
  {
    feature: 'multiple_pets',
    title: 'Vários pets',
    description: 'Cadastre até 10 pets na mesma conta.',
    icon: 'paw',
    tone: 'orange',
  },
];
