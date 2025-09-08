import React, { useState } from 'react';
import { StoredFile } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { XCircleIcon } from './icons/XCircleIcon';


interface RAGManagerProps {
  files: StoredFile[];
  onFilesChange: React.Dispatch<React.SetStateAction<StoredFile[]>>;
  selectedFiles: string[];
  onSelectionChange: React.Dispatch<React.SetStateAction<string[]>>;
}

type StatusFilter = 'all' | StoredFile['status'];

const RAGManager: React.FC<RAGManagerProps> = ({ files, onFilesChange, selectedFiles, onSelectionChange }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const handleFileProcessing = (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    
    Array.from(uploadedFiles).forEach(file => {
      const fileId = `${Date.now()}-${file.name}`;
      
      // Add file to state immediately with "processing" status
      onFilesChange(prev => [...prev, {
        id: fileId,
        name: file.name,
        type: file.type,
        content: '',
        status: 'processing',
      }]);

      const reader = new FileReader();
      
      reader.onload = () => {
        // Update file status to "completed" on success
        onFilesChange(prev => prev.map(f => f.id === fileId 
          ? { ...f, status: 'completed', content: reader.result as string } 
          : f
        ));
      };
      
      reader.onerror = () => {
        // Update file status to "error" on failure
        onFilesChange(prev => prev.map(f => f.id === fileId 
          ? { ...f, status: 'error', errorMessage: reader.error?.message || "Falha ao ler o arquivo" } 
          : f
        ));
      };
      
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileProcessing(event.target.files);
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };
  
  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    handleFileProcessing(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleToggleSelection = (fileId: string) => {
    onSelectionChange(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };
  
  const handleDeleteFile = (fileId: string) => {
    onFilesChange(prev => prev.filter(file => file.id !== fileId));
    onSelectionChange(prev => prev.filter(id => id !== fileId));
  };

  const handleClearAll = () => {
    if (window.confirm("Você tem certeza que deseja remover todos os materiais de apoio?")) {
        onFilesChange([]);
        onSelectionChange([]);
    }
  };

  const getStatusIcon = (file: StoredFile) => {
    switch(file.status) {
        case 'processing':
            return <SpinnerIcon />;
        case 'error':
            return <XCircleIcon />;
        default:
            return <FileTextIcon />;
    }
  };

  const filterButtonStyle = (isActive: boolean) =>
    `px-3 py-1 rounded-full transition-colors text-xs font-medium ${
      isActive
        ? 'bg-primary text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;

  const filteredFiles = files.filter(file =>
    statusFilter === 'all' || file.status === statusFilter
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-primary-dark">Seus Documentos</h3>
        <p className="text-sm text-gray-500 mt-1">
          Anexe arquivos (.pdf, .txt, .docx, .md) para usar como base na criação das atividades.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Nota: Se o volume total dos arquivos selecionados for muito grande, o conteúdo será automaticamente resumido para caber no limite da IA.
        </p>
      </div>
      
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`w-full flex flex-col justify-center items-center gap-2 py-6 px-4 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
          isDragOver ? 'border-primary bg-primary-light' : 'border-gray-300 hover:border-primary hover:bg-primary-light'
        }`}
      >
        <UploadIcon />
        <span className="text-sm font-medium text-gray-600 text-center">
          Arraste e solte ou clique para escolher
        </span>
        <input 
            type="file" 
            className="hidden" 
            multiple 
            accept=".pdf,.txt,.docx,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
            onChange={handleFileChange}
        />
      </label>

      {files.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm pt-2 flex-wrap">
            <button onClick={() => setStatusFilter('all')} className={filterButtonStyle(statusFilter === 'all')}>Todos</button>
            <button onClick={() => setStatusFilter('completed')} className={filterButtonStyle(statusFilter === 'completed')}>Concluídos</button>
            <button onClick={() => setStatusFilter('processing')} className={filterButtonStyle(statusFilter === 'processing')}>Processando</button>
            <button onClick={() => setStatusFilter('error')} className={filterButtonStyle(statusFilter === 'error')}>Com Erro</button>
        </div>
      )}

      <div className="space-y-2 pt-2 max-h-60 overflow-y-auto pr-2">
        {filteredFiles.length === 0 ? (
          <p className="text-sm text-center text-gray-500 py-4">
            {files.length > 0 ? 'Nenhum arquivo corresponde ao filtro.' : 'Nenhum arquivo anexado.'}
          </p>
        ) : (
          filteredFiles.map(file => (
            <div 
              key={file.id} 
              className="flex items-center gap-2 p-2 rounded-md bg-gray-50 hover:bg-gray-100"
              title={file.status === 'error' ? file.errorMessage : file.name}
            >
              {file.status === 'completed' && (
                <input
                  type="checkbox"
                  id={`file-${file.id}`}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                  checked={selectedFiles.includes(file.id)}
                  onChange={() => handleToggleSelection(file.id)}
                />
              )}
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {getStatusIcon(file)}
              </div>
              <label htmlFor={`file-${file.id}`} className="flex-grow flex items-center gap-2 cursor-pointer overflow-hidden">
                <span className={`text-sm truncate ${file.status === 'error' ? 'text-red-600' : 'text-gray-800'}`}>{file.name}</span>
              </label>
              <button onClick={() => handleDeleteFile(file.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0" aria-label="Excluir arquivo">
                <TrashIcon />
              </button>
            </div>
          ))
        )}
      </div>

      {files.length > 0 && (
         <button
            onClick={handleClearAll}
            className="w-full text-sm text-red-600 hover:text-red-800 font-medium py-2 rounded-md hover:bg-red-50 transition-colors"
        >
            Limpar Tudo
        </button>
      )}

      <p className="text-xs text-gray-400 text-center pt-2">
        Os arquivos são salvos localmente no seu navegador.
      </p>
    </div>
  );
};

export default RAGManager;