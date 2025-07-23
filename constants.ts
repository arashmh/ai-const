import React from 'react';
import { Question } from './types';
import { BalanceIcon, ScaleIcon, HeartHandshakeIcon, ShieldCheckIcon, LeafIcon, BookTextIcon } from './components/icons';

export const CONSTITUTION_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Should a constitution be interpreted based on the original intent of its framers, or should it adapt to contemporary societal values?",
    type: 'multiple-choice',
    options: ['Strictly original intent (Originalism)', 'Adapt to modern values (Living Constitution)', 'A pragmatic balance of both']
  },
  {
    id: 2,
    text: "Is it more important for the government to ensure economic equality or to protect individual economic freedom?",
    type: 'multiple-choice',
    options: ['Prioritize equality', 'Prioritize freedom', 'Both are equally critical']
  },
  {
    id: 3,
    text: "Should freedom of speech be absolute, even if it includes hate speech?",
    type: 'yes-no'
  },
  {
    id: 4,
    text: "When facing a national crisis, is it acceptable for the government to temporarily suspend certain individual rights for the sake of collective security?",
    type: 'yes-no'
  },
  {
    id: 5,
    text: "What is the primary purpose of the justice system?",
    type: 'multiple-choice',
    options: ['Punish wrongdoing', 'Rehabilitate offenders', 'Act as a deterrent to future crime']
  },
  {
    id: 6,
    text: "Should the government have a larger role in providing social services like healthcare and education?",
    type: 'yes-no'
  },
  {
    id: 7,
    text: "Technological advancement that could boost the economy but cause significant environmental damage should be pursued.",
    type: 'yes-no'
  },
  {
    id: 8,
    text: "What is your general tolerance for societal risk when it comes to implementing new, unproven policies?",
    type: 'multiple-choice',
    options: ['Low: Prefer proven, stable policies', 'Medium: Open to calculated risks', 'High: Embrace innovation and experimentation']
  },
  {
    id: 9,
    text: "Should data privacy be considered a fundamental right, on par with freedom of speech?",
    type: 'yes-no'
  },
  {
    id: 10,
    text: "Is a small, efficient government preferable to a large, comprehensive one?",
    type: 'yes-no'
  },
  {
    id: 11,
    text: "What is more crucial for a nation's long-term success?",
    type: 'multiple-choice',
    options: ['Strong military and defense', 'Advanced education and research', 'Robust international diplomacy']
  },
  {
    id: 12,
    text: "Is it the government's responsibility to regulate markets heavily to prevent failures?",
    type: 'yes-no'
  },
  {
    id: 13,
    text: "Should cultural heritage and tradition be prioritized over individual expression when they conflict?",
    type: 'yes-no'
  },
  {
    id: 14,
    text: "What is the most effective way to foster social cohesion?",
    type: 'multiple-choice',
    options: ['Promoting a single national identity', 'Celebrating multicultural diversity', 'Focusing on shared economic goals']
  },
  {
    id: 15,
    text: "The will of the majority should always prevail, even if it infringes on the rights of a minority.",
    type: 'yes-no'
  }
];

export interface Archetype {
  name: string;
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

export const ARCHETYPES: Archetype[] = [
  {
    name: 'Pragmatic Centrists',
    description: 'Focus on stability, evidence-based policy, and compromise. Moderate risk tolerance.',
    icon: BalanceIcon,
  },
  {
    name: 'Free-Market Originalists',
    description: 'Prioritize individual economic freedom and a strict, original interpretation of constitutional texts.',
    icon: ScaleIcon,
  },
  {
    name: 'Social Justice Advocates',
    description: 'Aim to correct inequality and protect vulnerable groups, interpreting laws as a living document.',
    icon: HeartHandshakeIcon,
  },
  {
    name: 'Security-Focused Nationalists',
    description: 'Believe in a strong state capable of ensuring collective security, even at the cost of some rights.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Environmental Collectivists',
    description: 'Prioritize ecological sustainability and collective well-being over individual economic pursuits.',
    icon: LeafIcon,
  },
  {
    name: 'Techno-Utopians',
    description: 'Advocate for high-risk, high-reward policies driven by technological innovation to solve societal problems.',
    icon: BookTextIcon,
  }
];
