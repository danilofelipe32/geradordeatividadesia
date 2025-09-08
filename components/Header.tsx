import React from 'react';
import { InfoIcon } from './icons/InfoIcon';

interface HeaderProps {
  onInfoClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onInfoClick }) => {
  return (
    <header className="bg-primary shadow-md relative">
      <div className="container mx-auto px-4 py-6 md:px-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Gerador de Atividades com IA</h1>
          <p className="text-primary-light mt-1">Planejamento de aulas alinhado à BNCC e ao Pensamento Computacional.</p>
        </div>
        <button
          onClick={onInfoClick}
          className="absolute top-4 right-4 text-white hover:text-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white rounded-full p-2 transition-colors"
          aria-label="Sobre a aplicação"
        >
          <InfoIcon />
        </button>
      </div>
    </header>
  );
};

export default Header;