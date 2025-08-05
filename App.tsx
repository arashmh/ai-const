import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, Member, Experiment, LegacyRole, EventType, Proposal, EventLogEntry, Law, Comment, Society, ExperimentConfig, ExperimentProtocol, UserTemplate, Protocol, RoleAssignmentConfig } from './types';
import HomePage from './pages/HomePage';
import SocietyPage from './pages/SocietyPage';
import LawPage from './pages/LawPage';
import ExperimentDesignerPage from './pages/ExperimentDesignerPage';
import { HomeIcon, UsersIcon, GavelIcon } from './components/icons';
import { processTick } from './services/simulationEngine';
import { generateProtocolFromIdea } from './services/geminiService';
import { TOOLS_PALETTE } from './constants';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>(Page.Home);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [initialExperimentId, setInitialExperimentId] = useState<string | null>(null);
  const [initialSocietyId, setInitialSocietyId] = useState<string | null>(null);
  const [protocolToEdit, setProtocolToEdit] = useState<Protocol | null>(null);
  const [initialLawView, setInitialLawView] = useState<'landing' | 'protocols' | 'experiments'>('landing');
  
  // Ref to hold simulation timer IDs to prevent multiple loops for the same experiment
  const simulationLoopTimers = useRef<Record<string, number>>({});

  // Refs to hold the latest state for access in the simulation loop
  const experimentsRef = useRef(experiments);
  const societiesRef = useRef(societies);
  const protocolsRef = useRef(protocols);

  useEffect(() => {
    experimentsRef.current = experiments;
    societiesRef.current = societies;
    protocolsRef.current = protocols;
  });

  useEffect(() => {
    try {
        const savedSocieties = localStorage.getItem('ai-constitution-societies');
        if(savedSocieties) setSocieties(JSON.parse(savedSocieties));
        
        const savedProtocolsJSON = localStorage.getItem('ai-constitution-protocols');
        if (savedProtocolsJSON) {
            const loadedProtocols: Protocol[] = JSON.parse(savedProtocolsJSON);
            // Clear any "generating" statuses from previous sessions, mark as error
            const cleanedProtocols = loadedProtocols.map(p => 
                p.status === 'generating' 
                    ? { ...p, status: 'error' as const, errorMessage: 'Generation was interrupted.' } 
                    : p
            );
            setProtocols(cleanedProtocols);
        }

        const savedTemplates = localStorage.getItem('ai-constitution-user-templates');
        if(savedTemplates) setUserTemplates(JSON.parse(savedTemplates));

        const savedExperimentsJSON = localStorage.getItem('ai-constitution-experiments');
        if (savedExperimentsJSON) {
            let loadedExperiments: Experiment[] = JSON.parse(savedExperimentsJSON);
            const now = Date.now();
            
            loadedExperiments = loadedExperiments.map(exp => {
                const updatedExp: Experiment = {
                    ...exp,
                    status: (exp.status === 'Running' && exp.nextDayTimestamp < now) ? 'Paused' as const : exp.status,
                    proposals: exp.proposals.map(p => ({...p, downvotes: p.downvotes || [], stateEntryDay: p.stateEntryDay || p.creationDay })),
                    dailyActivity: exp.dailyActivity || {},
                    turnState: exp.turnState || { round: 1, phase: 'action', actorIndex: 0 },
                    // Ensure roles is an array for backwards compatibility
                    roles: Object.fromEntries(Object.entries(exp.roles).map(([memberId, roleOrRoles]) => [memberId, Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]] ))
                };
                return updatedExp;
            });
            setExperiments(loadedExperiments);
        }
    } catch(e) { console.error("Failed to load from local storage", e); }
  }, []);

  useEffect(() => {
      try { localStorage.setItem('ai-constitution-societies', JSON.stringify(societies)); } 
      catch(e) { console.error("Failed to save societies to local storage", e); }
  }, [societies]);

  useEffect(() => {
      try { localStorage.setItem('ai-constitution-protocols', JSON.stringify(protocols)); } 
      catch(e) { console.error("Failed to save protocols to local storage", e); }
  }, [protocols]);

  useEffect(() => {
      try { localStorage.setItem('ai-constitution-experiments', JSON.stringify(experiments)); } 
      catch(e) { console.error("Failed to save experiments to local storage", e); }
  }, [experiments]);

  useEffect(() => {
      try { localStorage.setItem('ai-constitution-user-templates', JSON.stringify(userTemplates)); }
      catch(e) { console.error("Failed to save user templates to local storage", e); }
  }, [userTemplates]);

  const runSimulationLoop = useCallback(async (expId: string) => {
    const currentExperiment = experimentsRef.current.find(e => e.id === expId);

    if (!currentExperiment || currentExperiment.status !== 'Running') {
        if (simulationLoopTimers.current[expId]) {
            clearTimeout(simulationLoopTimers.current[expId]);
            delete simulationLoopTimers.current[expId];
        }
        return;
    }

    const society = societiesRef.current.find(s => s.id === currentExperiment.societyId);
    const protocol = protocolsRef.current.find(p => p.id === currentExperiment.protocolId);

    if (!society || !protocol) {
        console.error(`Missing society or protocol for experiment ${expId}. Pausing.`);
        setExperiments(prev => prev.map(e => e.id === expId ? { ...e, status: 'Paused' } : e));
        return;
    }

    try {
        const { updatedExperiment } = await processTick(currentExperiment, society, protocol);
        setExperiments(prev => prev.map(e => e.id === expId ? updatedExperiment : e));
    } catch (error) {
        console.error(`Error during simulation tick for experiment ${expId}:`, error);
        const log = { day: currentExperiment.currentDay, type: EventType.DayEnd, text: `Simulation error occurred: ${error}. Pausing experiment.` };
        setExperiments(prev => prev.map(e => e.id === expId ? { ...e, status: 'Paused', eventLog: [...e.eventLog, {...log, id: `log-${Date.now()}`}] } : e));
    }

    const delay = (currentExperiment.config.actionDelaySeconds || 2) * 1000;
    simulationLoopTimers.current[expId] = window.setTimeout(() => runSimulationLoop(expId), delay);
  }, []); // Empty dependency array makes this function stable

  // Effect to manage starting and stopping simulation loops
  useEffect(() => {
    experiments.forEach(exp => {
        if (exp.status === 'Running' && !simulationLoopTimers.current[exp.id]) {
            console.log(`Starting simulation for ${exp.name}`);
            runSimulationLoop(exp.id);
        } else if (exp.status !== 'Running' && simulationLoopTimers.current[exp.id]) {
            console.log(`Stopping simulation for ${exp.name}`);
            clearTimeout(simulationLoopTimers.current[exp.id]);
            delete simulationLoopTimers.current[exp.id];
        }
    });
    // Cleanup on unmount
    return () => {
        Object.values(simulationLoopTimers.current).forEach(clearTimeout);
    };
  }, [experiments, runSimulationLoop]);


    const navigateToExperiment = (experimentId: string) => {
        setInitialExperimentId(experimentId);
        setPage(Page.Law);
    };
    
    const navigateToSociety = (societyId: string) => {
        setInitialSocietyId(societyId);
        setPage(Page.Society);
    };
    
    const navigateToDesigner = () => {
        setProtocolToEdit(null);
        setPage(Page.ExperimentDesigner);
    };

    const navigateToDesignerForEdit = (protocol: Protocol) => {
        setProtocolToEdit(protocol);
        setPage(Page.ExperimentDesigner);
    };

    const handleAddSociety = (society: Society) => {
        setSocieties(prev => [...prev, society]);
    };

    const handleUpdateSociety = (updatedSociety: Society) => {
        setSocieties(prev => prev.map(s => s.id === updatedSociety.id ? updatedSociety : s));
    };

    const handleDeleteSociety = (societyId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this society and all its members? This also deletes any completed experiments associated with it. This action cannot be undone.')) {
            const isSocietyInUse = experiments.some(exp => 
                exp.societyId === societyId && (exp.status === 'Running' || exp.status === 'Paused')
            );
    
            if (isSocietyInUse) {
                alert('This society cannot be deleted because it is part of an active (Running or Paused) experiment. Please complete or stop the experiment first.');
                return;
            }

            setSocieties(prev => prev.filter(s => s.id !== societyId));
            setExperiments(prev => prev.filter(exp => exp.societyId !== societyId));
        }
    };
    
    const handleStartProtocolGeneration = async (name: string, description: string, idea: string): Promise<Protocol> => {
        const tempId = `proto-pending-${Date.now()}`;
        const tempProtocol: Protocol = {
            id: tempId, name, description,
            protocol: { tools: [], roles: [], states: [], transitions: [], flow: '', tasks: [] },
            status: 'generating'
        };

        setProtocols(prev => [...prev, tempProtocol]);

        try {
            const generatedData = await generateProtocolFromIdea(idea);
            const completeProtocol: Protocol = {
                id: tempId, name, description,
                protocol: { ...generatedData, tools: TOOLS_PALETTE }
            };
            setProtocols(prev => prev.map(p => p.id === tempId ? completeProtocol : p));
            return completeProtocol;
        } catch (error) {
            console.error("Protocol generation failed:", error);
            setProtocols(prev => prev.map(p => p.id === tempId ? {
                ...p,
                status: 'error',
                errorMessage: 'AI generation failed. Please try deleting this and creating a new one.'
            } : p));
            throw error;
        }
    };
    
    const handleUpdateProtocol = (updatedProtocol: Protocol) => {
        setProtocols(prev => prev.map(p => p.id === updatedProtocol.id ? updatedProtocol : p));
        setProtocolToEdit(null);
        setInitialLawView('protocols');
        setPage(Page.Law);
    };

    const handleDeleteProtocol = (protocolId: string) => {
        const protocolToDelete = protocols.find(p => p.id === protocolId);
        if (!protocolToDelete) return;

        // Allow deletion for error or generating states without checking experiments
        if (protocolToDelete.status !== 'error' && protocolToDelete.status !== 'generating') {
            const isProtocolInUse = experiments.some(exp => exp.protocolId === protocolId);
            if (isProtocolInUse) {
                alert('This protocol cannot be deleted because it is being used by one or more experiments. Please delete the associated experiments first.');
                return;
            }
        }
        
        if (window.confirm(`Are you sure you want to delete the protocol "${protocolToDelete.name}"? This cannot be undone.`)) {
            setProtocols(prev => prev.filter(p => p.id !== protocolId));
        }
    };
    
    const handleDuplicateProtocol = (protocolId: string) => {
        const protocolToDuplicate = protocols.find(p => p.id === protocolId);
        if (!protocolToDuplicate) {
            console.error("Could not find protocol to duplicate with ID:", protocolId);
            return;
        }
    
        const newProtocolStructure = JSON.parse(JSON.stringify(protocolToDuplicate.protocol));
    
        let newName = `Copy of ${protocolToDuplicate.name}`;
        let nameCounter = 1;
        while (protocols.some(p => p.name === newName)) {
            nameCounter++;
            newName = `Copy of ${protocolToDuplicate.name} (${nameCounter})`;
        }
    
        const newProtocol: Protocol = {
            id: `proto-${Date.now()}`,
            name: newName,
            description: protocolToDuplicate.description,
            protocol: newProtocolStructure,
        };
    
        setProtocols(prev => [...prev, newProtocol]);
    };

    const handleAddNewTemplate = (template: UserTemplate) => {
        setUserTemplates(prev => [...prev, template]);
    };

    const handleUpdateTemplate = (updatedTemplate: UserTemplate) => {
        setUserTemplates(prev => prev.map(a => a.id === updatedTemplate.id ? updatedTemplate : a));
    };
    
    const handleDeleteTemplate = (templateId: string) => {
        setUserTemplates(prev => prev.filter(a => a.id !== templateId));
    };

    const handleStartExperiment = (name: string, coreStatements: string, societyId: string, protocolId: string, config: ExperimentConfig, roleAssignmentConfig: RoleAssignmentConfig) => {
        const protocol = protocols.find(p => p.id === protocolId);
        const society = societies.find(s => s.id === societyId);

        if (!protocol || !society || society.members.length === 0) {
          console.error("Attempted to start experiment with invalid protocol, society ID, or an empty society.");
          return;
        }
        
        const memberIds = society.members.map(m => m.id);
        const initialRoles: Record<string, string[]> = Object.fromEntries(memberIds.map(id => [id, []]));

        if (roleAssignmentConfig.mode === 'manual') {
            const assignments = roleAssignmentConfig.assignments;
            society.members.forEach(member => {
                const memberTemplate = member.profile.templateName;
                if (memberTemplate) {
                    Object.entries(assignments).forEach(([roleId, templateName]) => {
                        if (memberTemplate === templateName) {
                            if (!initialRoles[member.id].includes(roleId)) {
                                initialRoles[member.id].push(roleId);
                            }
                        }
                    });
                }
            });
        } else { // Automatic mode with new guarantees
            const assignments = roleAssignmentConfig.assignments;
            const sortedRoles = Object.entries(assignments).sort(([, a], [, b]) => a - b);
            
            // 1. Assign roles based on percentages, starting from smallest percentage
            sortedRoles.forEach(([roleId, percentage]) => {
                const targetCount = Math.ceil((percentage / 100) * society.members.length);
                const shuffledMembers = [...society.members].sort(() => 0.5 - Math.random());
                const membersToAssign = shuffledMembers.slice(0, targetCount);

                membersToAssign.forEach(member => {
                    if (!initialRoles[member.id].includes(roleId)) {
                        initialRoles[member.id].push(roleId);
                    }
                });
            });

            // 2. Ensure every member has at least one role
            const unassignedMemberIds = memberIds.filter(id => initialRoles[id].length === 0);
            if (unassignedMemberIds.length > 0) {
                // Find the role with the highest percentage to assign to unassigned members
                const mostPopularRole = Object.entries(assignments).sort(([, a], [, b]) => b - a)[0]?.[0];
                if (mostPopularRole) {
                    unassignedMemberIds.forEach(memberId => {
                        initialRoles[memberId].push(mostPopularRole);
                    });
                }
            }
        }

        const systemicRoleCount = protocol.protocol.roles.filter(r => r.type === 'systemic').length;
        const totalActionsToday = memberIds.length + systemicRoleCount;

        const newExperiment: Experiment = {
            id: `exp-${Date.now()}`, name, societyId, protocolId, status: 'Running', memberIds,
            coreStatements: coreStatements.split('\n').filter(s => s.trim() !== ''),
            laws: [], proposals: [],
            eventLog: [{
                id: `evt-${Date.now()}`, day: 0,
                text: `Experiment '${name}' started using protocol '${protocol.name}'.`,
                type: EventType.ExperimentStarted
            }],
            currentDay: 1, nextDayTimestamp: Date.now(), roles: initialRoles, performance: {},
            config, totalActionsToday, completedActionsToday: 0, dailyActivity: {},
            turnState: { round: 1, phase: 'action', actorIndex: 0 },
        };
        
        setExperiments(prev => [...prev.map(e => e.status === 'Running' ? ({ ...e, status: 'Paused' as const }) : e), newExperiment]);
        setInitialExperimentId(newExperiment.id);
  };


  const renderPage = () => {
    switch (page) {
      case Page.Society:
        return <SocietyPage 
            societies={societies} 
            experiments={experiments} 
            userTemplates={userTemplates}
            onAddSociety={handleAddSociety} 
            onUpdateSociety={handleUpdateSociety} 
            onDeleteSociety={handleDeleteSociety}
            onAddTemplate={handleAddNewTemplate}
            onUpdateTemplate={handleUpdateTemplate}
            onDeleteTemplate={handleDeleteTemplate} 
            setPage={setPage} 
            navigateToExperiment={navigateToExperiment} 
            navigateToDesignerWithSociety={(societyId) => {
                setInitialSocietyId(societyId);
                setInitialLawView('experiments');
                setPage(Page.Law);
            }} 
            initialSocietyId={initialSocietyId} 
            clearInitialSocietyId={() => setInitialSocietyId(null)} 
        />;
      case Page.Law:
        return <LawPage 
                    experiments={experiments} 
                    setExperiments={setExperiments} 
                    societies={societies}
                    protocols={protocols}
                    onDeleteProtocol={handleDeleteProtocol}
                    onDuplicateProtocol={handleDuplicateProtocol}
                    onStartExperiment={handleStartExperiment}
                    setPage={setPage} 
                    navigateToDesigner={navigateToDesigner}
                    navigateToDesignerForEdit={navigateToDesignerForEdit}
                    navigateToExperiment={navigateToExperiment}
                    initialExperimentId={initialExperimentId} 
                    clearInitialExperimentId={() => setInitialExperimentId(null)} 
                    navigateToSociety={navigateToSociety}
                    initialView={initialLawView}
                    clearInitialView={() => setInitialLawView('landing')}
                />;
      case Page.ExperimentDesigner:
        return <ExperimentDesignerPage 
                    onStartGeneration={handleStartProtocolGeneration}
                    onCancel={() => {
                        setProtocolToEdit(null);
                        setInitialLawView('protocols');
                        setPage(Page.Law);
                    }}
                    protocolToEdit={protocolToEdit}
                    onUpdateProtocol={handleUpdateProtocol}
                />;
      case Page.Home:
      default:
        return <HomePage setPage={setPage} />;
    }
  };

  const NavButton = ({ targetPage, icon, label }: { targetPage: Page, icon: React.ReactNode, label: string}) => (
      <button
          onClick={() => setPage(targetPage)}
          className={`flex flex-col sm:flex-row items-center font-semibold space-x-0 sm:space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
              page === targetPage
              ? 'bg-brand-accent text-brand-blue shadow-md'
              : 'text-brand-light hover:bg-brand-accent/80 hover:text-brand-blue'
          }`}
      >
          {icon}
          <span className="text-xs sm:text-sm mt-1 sm:mt-0">{label}</span>
      </button>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {page !== Page.Home && (
          <header className="bg-brand-secondary/80 backdrop-blur-sm sticky top-0 z-40 shadow-md">
              <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                      <div className="flex items-center">
                          <span className="font-bold text-xl text-brand-text">AI Constitution</span>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-4">
                        <NavButton targetPage={Page.Home} icon={<HomeIcon className="h-5 w-5" />} label="Home" />
                        <NavButton targetPage={Page.Society} icon={<UsersIcon className="h-5 w-5" />} label="Societies" />
                        <NavButton targetPage={Page.Law} icon={<GavelIcon className="h-5 w-5" />} label="Law" />
                      </div>
                  </div>
              </nav>
          </header>
      )}
      <main className="flex-grow">{renderPage()}</main>
    </div>
  );
};

export default App;