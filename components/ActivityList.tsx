import React from 'react';
import { Activity, ComputationalThinkingPillar, ActivityLevel } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ExportIcon } from './icons/ExportIcon';
import { SearchIcon } from './icons/SearchIcon';

interface ActivityListProps {
  activities: Activity[];
  onDelete: (id: number) => void;
  onEdit: (activity: Activity) => void;
  subjects: string[];
  filterSubject: string;
  onFilterChange: (subject: string) => void;
  onExport: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterPillar: ComputationalThinkingPillar | 'all';
  onPillarFilterChange: (pillar: ComputationalThinkingPillar | 'all') => void;
  filterLevel: ActivityLevel | 'all';
  onLevelFilterChange: (level: ActivityLevel | 'all') => void;
  filterTopic: string;
  onTopicFilterChange: (topic: string) => void;
}

const ActivityCard: React.FC<{ activity: Activity, onDelete: (id: number) => void, onEdit: (activity: Activity) => void }> = ({ activity, onDelete, onEdit }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-all duration-300 border border-gray-100 hover:shadow-xl">
      <div className="p-6">
        <div className="flex justify-between items-start gap-4">
            <h3 className="text-2xl font-bold text-primary-dark mb-2 flex-grow">{activity.titulo}</h3>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button onClick={() => onEdit(activity)} className="text-gray-400 hover:text-primary transition-colors" aria-label="Editar atividade">
                  <PencilIcon />
              </button>
              <button onClick={() => onDelete(activity.id)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Excluir atividade">
                  <TrashIcon />
              </button>
            </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-4">
          <span className="bg-primary/10 text-primary font-semibold px-3 py-1 rounded-full text-xs">{activity.subject}</span>
          <span className="bg-secondary/10 text-secondary-dark font-semibold px-3 py-1 rounded-full text-xs">{activity.grade}</span>
          <span className="bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-full text-xs">{activity.level}</span>
           <span className="bg-purple-100 text-purple-800 font-semibold px-3 py-1 rounded-full text-xs">{activity.pillar}</span>
          <span className="bg-yellow-100 text-yellow-800 font-semibold px-3 py-1 rounded-full text-xs">{activity.duracaoEstimada} min</span>
        </div>

        <p className="text-text-secondary mb-6 whitespace-pre-wrap">{activity.descricao}</p>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-primary">Competência BNCC:</h4>
            <p className="text-sm text-text-primary font-mono bg-background p-3 rounded-md whitespace-pre-wrap mt-1">{activity.competenciaBNCC}</p>
          </div>
          <div>
            <h4 className="font-semibold text-primary">Competência BNCC Computação:</h4>
            <p className="text-sm text-text-primary font-mono bg-background p-3 rounded-md whitespace-pre-wrap mt-1">{activity.competenciaBNCCComputacao}</p>
          </div>
          <div>
            <h4 className="font-semibold text-primary">Recursos Necessários:</h4>
            <ul className="list-disc list-inside text-sm text-text-secondary mt-1">
              {activity.recursosNecessarios.map((resource, index) => <li key={index}>{resource}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityList: React.FC<ActivityListProps> = ({ activities, onDelete, onEdit, subjects, filterSubject, onFilterChange, onExport, searchQuery, onSearchChange, filterPillar, onPillarFilterChange, filterLevel, onLevelFilterChange, filterTopic, onTopicFilterChange }) => {
  const noFiltersApplied = filterSubject === 'all' && searchQuery === '' && filterPillar === 'all' && filterLevel === 'all' && filterTopic === '';
  
  if (activities.length === 0 && noFiltersApplied) {
    return (
      <div className="text-center bg-white p-12 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-semibold text-text-primary">Nenhuma atividade gerada ainda.</h2>
        <p className="text-text-secondary mt-2">Preencha o formulário ao lado para começar a criar!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 border border-gray-200">
        <div className="w-full flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="flex items-center gap-2 w-full">
                <select
                    id="subject-filter"
                    value={filterSubject}
                    onChange={(e) => onFilterChange(e.target.value)}
                    className="block w-full pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                >
                    <option value="all">Todas Disciplinas</option>
                    {subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                </select>
            </div>
             <div className="flex items-center gap-2 w-full">
                <input
                    id="topic-filter"
                    type="text"
                    placeholder="Filtrar por assunto..."
                    value={filterTopic}
                    onChange={(e) => onTopicFilterChange(e.target.value)}
                    className="block w-full pl-3 pr-4 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                    aria-label="Filtrar por assunto"
                />
            </div>
            <div className="flex items-center gap-2 w-full">
                <select
                    id="pillar-filter"
                    value={filterPillar}
                    onChange={(e) => onPillarFilterChange(e.target.value as ComputationalThinkingPillar | 'all')}
                    className="block w-full pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                >
                    <option value="all">Todos Pilares</option>
                    {Object.values(ComputationalThinkingPillar).map(pillar => <option key={pillar} value={pillar}>{pillar}</option>)}
                </select>
            </div>
             <div className="flex items-center gap-2 w-full">
                <select
                    id="level-filter"
                    value={filterLevel}
                    onChange={(e) => onLevelFilterChange(e.target.value as ActivityLevel | 'all')}
                    className="block w-full pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                >
                    <option value="all">Todos Níveis</option>
                    {Object.values(ActivityLevel).map(level => <option key={level} value={level}>{level}</option>)}
                </select>
            </div>
            <div className="relative w-full sm:col-span-2 lg:col-span-3 xl:col-span-2">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <SearchIcon />
                </span>
                <input
                    type="text"
                    placeholder="Buscar no título ou descrição..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                    aria-label="Buscar atividades"
                />
            </div>
        </div>
        <button
            onClick={onExport}
            disabled={activities.length === 0}
            className="w-full lg:w-auto flex-shrink-0 flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
            <ExportIcon />
            Exportar PDF
        </button>
      </div>

      {activities.length === 0 && !noFiltersApplied ? (
        <div className="text-center bg-white p-12 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold text-text-primary">Nenhuma atividade encontrada.</h2>
          <p className="text-text-secondary mt-2">Tente ajustar seus filtros ou o termo de busca.</p>
        </div>
      ) : (
        <div className="space-y-8">
            {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} onDelete={onDelete} onEdit={onEdit} />
            ))}
        </div>
      )}
    </div>
  );
};

export default ActivityList;