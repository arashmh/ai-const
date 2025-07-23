
import React, { useState, useMemo, useEffect } from 'react';
import { Member, Answer, Role, Page, Society, Experiment } from '../types';
import Questionnaire from '../components/Questionnaire';
import MemberCard from '../components/MemberCard';
import SocietyCard from '../components/SocietyCard';
import { generateCognitiveProfile, generateBulkProfiles, generateSocietyNameAndDescription } from '../services/geminiService';
import { PlusCircleIcon, BotIcon, UsersIcon, Trash2Icon, ChevronLeftIcon, GavelIcon, ArrowRightIcon } from '../components/icons';
import { ARCHETYPES, Archetype } from '../constants';

interface SocietyPageProps {
  societies: Society[];
  experiments: Experiment[];
  onAddSociety: (society: Society) => void;
  onUpdateSociety: (society: Society) => void;
  onDeleteSociety: (societyId: string) => void;
  setPage: (page: Page) => void;
  navigateToExperiment: (experimentId: string) => void;
  initialSocietyId: string | null;
  clearInitialSocietyId: () => void;
}

type CreationChoices = { type: 'bulk', counts: Record<string, number> } | { type: 'detailed', answers: Answer[] };

const BulkCreateModal: React.FC<{
  onCancel: () => void;
  onGenerate: (counts: Record<string, number>) => void;
  title: string;
  description: string;
}> = ({ onCancel, onGenerate, title, description }) => {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const totalToGenerate = useMemo(() => {
    return Object.values(counts).reduce((sum, count) => sum + (count || 0), 0);
  }, [counts]);

  const handleCountChange = (archetypeName: string, value: string) => {
    const newCount = parseInt(value, 10);
    setCounts(prev => ({
      ...prev,
      [archetypeName]: isNaN(newCount) || newCount < 0 ? 0 : newCount,
    }));
  };

  const handleSubmit = () => {
    if (totalToGenerate > 0) {
      onGenerate(counts);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-3xl transform transition-all">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-brand-text mb-2">{title}</h2>
          <p className="text-brand-light mb-6">{description}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-3">
            {ARCHETYPES.map((archetype) => (
              <div key={archetype.name} className="bg-brand-primary/50 p-4 rounded-lg flex items-center space-x-4">
                <div className="flex-shrink-0 bg-brand-accent/50 p-3 rounded-full">
                  <archetype.icon className="h-6 w-6 text-brand-blue" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-brand-text">{archetype.name}</h3>
                  <p className="text-xs text-brand-light">{archetype.description}</p>
                </div>
                <input
                  type="number"
                  min="0"
                  value={counts[archetype.name] || ''}
                  onChange={(e) => handleCountChange(archetype.name, e.target.value)}
                  className="w-20 bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text text-center focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-between items-center">
            <button type="button" onClick={onCancel} className="text-brand-light hover:text-white">Cancel</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={totalToGenerate === 0}
              className="bg-brand-accent text-brand-blue font-bold py-3 px-6 text-base rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-brand-light hover:text-brand-primary disabled:bg-brand-accent/50 disabled:text-brand-light/70 disabled:cursor-not-allowed disabled:hover:bg-brand-accent/50"
            >
              Generate {totalToGenerate > 0 ? `${totalToGenerate} Member(s)` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateSocietyModal: React.FC<{
  onCancel: () => void;
  startCreation: (choices: CreationChoices) => void;
}> = ({ onCancel, startCreation }) => {
    const [mode, setMode] = useState<'options' | 'bulk' | 'questionnaire'>('options');

    const handleCreateMember = (answers: Answer[]) => {
      startCreation({ type: 'detailed', answers });
    };
    
    const handleBulkCreate = (counts: Record<string, number>) => {
      startCreation({ type: 'bulk', counts });
    };
    
    if (mode === 'questionnaire') {
        return <Questionnaire onComplete={handleCreateMember} onCancel={onCancel} />;
    }
    
    if (mode === 'bulk') {
        return <BulkCreateModal
            onCancel={onCancel}
            onGenerate={handleBulkCreate}
            title="Create New Society"
            description="Create multiple AI members at once by selecting from common archetypes."
        />
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-lg p-8">
                <h2 className="text-2xl font-bold text-brand-text mb-2">Create a New Society</h2>
                <p className="text-brand-light mb-6">How would you like to create the founding members?</p>
                <div className="space-y-4">
                    <button onClick={() => setMode('bulk')} className="w-full text-left bg-brand-accent hover:bg-brand-light text-brand-text font-semibold py-3 px-5 rounded-lg transition-colors flex items-center space-x-4">
                        <UsersIcon className="h-6 w-6 text-brand-blue"/>
                        <span>
                            <span className="block">Quick Generate</span>
                            <span className="text-sm font-normal text-brand-light">Create members from archetypes.</span>
                        </span>
                    </button>
                    <button onClick={() => setMode('questionnaire')} className="w-full text-left bg-brand-accent hover:bg-brand-light text-brand-text font-semibold py-3 px-5 rounded-lg transition-colors flex items-center space-x-4">
                        <PlusCircleIcon className="h-6 w-6 text-brand-blue"/>
                        <span>
                            <span className="block">Create Detailed Member</span>
                             <span className="text-sm font-normal text-brand-light">Craft a single founding member via questionnaire.</span>
                        </span>
                    </button>
                </div>
                 <div className="mt-8 flex justify-end">
                    <button type="button" onClick={onCancel} className="text-brand-light hover:text-white">Cancel</button>
                </div>
            </div>
        </div>
    );
};


const SocietyPage: React.FC<SocietyPageProps> = ({ societies, experiments, onAddSociety, onUpdateSociety, onDeleteSociety, navigateToExperiment, initialSocietyId, clearInitialSocietyId }) => {
  const [selectedSocietyId, setSelectedSocietyId] = useState<string | null>(null);
  const [modal, setModal] = useState<'none' | 'create_society' | 'add_member_bulk' | 'add_member_detailed'>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  useEffect(() => {
    if (initialSocietyId) {
        setSelectedSocietyId(initialSocietyId);
        clearInitialSocietyId();
    }
  }, [initialSocietyId, clearInitialSocietyId]);


  const selectedSociety = useMemo(() => {
    return societies.find(s => s.id === selectedSocietyId) || null;
  }, [societies, selectedSocietyId]);

  const associatedExperiments = useMemo(() => {
    if (!selectedSociety) return [];
    return experiments.filter(e => e.societyId === selectedSociety.id);
  }, [experiments, selectedSociety]);


  const handleStartSocietyCreation = async (choices: CreationChoices) => {
    setModal('none');
    setIsLoading(true);
    setLoadingMessage('Generating New Society...');
    setProgressPercent(0);
    setProgressMessage('');
    
    try {
        let members: Member[] = [];
        if (choices.type === 'detailed') {
            setProgressMessage('Crafting initial member profile...');
            setProgressPercent(30);
            const { name, ...profile } = await generateCognitiveProfile(choices.answers);
            const newMember: Member = {
                id: `member-${Date.now()}`, name, role: Role.Citizen, profile,
                avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${name.replace(/\s/g, '')}`
            };
            members.push(newMember);
            setProgressPercent(60);
        } else if (choices.type === 'bulk') {
            const archetypesToGenerate = ARCHETYPES.filter(a => choices.counts[a.name] > 0);
            const totalSteps = archetypesToGenerate.length;
            let currentMembers: Member[] = [];

            for (const [index, archetype] of archetypesToGenerate.entries()) {
                const count = choices.counts[archetype.name];
                setProgressMessage(`Generating ${count} ${archetype.name} member(s)...`);
                setProgressPercent(((index + 1) / (totalSteps + 1)) * 100);
                
                const profiles = await generateBulkProfiles(archetype, count);
                const newMembers: Member[] = profiles.map((p, i) => ({
                    id: `member-${Date.now()}-${archetype.name}-${i}`, name: p.name, role: Role.Citizen, profile: p,
                    avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${p.name.replace(/\s/g, '')}`
                }));
                currentMembers.push(...newMembers);
            }
            members = currentMembers;
        }

        setProgressMessage('Generating society name & description...');
        const { name, description } = await generateSocietyNameAndDescription(members);
        const newSociety: Society = { id: `soc-${Date.now()}`, name, description, members };
        onAddSociety(newSociety);
        setProgressPercent(100);

    } catch (error) {
        console.error("Failed to create society:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddMember = async (answers: Answer[]) => {
      if (!selectedSociety) return;
      setLoadingMessage('Crafting AI Cognitive & Ethical Profile...');
      setIsLoading(true);
      setModal('none');
      setProgressPercent(50);
      setProgressMessage('Generating profile...');
      try {
          const { name, ...profile } = await generateCognitiveProfile(answers);
          const newMember: Member = {
              id: `member-${Date.now()}`, name, role: Role.Citizen, profile,
              avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${name.replace(/\s/g, '')}`
          };
          onUpdateSociety({ ...selectedSociety, members: [...selectedSociety.members, newMember] });
          setProgressPercent(100);
      } catch (error) {
          console.error("Failed to create member:", error);
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleBulkAddMembers = async (counts: Record<string, number>) => {
      if (!selectedSociety) return;
      const totalToGenerate = Object.values(counts).reduce((sum, count) => sum + (count || 0), 0);
      setLoadingMessage(`Generating ${totalToGenerate} New Members...`);
      setIsLoading(true);
      setModal('none');
      setProgressPercent(0);
      setProgressMessage('');
      
      try {
          const archetypesToGenerate = ARCHETYPES.filter(archetype => counts[archetype.name] > 0);
          const totalSteps = archetypesToGenerate.length;
          let allNewMembers: Member[] = [];
          
          for (const [index, archetype] of archetypesToGenerate.entries()) {
              const count = counts[archetype.name];
              setProgressPercent(((index + 1) / totalSteps) * 100);
              setProgressMessage(`Generating ${count} ${archetype.name} member(s)...`);
              
              const profiles = await generateBulkProfiles(archetype, count);
              const newMembers: Member[] = profiles.map((profileData, index) => ({
                  id: `member-${Date.now()}-${archetype.name}-${index}`, name: profileData.name, role: Role.Citizen, profile: profileData,
                  avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${profileData.name.replace(/\s/g, '')}`
              }));
              allNewMembers = [...allNewMembers, ...newMembers];
          }
          onUpdateSociety({ ...selectedSociety, members: [...selectedSociety.members, ...allNewMembers] });
      } catch (error) {
          console.error("Failed to bulk add members:", error);
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  };

  const onRemoveMember = (memberId: string) => {
    if (!selectedSociety) return;
    const updatedMembers = selectedSociety.members.filter(m => m.id !== memberId);
    onUpdateSociety({ ...selectedSociety, members: updatedMembers });
  };
  
  const onClearSocietyMembers = () => {
    if (!selectedSociety) return;
    if (window.confirm(`Are you sure you want to remove all members from "${selectedSociety.name}"? This cannot be undone.`)) {
        onUpdateSociety({ ...selectedSociety, members: [] });
    }
  };


  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {modal === 'create_society' && <CreateSocietyModal onCancel={() => setModal('none')} startCreation={handleStartSocietyCreation} />}
      {modal === 'add_member_detailed' && <Questionnaire onComplete={handleAddMember} onCancel={() => setModal('none')} />}
      {modal === 'add_member_bulk' && <BulkCreateModal onCancel={() => setModal('none')} onGenerate={handleBulkAddMembers} title="Add Members" description="Add new members to the existing society." />}
      
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
           <BotIcon className="h-16 w-16 text-brand-blue animate-pulse-fast" />
           <p className="text-xl mt-4 text-brand-text">{loadingMessage}</p>
           <div className="w-full max-w-md mt-4">
              <div className="w-full bg-brand-accent rounded-full h-2.5">
                  <div className="bg-brand-blue h-2.5 rounded-full" style={{ width: `${progressPercent}%`, transition: 'width 0.5s ease-in-out' }}></div>
              </div>
              <p className="text-center text-brand-light text-sm mt-2 h-5">{progressMessage}</p>
           </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        {!selectedSociety ? (
          // Master View: List of Societies
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h1 className="text-4xl font-bold text-brand-text">Societies</h1>
                <p className="mt-1 text-lg text-brand-light">
                  Manage the digital civilizations you have created.
                </p>
              </div>
              <button
                onClick={() => setModal('create_society')}
                className="flex items-center justify-center bg-brand-accent text-brand-blue font-bold py-3 px-5 text-base rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-brand-light hover:text-brand-primary"
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Create New Society
              </button>
            </div>

            {societies.length === 0 ? (
                <div className="text-center py-20 bg-brand-secondary rounded-lg border-2 border-dashed border-brand-accent">
                    <UsersIcon className="mx-auto h-12 w-12 text-brand-accent" />
                    <h3 className="mt-4 text-xl font-semibold text-brand-text">No Societies Created</h3>
                    <p className="mt-1 text-brand-light">Start by creating your first digital society.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...societies].sort((a,b) => b.id.localeCompare(a.id)).map(society => (
                        <SocietyCard 
                            key={society.id}
                            society={society}
                            experiments={experiments.filter(e => e.societyId === society.id)}
                            onSelect={() => setSelectedSocietyId(society.id)}
                            onDelete={() => onDeleteSociety(society.id)}
                            onSelectExperiment={navigateToExperiment}
                        />
                    ))}
                </div>
            )}
          </>
        ) : (
          // Detail View: Society Members
          <>
             <div className="mb-6">
                <button onClick={() => setSelectedSocietyId(null)} className="flex items-center text-brand-light hover:text-brand-text transition-colors font-semibold">
                    <ChevronLeftIcon className="h-5 w-5 mr-1"/>
                    Back to All Societies
                </button>
            </div>
            
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-brand-text">{selectedSociety.name}</h1>
              <div className="mt-3 p-4 bg-brand-secondary/50 rounded-lg border border-brand-accent/30 max-w-3xl">
                <p className="text-lg text-brand-light">{selectedSociety.description}</p>
              </div>
            </div>

            {associatedExperiments.length > 0 && (
              <div className="mb-8 p-6 bg-brand-secondary/80 rounded-lg">
                <h2 className="text-xl font-bold text-brand-text mb-4">Associated Experiments</h2>
                <div className="space-y-3">
                  {associatedExperiments.map(exp => (
                    <button
                        key={exp.id}
                        onClick={() => navigateToExperiment(exp.id)}
                        className="w-full text-left p-4 rounded-lg bg-brand-accent hover:bg-brand-light group flex items-center justify-between transition-colors duration-300 shadow-md hover:shadow-lg"
                    >
                        <div className="flex items-center">
                            <GavelIcon className="h-6 w-6 mr-4 text-brand-action flex-shrink-0" />
                            <div>
                                <span className="font-semibold text-brand-text text-lg group-hover:text-brand-primary">{exp.name}</span>
                                <span className={`text-xs block mt-1 px-2 py-0.5 rounded-full inline-block ${exp.status === 'Running' ? 'bg-green-500/30 text-green-300' : 'bg-brand-primary text-brand-light'}`}>
                                    Status: {exp.status}
                                </span>
                            </div>
                        </div>
                        <ArrowRightIcon className="h-6 w-6 text-brand-light group-hover:text-brand-primary transition-transform transform group-hover:translate-x-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap mb-8">
              <button
                onClick={() => setModal('add_member_bulk')}
                className="flex items-center justify-center bg-brand-accent text-brand-blue font-bold py-3 px-5 text-base rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-brand-light hover:text-brand-primary"
              >
                <UsersIcon className="h-5 w-5 mr-2" />
                Quick Add Members
              </button>
              <button
                onClick={() => setModal('add_member_detailed')}
                className="flex items-center justify-center bg-brand-accent text-brand-blue font-bold py-3 px-5 text-base rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-brand-light hover:text-brand-primary"
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Create Detailed Member
              </button>
               {selectedSociety.members.length > 0 && (
                <button
                  onClick={onClearSocietyMembers}
                  className="flex items-center justify-center bg-brand-red hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
                  aria-label="Clear all members from society"
                >
                  <Trash2Icon className="h-5 w-5 mr-2" />
                  Clear Members
                </button>
              )}
            </div>
            
            {selectedSociety.members.length === 0 ? (
              <div className="text-center py-20 bg-brand-secondary rounded-lg border-2 border-dashed border-brand-accent">
                <UsersIcon className="mx-auto h-12 w-12 text-brand-accent" />
                <h3 className="mt-4 text-xl font-semibold text-brand-text">This Society is Empty</h3>
                <p className="mt-1 text-brand-light">Add members to begin building your civilization.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                {selectedSociety.members.map((member) => (
                  <MemberCard key={member.id} member={member} onRemove={onRemoveMember} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SocietyPage;
