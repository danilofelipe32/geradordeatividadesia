import React, { useState, useEffect } from 'react';
import { Activity, ActivityLevel, ComputationalThinkingPillar } from '../types';
import { CopyIcon } from './icons/CopyIcon';

interface EditModalProps {
  activity: Activity;
  onSave: (activity: Activity) => void;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ activity, onSave, onClose }) => {
  const [editedActivity, setEditedActivity] = useState<Activity>(activity);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setEditedActivity(activity);
  }, [activity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedActivity(prev => {
      if (!prev) return prev; // Should not happen
      if (name === 'duracaoEstimada') {
        return { ...prev, [name]: parseInt(value, 10) || 0 };
      }
      if (name === 'recursosNecessarios') {
        return { ...prev, [name]: value.split('\n') };
      }
      return { ...prev, [name]: value };
    });
  };
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedActivity);
  };

  const handleCopy = () => {
    const activityText = `
Título: ${editedActivity.titulo}

Disciplina: ${editedActivity.subject}
Assunto: ${editedActivity.topic}
Turma / Ano: ${editedActivity.grade}
Nível: ${editedActivity.level}
Duração Estimada: ${editedActivity.duracaoEstimada} min

Pilar do Pensamento Computacional: ${editedActivity.pillar}

Descrição:
${editedActivity.descricao}

Competência BNCC:
${editedActivity.competenciaBNCC}

Competência BNCC Computação:
${editedActivity.competenciaBNCCComputacao}

Recursos Necessários:
${editedActivity.recursosNecessarios.map(r => `- ${r}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(activityText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
        console.error("Falha ao copiar atividade: ", err);
        alert("Não foi possível copiar o texto.");
    });
  };

  const inputStyle = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm";
  const labelStyle = "block text-sm font-medium text-text-primary";
  const textareaStyle = `${inputStyle} min-h-[120px] resize-y`;


  return (
    <div 
        className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
          <h2 id="edit-modal-title" className="text-2xl font-bold text-primary-dark">Editar Atividade</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="titulo" className={labelStyle}>Título</label>
            <input type="text" name="titulo" id="titulo" value={editedActivity.titulo} onChange={handleChange} className={inputStyle} required />
          </div>
          <div>
            <label htmlFor="descricao" className={labelStyle}>Descrição</label>
            <textarea name="descricao" id="descricao" value={editedActivity.descricao} onChange={handleChange} className={textareaStyle} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="subject" className={labelStyle}>Disciplina</label>
                <input type="text" name="subject" id="subject" value={editedActivity.subject} onChange={handleChange} className={inputStyle} required />
              </div>
              <div>
                <label htmlFor="topic" className={labelStyle}>Assunto</label>
                <input type="text" name="topic" id="topic" value={editedActivity.topic} onChange={handleChange} className={inputStyle} required />
              </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="grade" className={labelStyle}>Turma / Ano</label>
                <input type="text" name="grade" id="grade" value={editedActivity.grade} onChange={handleChange} className={inputStyle} required />
              </div>
               <div>
                <label htmlFor="duracaoEstimada" className={labelStyle}>Duração Estimada (min)</label>
                <input type="number" name="duracaoEstimada" id="duracaoEstimada" value={editedActivity.duracaoEstimada} onChange={handleChange} className={inputStyle} required min="0"/>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pillar" className={labelStyle}>Pilar do P. Computacional</label>
              <select name="pillar" id="pillar" value={editedActivity.pillar} onChange={handleChange} className={inputStyle} required>
                {Object.values(ComputationalThinkingPillar).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="level" className={labelStyle}>Nível</label>
              <select name="level" id="level" value={editedActivity.level} onChange={handleChange} className={inputStyle} required>
                {Object.values(ActivityLevel).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="competenciaBNCC" className={labelStyle}>Competência BNCC</label>
            <textarea name="competenciaBNCC" id="competenciaBNCC" value={editedActivity.competenciaBNCC} onChange={handleChange} className={textareaStyle} required />
          </div>
          <div>
            <label htmlFor="competenciaBNCCComputacao" className={labelStyle}>Competência BNCC Computação</label>
            <textarea name="competenciaBNCCComputacao" id="competenciaBNCCComputacao" value={editedActivity.competenciaBNCCComputacao} onChange={handleChange} className={textareaStyle} required />
          </div>
          <div>
            <label htmlFor="recursosNecessarios" className={labelStyle}>Recursos Necessários (um por linha)</label>
            <textarea name="recursosNecessarios" id="recursosNecessarios" value={editedActivity.recursosNecessarios.join('\n')} onChange={handleChange} className={textareaStyle} required />
          </div>
          <div className="mt-6 flex flex-col-reverse sm:flex-row justify-between items-center pt-4 border-t border-gray-200">
            <button
                type="button"
                onClick={handleCopy}
                disabled={isCopied}
                className="w-full sm:w-auto mt-4 sm:mt-0 flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:bg-green-300 transition-colors"
              >
                {isCopied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copiado!
                  </>
                ) : (
                  <>
                    <CopyIcon />
                    Copiar
                  </>
                )}
              </button>
            <div className="flex space-x-4 w-full sm:w-auto">
                <button type="button" onClick={onClose} className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                Cancelar
                </button>
                <button type="submit" className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark">
                Salvar
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal;