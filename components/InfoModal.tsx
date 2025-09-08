import React from 'react';

interface InfoModalProps {
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
  const InfoSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
      <h3 className="text-xl font-bold text-primary-dark mb-2">{title}</h3>
      <div className="space-y-2 text-text-secondary">{children}</div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-40 flex justify-center items-center p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
            <h2 className="text-3xl font-bold text-primary">Sobre a Aplicação</h2>
            <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fechar modal"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <div className="space-y-8">
          <InfoSection title="Missão">
            <p>O Gerador de Atividades com IA foi criado para apoiar educadores no desenvolvimento de planos de aula inovadores, alinhados à Base Nacional Comum Curricular (BNCC) e à BNCC Computação. Nossa missão é facilitar a integração do Pensamento Computacional em diversas disciplinas, economizando tempo e inspirando práticas pedagógicas criativas.</p>
          </InfoSection>

          <InfoSection title="Como Funciona?">
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Preencha o Formulário:</strong> Especifique a disciplina, assunto, turma e o pilar do Pensamento Computacional que deseja trabalhar.</li>
              <li><strong>Adicione Materiais (Opcional):</strong> Use a aba "Documentos" para anexar arquivos (.pdf, .docx, etc.). A IA usará esses arquivos como base para criar atividades ainda mais personalizadas.</li>
              <li><strong>Gere as Atividades:</strong> Clique em "Gerar" e a IA criará planos de aula detalhados com base nas suas especificações.</li>
              <li><strong>Gerencie e Exporte:</strong> Edite, filtre, remova ou exporte suas atividades para PDF com um único clique.</li>
            </ol>
          </InfoSection>
          
          <InfoSection title="Principais Funcionalidades">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Alinhamento com a BNCC:</strong> Gera competências da BNCC e BNCC Computação relevantes para a atividade.</li>
              <li><strong>Integração com RAG (Retrieval-Augmented Generation):</strong> Permite o uso de seus próprios documentos como contexto para a IA.</li>
              <li><strong>Pensamento Computacional:</strong> Foco em um dos quatro pilares: Decomposição, Abstração, Reconhecimento de Padrões e Algoritmos.</li>
              <li><strong>Exportação para PDF:</strong> Crie um documento profissional com seus planos de aula para fácil impressão e compartilhamento.</li>
              <li><strong>Armazenamento Local:</strong> Todas as suas atividades e arquivos ficam salvos apenas no seu navegador, garantindo sua privacidade.</li>
            </ul>
          </InfoSection>
          
           <InfoSection title="Dicas de Uso">
            <ul className="list-disc list-inside space-y-1">
                <li><strong>Seja Específico:</strong> Quanto mais detalhado for o campo "Assunto", melhores e mais focadas serão as atividades geradas.</li>
                <li><strong>Use Materiais de Qualidade:</strong> Ao usar o RAG, forneça textos claros e relevantes para o tópico da aula.</li>
                <li><strong>Refine os Resultados:</strong> Use o botão de edição para ajustar os detalhes da atividade gerada e adaptá-la perfeitamente à sua turma.</li>
            </ul>
          </InfoSection>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button 
              type="button" 
              onClick={onClose} 
              className="py-2 px-6 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;