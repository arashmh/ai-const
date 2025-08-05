







import React, { useState, useMemo, useEffect } from 'react';
import { Member, Answer, LegacyRole, Page, Society, Experiment, BulkMemberConfig, UserTemplate, DefaultTemplate, CognitiveEthicalProfile } from '../types';
import Questionnaire from '../components/Questionnaire';
import MemberCard from '../components/MemberCard';
import SocietyCard from '../components/SocietyCard';
import ExpertiseDistribution from '../components/ExpertiseDistribution';
import DefineTemplateModal from '../components/DefineTemplateModal';
import TemplateDetailModal from '../components/TemplateDetailModal';
import SocietyAnalysisDisplay from '../components/SocietyAnalysisDisplay';
import { generateCognitiveProfile, generateBulkProfiles, generateSocietyAnalysis } from '../services/geminiService';
import { PlusCircleIcon, BotIcon, UsersIcon, Trash2Icon, ChevronLeftIcon, GavelIcon, ArrowRightIcon, Wand2Icon } from '../components/icons';
import { DEFAULT_TEMPLATES, EXPERTISE_CLUSTERS } from '../constants';

interface SocietyPageProps {
  societies: Society[];
  experiments: Experiment[];
  userTemplates: UserTemplate[];
  onAddSociety: (society: Society) => void;
  onUpdateSociety: (society: Society) => void;
  onDeleteSociety: (societyId: string) => void;
  onAddTemplate: (template: UserTemplate) => void;
  onUpdateTemplate: (template: UserTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  setPage: (page: Page) => void;
  navigateToExperiment: (experimentId: string) => void;
  navigateToDesignerWithSociety: (societyId: string) => void;
  initialSocietyId: string | null;
  clearInitialSocietyId: () => void;
}

const calculateDemographicSummary = (members: Member[]): { age: string, gender: string } => {
    if (members.length === 0) {
        return { age: 'N/A', gender: 'N/A' };
    }
    const maleCount = members.filter(m => m.gender === 'Male').length;
    const femaleCount = members.length - maleCount;
    const genderSummary = `${(maleCount / members.length * 100).toFixed(0)}% Male, ${(femaleCount / members.length * 100).toFixed(0)}% Female`;

    const ageGroups: Record<string, number> = { '20-35': 0, '36-50': 0, '51-70': 0, 'Other': 0 };
    members.forEach(m => {
        if (m.age >= 20 && m.age <= 35) ageGroups['20-35']++;
        else if (m.age >= 36 && m.age <= 50) ageGroups['36-50']++;
        else if (m.age >= 51 && m.age <= 70) ageGroups['51-70']++;
        else ageGroups['Other']++;
    });
    
    const relevantAgeGroups = Object.entries(ageGroups).filter(([, count]) => count > 0);
    if (relevantAgeGroups.length === 0) {
        return { age: 'N/A', gender: genderSummary };
    }

    const ageSummary = relevantAgeGroups
        .map(([range, count]) => `${range}: ${((count / members.length) * 100).toFixed(0)}%`)
        .join(', ');

    return { age: ageSummary, gender: genderSummary };
};

type CreationChoices = { type: 'bulk', counts: Record<string, number>, config: BulkMemberConfig } | { type: 'detailed', answers: Answer[] };

const BulkCreateModal: React.FC<{
  onCancel: () => void;
  onGenerate: (counts: Record<string, number>, config: BulkMemberConfig) => void;
  userTemplates: UserTemplate[];
  onAddTemplate: (template: UserTemplate) => void;
  onUpdateTemplate: (template: UserTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  title: string;
  description: string;
}> = ({ onCancel, onGenerate, userTemplates, onAddTemplate, onUpdateTemplate, title, description }) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [genderRatio, setGenderRatio] = useState(50);
  const [ageWeights, setAgeWeights] = useState<Record<string, number>>({ '20-35': 3, '36-50': 2, '51-70': 1 });
  
  const initialExpertiseWeights = Object.keys(EXPERTISE_CLUSTERS).reduce((acc, key) => {
    acc[key] = 100 / Object.keys(EXPERTISE_CLUSTERS).length;
    return acc;
  }, {} as Record<string, number>);
  const [expertiseWeights, setExpertiseWeights] = useState<Record<string, number>>(initialExpertiseWeights);
  const [lockedExpertise, setLockedExpertise] = useState<Record<string, boolean>>({});

  const [isDefineTemplateModalOpen, setIsDefineTemplateModalOpen] = useState(false);
  const [isTemplateDetailModalOpen, setIsTemplateDetailModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DefaultTemplate | UserTemplate | null>(null);

  const totalToGenerate = useMemo(() => {
    return Object.values(counts).reduce((sum, count) => sum + (count || 0), 0);
  }, [counts]);

  const handleCountChange = (templateName: string, value: string) => {
    const newCount = parseInt(value, 10);
    setCounts(prev => ({ ...prev, [templateName]: isNaN(newCount) || newCount < 0 ? 0 : newCount }));
  };

  const handleAgeWeightChange = (range: string, value: string) => {
    const newWeight = parseInt(value, 10);
    setAgeWeights(prev => ({ ...prev, [range]: isNaN(newWeight) || newWeight < 0 ? 0 : newWeight }));
  };
  
  const handleSubmit = () => {
    if (totalToGenerate > 0) {
      onGenerate(counts, { genderRatio, ageWeights, expertiseWeights });
    }
  };

  const handleTemplateCardClick = (template: DefaultTemplate | UserTemplate) => {
    setSelectedTemplate(template);
    setIsTemplateDetailModalOpen(true);
  };

  const allTemplates = useMemo(() => [...DEFAULT_TEMPLATES, ...userTemplates], [userTemplates]);
  const allTemplateNames = useMemo(() => allTemplates.map(t => t.name), [allTemplates]);

  return (
    <>
    {isDefineTemplateModalOpen && (
        <DefineTemplateModal 
            onClose={() => setIsDefineTemplateModalOpen(false)}
            onSave={onAddTemplate}
        />
    )}
    {isTemplateDetailModalOpen && selectedTemplate && (
        <TemplateDetailModal
            template={selectedTemplate}
            onClose={() => { setIsTemplateDetailModalOpen(false); setSelectedTemplate(null); }}
            onAddTemplate={onAddTemplate}
            onUpdateTemplate={onUpdateTemplate}
            allTemplateNames={allTemplateNames}
        />
    )}
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-7xl transform transition-all flex flex-col">
        <div className="p-6 border-b border-brand-accent/50">
          <h2 className="text-2xl font-bold text-brand-text mb-1">{title}</h2>
          <p className="text-brand-light text-sm">{description}</p>
        </div>
        
        <div className="flex-grow p-6 overflow-y-auto max-h-[80vh] space-y-6">
            {/* Section 1: Member Templates */}
            <section className="border border-brand-accent/40 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-brand-text">1. Select Member Templates</h3>
                    <button onClick={() => setIsDefineTemplateModalOpen(true)} className="flex items-center text-sm bg-brand-accent text-brand-blue font-semibold py-2 px-4 rounded-lg hover:bg-brand-light hover:text-brand-primary transition-colors">
                        <Wand2Icon className="h-5 w-5 mr-2" />
                        Define New Template
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {allTemplates.map((template) => (
                        <div key={template.name} className="bg-brand-primary/50 p-3 rounded-lg flex flex-col group cursor-pointer hover:bg-brand-accent/30 transition-colors"
                             onClick={() => handleTemplateCardClick(template)}
                        >
                            {/* Header */}
                            <div className="flex-shrink-0">
                                <div className="flex items-start space-x-3">
                                    {'icon' in template && <div className="flex-shrink-0 bg-brand-accent/50 p-2 rounded-full mt-1"><template.icon className="h-5 w-5 text-brand-blue" /></div>}
                                    {!('icon' in template) && <div className="flex-shrink-0 bg-brand-accent/50 p-2 rounded-full mt-1"><UsersIcon className="h-5 w-5 text-purple-400" /></div>}
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-brand-text group-hover:text-brand-blue transition-colors">{template.name}</h4>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Body */}
                            <div className="flex-grow my-2">
                                <p className="text-xs text-brand-light">{template.description}</p>
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 mt-auto" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end">
                                    <label className="text-xs text-brand-light mr-2">Count:</label>
                                    <input type="number" min="0" value={counts[template.name] || ''} onChange={(e) => handleCountChange(template.name, e.target.value)} className="w-20 bg-brand-primary border border-brand-accent rounded-md p-1.5 text-brand-text text-center focus:ring-2 focus:ring-brand-blue focus:outline-none" placeholder="0" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Section 2: Demographics */}
            <section className="border border-brand-accent/40 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-brand-text mb-4">2. Configure Demographics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-2">Gender Ratio</label>
                        <div className="flex items-center space-x-4">
                            <span className="text-xs text-brand-light">Male</span>
                            <input type="range" min="0" max="100" value={genderRatio} onChange={e => setGenderRatio(Number(e.target.value))} className="w-full h-2 bg-brand-primary rounded-lg appearance-none cursor-pointer" />
                            <span className="text-xs text-brand-light">Female</span>
                        </div>
                        <p className="text-center text-xs mt-1 text-brand-light">{100-genderRatio}% Male / {genderRatio}% Female</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-text mb-2">Age Distribution (Probability Weight)</label>
                        <div className="space-y-2">
                            {Object.entries(ageWeights).map(([range, weight]) => (
                                <div key={range} className="flex items-center space-x-3">
                                    <span className="text-sm text-brand-light w-16">{range}</span>
                                    <input type="range" min="0" max="10" value={weight} onChange={e => handleAgeWeightChange(range, e.target.value)} className="w-full h-2 bg-brand-primary rounded-lg appearance-none cursor-pointer" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: Expertise Distribution */}
            <section className="border border-brand-accent/40 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-brand-text mb-4">3. Configure Expertise Distribution</h3>
                <ExpertiseDistribution 
                    weights={expertiseWeights}
                    setWeights={setExpertiseWeights}
                    locked={lockedExpertise}
                    setLocked={setLockedExpertise}
                />
            </section>
        </div>

        <div className="p-4 bg-brand-primary/50 mt-auto flex justify-between items-center border-t border-brand-accent/50">
            <button type="button" onClick={onCancel} className="text-brand-light hover:text-white font-semibold">Cancel</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={totalToGenerate === 0}
              className="bg-brand-blue text-brand-primary font-bold py-2.5 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-opacity-90 disabled:bg-brand-accent/50 disabled:text-brand-light/70 disabled:cursor-not-allowed"
            >
              Generate {totalToGenerate > 0 ? `${totalToGenerate} Member(s)` : ''}
            </button>
        </div>
      </div>
    </div>
    </>
  );
};

const CreateSocietyModal: React.FC<{
  onCancel: () => void;
  startCreation: (choices: CreationChoices) => void;
  userTemplates: UserTemplate[];
  onAddTemplate: (template: UserTemplate) => void;
  onUpdateTemplate: (template: UserTemplate) => void;
}> = ({ onCancel, startCreation, userTemplates, onAddTemplate, onUpdateTemplate }) => {
    const [mode, setMode] = useState<'options' | 'bulk' | 'questionnaire'>('options');

    const handleCreateMember = (answers: Answer[]) => {
      startCreation({ type: 'detailed', answers });
    };
    
    const handleBulkCreate = (counts: Record<string, number>, config: BulkMemberConfig) => {
      startCreation({ type: 'bulk', counts, config });
    };
    
    if (mode === 'questionnaire') {
        return <Questionnaire onComplete={handleCreateMember} onCancel={onCancel} />;
    }
    
    if (mode === 'bulk') {
        return <BulkCreateModal
            onCancel={onCancel}
            onGenerate={handleBulkCreate}
            userTemplates={userTemplates}
            onAddTemplate={onAddTemplate}
            onUpdateTemplate={onUpdateTemplate}
            onDeleteTemplate={()=>{}} // Placeholder for now
            title="Create New Society via Bulk Generation"
            description="Specify the member templates and demographics for your new society's founding members."
        />
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-lg p-8">
                <h2 className="text-2xl font-bold text-brand-text mb-2">Create a New Society</h2>
                <p className="text-brand-light mb-6">How would you like to create the founding members?</p>
                <div className="space-y-4">
                    <button onClick={() => setMode('bulk')} className="group w-full text-left bg-brand-accent hover:bg-brand-light text-brand-text hover:text-brand-primary font-semibold py-3 px-5 rounded-lg transition-colors flex items-center space-x-4">
                        <UsersIcon className="h-6 w-6 text-brand-blue group-hover:text-brand-primary transition-colors"/>
                        <span>
                            <span className="block">Quick Generate</span>
                            <span className="text-sm font-normal text-brand-light group-hover:text-brand-primary transition-colors">Create members from templates and demographics.</span>
                        </span>
                    </button>
                    <button onClick={() => setMode('questionnaire')} className="group w-full text-left bg-brand-accent hover:bg-brand-light text-brand-text hover:text-brand-primary font-semibold py-3 px-5 rounded-lg transition-colors flex items-center space-x-4">
                        <PlusCircleIcon className="h-6 w-6 text-brand-blue group-hover:text-brand-primary transition-colors"/>
                        <span>
                            <span className="block">Create Detailed Member</span>
                             <span className="text-sm font-normal text-brand-light group-hover:text-brand-primary transition-colors">Craft a single founding member via questionnaire.</span>
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


const SocietyPage: React.FC<SocietyPageProps> = ({ societies, experiments, userTemplates, onAddSociety, onUpdateSociety, onDeleteSociety, onAddTemplate, onUpdateTemplate, onDeleteTemplate, navigateToExperiment, navigateToDesignerWithSociety, initialSocietyId, clearInitialSocietyId }) => {
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
            const { name, age, gender, expertise, ...profile } = await generateCognitiveProfile(choices.answers);
            const newMember: Member = {
                id: `member-${Date.now()}`, name, role: LegacyRole.Citizen, profile, age, gender, expertise,
                avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${name.replace(/\s/g, '')}`
            };
            members.push(newMember);
            setProgressPercent(60);
        } else if (choices.type === 'bulk') {
            const allTemplates = [...DEFAULT_TEMPLATES, ...userTemplates];
            const templatesToGenerate = allTemplates.filter(a => (choices.counts[a.name] || 0) > 0);
            const totalSteps = templatesToGenerate.length;
            let currentMembers: Member[] = [];

            for (const [index, template] of templatesToGenerate.entries()) {
                const count = choices.counts[template.name];
                setProgressMessage(`Generating ${count} ${template.name} member(s)...`);
                setProgressPercent(((index + 1) / (totalSteps + 1)) * 100);
                
                const profiles = await generateBulkProfiles(template, count, choices.config);
                const newMembers: Member[] = profiles.map((p, i) => {
                  const { name, age, gender, expertise, ...profile } = p;
                  return {
                      id: `member-${Date.now()}-${template.name}-${i}`, name, role: LegacyRole.Citizen, profile, age, gender, expertise,
                      avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${p.name.replace(/\s/g, '')}`
                  };
                });
                currentMembers.push(...newMembers);
            }
            members = currentMembers;
        }

        setProgressMessage('Analyzing society dynamics...');
        const demographics = calculateDemographicSummary(members);
        const { name, analysis } = await generateSocietyAnalysis(members, demographics);
        const newSociety: Society = { id: `soc-${Date.now()}`, name, members, analysis };
        onAddSociety(newSociety);
        setProgressPercent(100);

    } catch (error) {
        console.error("Failed to create society:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAnalyzeSociety = async () => {
    if (!selectedSociety) return;
    setIsLoading(true);
    setLoadingMessage(`Analyzing "${selectedSociety.name}"...`);
    setProgressPercent(50);
    setProgressMessage('AI is analyzing society dynamics...');
    try {
        const demographics = calculateDemographicSummary(selectedSociety.members);
        const { name, analysis } = await generateSocietyAnalysis(selectedSociety.members, demographics);
        onUpdateSociety({ ...selectedSociety, name, analysis });
        setProgressPercent(100);
    } catch (error) {
        console.error("Failed to analyze society:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddMember = async (answers: Answer[]) => {
      if (!selectedSociety) return;
      setLoadingMessage('Crafting AI Character Profile...');
      setIsLoading(true);
      setModal('none');
      setProgressPercent(50);
      setProgressMessage('Generating profile...');
      try {
          const { name, age, gender, expertise, ...profile } = await generateCognitiveProfile(answers);
          const newMember: Member = {
              id: `member-${Date.now()}`, name, role: LegacyRole.Citizen, profile, age, gender, expertise,
              avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${name.replace(/\s/g, '')}`
          };
          const updatedSociety = { ...selectedSociety, members: [...selectedSociety.members, newMember] };
          // Re-analyze after adding member
          const demographics = calculateDemographicSummary(updatedSociety.members);
          const { name: newName, analysis } = await generateSocietyAnalysis(updatedSociety.members, demographics);
          onUpdateSociety({ ...updatedSociety, name: newName, analysis });
          setProgressPercent(100);
      } catch (error) {
          console.error("Failed to create member:", error);
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleBulkAddMembers = async (counts: Record<string, number>, config: BulkMemberConfig) => {
      if (!selectedSociety) return;
      const totalToGenerate = Object.values(counts).reduce((sum, count) => sum + (count || 0), 0);
      setLoadingMessage(`Generating ${totalToGenerate} New Members...`);
      setIsLoading(true);
      setModal('none');
      setProgressPercent(0);
      setProgressMessage('');
      
      try {
          const allTemplates = [...DEFAULT_TEMPLATES, ...userTemplates];
          const templatesToGenerate = allTemplates.filter(template => (counts[template.name] || 0) > 0);
          const totalSteps = templatesToGenerate.length + 1; // +1 for final analysis
          let allNewMembers: Member[] = [];
          
          for (const [index, template] of templatesToGenerate.entries()) {
              const count = counts[template.name];
              setProgressPercent(((index + 1) / totalSteps) * 100);
              setProgressMessage(`Generating ${count} ${template.name} member(s)...`);
              
              const profiles = await generateBulkProfiles(template, count, config);
              const newMembers: Member[] = profiles.map((p, i) => {
                 const { name, age, gender, expertise, ...profile } = p;
                 return {
                    id: `member-${Date.now()}-${template.name}-${i}`, name, role: LegacyRole.Citizen, profile, age, gender, expertise,
                    avatar: `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${p.name.replace(/\s/g, '')}`
                 }
              });
              allNewMembers = [...allNewMembers, ...newMembers];
          }
          const updatedMembers = [...selectedSociety.members, ...allNewMembers];
          setProgressMessage('Re-analyzing society dynamics...');
          const demographics = calculateDemographicSummary(updatedMembers);
          const { name, analysis } = await generateSocietyAnalysis(updatedMembers, demographics);
          onUpdateSociety({ ...selectedSociety, name, members: updatedMembers, analysis });
          setProgressPercent(100);

      } catch (error) {
          console.error("Failed to bulk add members:", error);
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  };

  const onRemoveMember = async (memberId: string) => {
    if (!selectedSociety) return;
    const updatedMembers = selectedSociety.members.filter(m => m.id !== memberId);
    if(updatedMembers.length > 0) {
        setIsLoading(true);
        setLoadingMessage('Re-analyzing Society...');
        const demographics = calculateDemographicSummary(updatedMembers);
        const { name, analysis } = await generateSocietyAnalysis(updatedMembers, demographics);
        onUpdateSociety({ ...selectedSociety, name, members: updatedMembers, analysis });
        setIsLoading(false);
    } else {
        onUpdateSociety({ ...selectedSociety, members: [], analysis: undefined, name: `${selectedSociety.name} (Empty)` });
    }
  };
  
  const onClearSocietyMembers = () => {
    if (!selectedSociety) return;
    if (window.confirm(`Are you sure you want to remove all members from "${selectedSociety.name}"? This cannot be undone.`)) {
        onUpdateSociety({ ...selectedSociety, members: [], analysis: undefined, name: `${selectedSociety.name} (Empty)` });
    }
  };


  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {modal === 'create_society' && <CreateSocietyModal onCancel={() => setModal('none')} startCreation={handleStartSocietyCreation} userTemplates={userTemplates} onAddTemplate={onAddTemplate} onUpdateTemplate={onUpdateTemplate} />}
      {modal === 'add_member_detailed' && <Questionnaire onComplete={handleAddMember} onCancel={() => setModal('none')} />}
      {modal === 'add_member_bulk' && <BulkCreateModal onCancel={() => setModal('none')} onGenerate={handleBulkAddMembers} userTemplates={userTemplates} onAddTemplate={onAddTemplate} onUpdateTemplate={onUpdateTemplate} onDeleteTemplate={onDeleteTemplate} title="Add Members" description="Add new members to the existing society by specifying templates and demographics." />}
      
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
            </div>
            
            {selectedSociety.analysis ? (
              <div className="mb-8">
                <SocietyAnalysisDisplay analysis={selectedSociety.analysis} />
              </div>
            ) : (
              <div className="my-8 p-6 bg-brand-accent/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-brand-text">Analysis Incomplete</h2>
                  <p className="text-brand-light mt-1">This society was created with an older version. Run the new analysis to see its dynamics.</p>
                </div>
                <button onClick={handleAnalyzeSociety} className="bg-brand-blue text-brand-primary font-bold py-3 px-6 rounded-lg flex items-center shadow-lg hover:bg-opacity-90 transition-all transform hover:scale-105">
                  <Wand2Icon className="h-5 w-5 mr-2" />
                  Analyze Society
                </button>
              </div>
            )}

            {associatedExperiments.length > 0 ? (
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
            ) : (
              <div className="my-8 p-6 bg-brand-accent/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-brand-text">Ready for Governance</h2>
                  <p className="text-brand-light mt-1">This society is not part of any experiment. You can launch a new simulation using its members.</p>
                </div>
                <button onClick={() => navigateToDesignerWithSociety(selectedSociety.id)} className="bg-brand-blue text-brand-primary font-bold py-3 px-6 rounded-lg flex items-center shadow-lg hover:bg-opacity-90 transition-all transform hover:scale-105">
                  <GavelIcon className="h-5 w-5 mr-2" />
                  Run Experiment on this Society
                </button>
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