import React, { useState } from 'react';
import { ActivityFormData, ComputationalThinkingPillar, ActivityLevel } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';

interface ActivityFormProps {
  onSubmit: (formData: ActivityFormData) => void;
  isLoading: boolean;
}

const fundamentalSubjects = [
  'Língua Portuguesa',
  'Matemática',
  'Geografia',
  'História',
  'Ciências',
  'Arte',
  'Educação Física',
  'Inglês',
  'Espanhol',
  'Ensino Religioso',
];

const medioSubjects = {
  'Linguagens e suas Tecnologias': ['Arte', 'Educação Física', 'Língua Inglesa', 'Língua Portuguesa'],
  'Matemática e suas Tecnologias': ['Matemática'],
  'Ciências da Natureza e suas Tecnologias': ['Biologia', 'Física', 'Química'],
  'Ciências Humanas e Sociais Aplicadas': ['Filosofia', 'Geografia', 'História', 'Sociologia'],
};


const ActivityForm: React.FC<ActivityFormProps> = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<ActivityFormData>({
    subject: '',
    topic: '',
    pillar: ComputationalThinkingPillar.DECOMPOSICAO,
    grade: '',
    level: ActivityLevel.MEDIO,
    quantity: 1,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow";
  const labelStyle = "block text-sm font-medium text-text-primary";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-primary-dark">Criar Nova Atividade</h2>
      
      <div>
        <label htmlFor="subject" className={labelStyle}>Disciplina</label>
        <select name="subject" id="subject" value={formData.subject} onChange={handleChange} className={inputStyle} required>
            <option value="" disabled>Selecione uma disciplina</option>
            <optgroup label="Ensino Fundamental">
                {fundamentalSubjects.map(s => <option key={`fund-${s}`} value={s}>{s}</option>)}
            </optgroup>
            {Object.entries(medioSubjects).map(([area, disciplines]) => (
                <optgroup key={area} label={`Ensino Médio - ${area}`}>
                {disciplines.map(d => <option key={`medio-${d}-${area}`} value={d}>{d}</option>)}
                {/* FIX: The closing tag for optgroup was misspelled as endgroup. */}
                </optgroup>
            ))}
        </select>
      </div>
      
      <div>
        <label htmlFor="topic" className={labelStyle}>Assunto</label>
        <input type="text" name="topic" id="topic" value={formData.topic} onChange={handleChange} className={inputStyle} placeholder="Ex: Análise de Contos" required />
      </div>

      <div>
        <label htmlFor="grade" className={labelStyle}>Turma / Ano</label>
        <input type="text" name="grade" id="grade" value={formData.grade} onChange={handleChange} className={inputStyle} placeholder="Ex: 6º Ano" required />
      </div>

      <div>
        <label htmlFor="pillar" className={labelStyle}>Pilar do Pensamento Computacional</label>
        <select name="pillar" id="pillar" value={formData.pillar} onChange={handleChange} className={inputStyle} required>
          {Object.values(ComputationalThinkingPillar).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="level" className={labelStyle}>Nível</label>
          <select name="level" id="level" value={formData.level} onChange={handleChange} className={inputStyle} required>
            {Object.values(ActivityLevel).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="quantity" className={labelStyle}>Nº</label>
          <input type="number" name="quantity" id="quantity" value={formData.quantity} onChange={handleChange} className={inputStyle} min="1" max="5" required />
        </div>
      </div>

      <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105">
        {isLoading ? 'Gerando...' : 'Gerar Atividades'}
        {!isLoading && <SparklesIcon />}
      </button>
    </form>
  );
};

export default ActivityForm;