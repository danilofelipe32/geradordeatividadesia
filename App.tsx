import React, { useState, useCallback, useMemo } from 'react';
import { Activity, ActivityFormData, StoredFile, ComputationalThinkingPillar, ActivityLevel } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateActivities } from './services/geminiService';
import { exportActivitiesToPdf } from './services/pdfExportService';

import Header from './components/Header';
import ActivityForm from './components/ActivityForm';
import ActivityList from './components/ActivityList';
import Loader from './components/Loader';
import EditModal from './components/EditModal';
import RAGManager from './components/RAGManager';
import InfoModal from './components/InfoModal';

type ActiveTab = 'form' | 'rag';

const App: React.FC = () => {
  const [activities, setActivities] = useLocalStorage<Activity[]>('bncc-activities', []);
  const [ragFiles, setRagFiles] = useLocalStorage<StoredFile[]>('rag-files', []);
  const [selectedFileIds, setSelectedFileIds] = useLocalStorage<string[]>('rag-selected-files', []);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('form');
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterPillar, setFilterPillar] = useState<ComputationalThinkingPillar | 'all'>('all');
  const [filterLevel, setFilterLevel] = useState<ActivityLevel | 'all'>('all');
  const [filterTopic, setFilterTopic] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleGenerateActivities = useCallback(async (formData: ActivityFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const selectedFiles = ragFiles.filter(f => selectedFileIds.includes(f.id));
      const newActivities = await generateActivities(formData, selectedFiles);
      
      const activitiesWithData = newActivities.map(act => ({ 
        ...act,
        id: Date.now() + Math.random(),
        subject: formData.subject,
        topic: formData.topic,
        grade: formData.grade,
        level: formData.level,
        pillar: formData.pillar,
      }));
      setActivities(prev => [...activitiesWithData, ...prev]);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao gerar as atividades. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [setActivities, ragFiles, selectedFileIds]);

  const handleDeleteActivity = (id: number) => {
    setActivities(prev => prev.filter(activity => activity.id !== id));
  };

  const handleStartEdit = (activity: Activity) => {
    setEditingActivity(activity);
  };

  const handleUpdateActivity = (updatedActivity: Activity) => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === updatedActivity.id ? updatedActivity : activity
      )
    );
    setEditingActivity(null);
  };

  const handleExportPdf = () => {
    exportActivitiesToPdf(filteredActivities);
  };

  const filteredActivities = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const topicQuery = filterTopic.toLowerCase();
    return activities.filter(activity => {
      const subjectMatch = filterSubject === 'all' || activity.subject === filterSubject;
      const pillarMatch = filterPillar === 'all' || activity.pillar === filterPillar;
      const levelMatch = filterLevel === 'all' || activity.level === filterLevel;
      const topicMatch = topicQuery === '' || activity.topic.toLowerCase().includes(topicQuery);
      const searchMatch = query === '' ||
        activity.titulo.toLowerCase().includes(query) ||
        activity.descricao.toLowerCase().includes(query);
      return subjectMatch && pillarMatch && levelMatch && searchMatch && topicMatch;
    });
  }, [activities, filterSubject, filterPillar, filterLevel, searchQuery, filterTopic]);
  
  const availableSubjects = useMemo(() => 
    [...new Set(activities.map(a => a.subject))], 
    [activities]
  );

  const tabStyle = (tabName: ActiveTab) => 
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark ${
      activeTab === tabName 
      ? 'bg-white text-primary-dark border-gray-300 border-b-0' 
      : 'bg-primary-light text-gray-600 hover:bg-white/70'
    }`;
  
  return (
    <div className="min-h-screen bg-primary-light font-sans">
      <Header onInfoClick={() => setIsInfoModalOpen(true)} />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="flex border-b border-gray-300">
                <button onClick={() => setActiveTab('form')} className={tabStyle('form')}>
                  Gerar Atividade
                </button>
                <button onClick={() => setActiveTab('rag')} className={tabStyle('rag')}>
                  Materiais de Apoio (RAG)
                </button>
              </div>
              <div className="bg-white p-6 rounded-b-lg rounded-r-lg shadow-lg">
                {activeTab === 'form' && <ActivityForm onSubmit={handleGenerateActivities} isLoading={isLoading} />}
                {activeTab === 'rag' && (
                  <RAGManager 
                    files={ragFiles} 
                    onFilesChange={setRagFiles} 
                    selectedFiles={selectedFileIds} 
                    onSelectionChange={setSelectedFileIds}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            {isLoading && (
              <div className="flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm rounded-lg p-8 shadow-md">
                <Loader />
                <p className="mt-4 text-primary-dark font-semibold text-center">Gerando atividades... Isso pode levar alguns instantes.</p>
              </div>
            )}
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-md" role="alert">{error}</div>}
            
            <ActivityList 
              activities={filteredActivities}
              onDelete={handleDeleteActivity}
              onEdit={handleStartEdit}
              subjects={availableSubjects}
              filterSubject={filterSubject}
              onFilterChange={setFilterSubject}
              onExport={handleExportPdf}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterPillar={filterPillar}
              onPillarFilterChange={setFilterPillar}
              filterLevel={filterLevel}
              onLevelFilterChange={setFilterLevel}
              filterTopic={filterTopic}
              onTopicFilterChange={setFilterTopic}
            />
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>Desenvolvido com IA para educadores inovadores.</p>
      </footer>

      {editingActivity && (
        <EditModal 
          activity={editingActivity}
          onSave={handleUpdateActivity}
          onClose={() => setEditingActivity(null)}
        />
      )}

      {isInfoModalOpen && (
        <InfoModal onClose={() => setIsInfoModalOpen(false)} />
      )}
    </div>
  );
};

export default App;