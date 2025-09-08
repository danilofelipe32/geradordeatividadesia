import React from 'react';
import { ActivityLevel } from '../../types';

interface LevelIconProps {
  level: ActivityLevel;
  className?: string;
}

export const LevelIcon: React.FC<LevelIconProps> = ({ level, className = "h-4 w-4" }) => {
  const isMedium = level === ActivityLevel.MEDIO || level === ActivityLevel.DIFICIL;
  const isHard = level === ActivityLevel.DIFICIL;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="0" y="6" width="2.5" height="6" rx="1" />
      <rect x="4.5" y="4" width="2.5" height="8" rx="1" opacity={isMedium ? 1 : 0.3} />
      <rect x="9" y="2" width="2.5" height="10" rx="1" opacity={isHard ? 1 : 0.3} />
    </svg>
  );
};
