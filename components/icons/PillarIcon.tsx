import React from 'react';
import { ComputationalThinkingPillar } from '../../types';

interface PillarIconProps {
  pillar: ComputationalThinkingPillar;
  className?: string;
}

export const PillarIcon: React.FC<PillarIconProps> = ({ pillar, className = "h-4 w-4" }) => {
  switch (pillar) {
    case ComputationalThinkingPillar.DECOMPOSICAO:
      // A square breaking into four smaller pieces
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8.25V6a2.25 2.25 0 012.25-2.25h1.5M6 15.75V18a2.25 2.25 0 002.25 2.25h1.5M18 8.25V6a2.25 2.25 0 00-2.25-2.25h-1.5M18 15.75V18a2.25 2.25 0 01-2.25 2.25h-1.5" />
        </svg>
      );
    case ComputationalThinkingPillar.ABSTRACAO:
       // A filter icon, representing focus on important details
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      );
    case ComputationalThinkingPillar.RECONHECIMENTO_PADROES:
      // A grid icon, representing finding patterns
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6A2.25 2.25 0 0115.75 3.75h2.25A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75A2.25 2.25 0 0115.75 13.5h2.25a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    case ComputationalThinkingPillar.ALGORITMOS:
       // A code bracket icon, representing sequence of steps
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5-4.5L7.5 12l2.25 2.25" />
        </svg>
      );
    default:
      return null;
  }
};
