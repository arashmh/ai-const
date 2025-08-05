import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Experiment, Member, Page, EventType, Proposal, Comment, Society, Protocol, ExperimentConfig, Role, Task, RoleAssignmentConfig, EventLogEntry } from '../types';
import { GavelIcon, PlusCircleIcon, CheckCircleIcon, ThumbsUpIcon, MessageSquareIcon, FileTextIcon, UsersIcon, PlayIcon, PauseIcon, SquareIcon, ChevronLeftIcon, ClockIcon, ArrowRightIcon, Trash2Icon, ThumbsDownIcon, EditIcon, GitForkIcon, BookTextIcon, BotIcon, AlertTriangleIcon } from '../components/icons';
import { MemberTooltipProvider } from '../components/MemberTooltipProvider';

// #region SHARED COMPONENTS
const ControlButton: React.FC<{ onClick: () => void, children: React.ReactNode, className: string, disabled?: boolean }> = ({ onClick, children, className, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors ${className}`}
    >
        {children}
    </button>
);

const StatusBadge: React.FC<{ status: Experiment['status'] }> = ({ status }) => {
    const styles: Record<Experiment['status'], string> = {
        'Running': 'bg-green-500/20 text-green-300 animate-pulse',
        'Paused': 'bg-yellow-500/20 text-yellow-400',
        'Completed': 'bg-brand-light/20 text-brand-light',
        'Setting Up': 'bg-blue-500/20 text-brand-blue',
    };
    return <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${styles[status]}`}>{status}</span>
}
// #endregion

// #region PROTOCOL VIEW COMPONENTS
const ProtocolCard: React.FC<{ protocol: Protocol, experiments: Experiment[], onSelect: () => void, onDelete: () => void, onDuplicate: () => void, onSelectExperiment: (id: string) => void }> = ({ protocol, experiments, onSelect, onDelete, onDuplicate, onSelectExperiment }) => {
    
    if (protocol.status === 'generating') {
        return (
            <div className="bg-brand-secondary rounded-lg shadow-lg border border-brand-accent/30 flex flex-col group relative overflow-hidden">
                <div className="absolute inset-0 bg-brand-primary/50 animate-pulse z-0"></div>
                <div className="p-5 flex-grow z-10 flex flex-col">
                    <h3 className="text-xl font-bold text-brand-text mb-2">{protocol.name}</h3>
                    <div className="flex-grow flex flex-col items-center justify-center text-center my-4">
                        <BotIcon className="h-10 w-10 text-brand-blue animate-pulse-fast" />
                        <span className="mt-3 font-semibold text-brand-blue text-lg">Generating...</span>
                        <p className="text-sm text-brand-light italic mt-1">
                            AI is building this protocol.
                        </p>
                    </div>
                </div>
                <div className="bg-brand-primary/80 p-3 mt-auto z-10">
                    <div className="w-full text-center font-semibold text-brand-light/50 flex items-center justify-center cursor-not-allowed">
                        Building in progress
                    </div>
                </div>
            </div>
        );
    }
    
    if (protocol.status === 'error') {
         return (
            <div className="bg-red-900/40 rounded-lg shadow-lg border border-red-500/50 flex flex-col group relative">
                <div className="p-5 flex-grow z-10 flex flex-col">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-red-300 mb-2">{protocol.name}</h3>
                         <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1.5 rounded-full bg-red-500/50 text-white hover:bg-red-500"
                            aria-label={`Delete protocol ${protocol.name}`}
                            title="Delete"
                        >
                            <Trash2Icon className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex-grow flex flex-col items-center justify-center text-center my-4">
                        <AlertTriangleIcon className="h-10 w-10 text-red-400" />
                        <span className="mt-3 font-semibold text-red-300 text-lg">Generation Failed</span>
                        <p className="text-sm text-red-300/80 italic mt-1">
                            {protocol.errorMessage || 'An unknown error occurred.'}
                        </p>
                    </div>
                </div>
                <div className="bg-red-900/50 p-3 mt-auto z-10">
                    <div className="w-full text-center font-semibold text-red-300/60 flex items-center justify-center cursor-not-allowed">
                        Please delete and try again
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-brand-secondary rounded-lg shadow-lg border border-brand-accent/30 flex flex-col group transition-all duration-300 hover:border-brand-blue/50 hover:shadow-2xl">
            <div className="p-5 flex-grow relative cursor-pointer" onClick={onSelect}>
                <div className="absolute top-2 right-2 flex items-center space-x-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                        className="p-1.5 rounded-full bg-brand-accent/50 text-brand-light hover:bg-brand-blue hover:text-brand-primary"
                        aria-label={`Duplicate protocol ${protocol.name}`}
                        title="Duplicate"
                    >
                        <GitForkIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 rounded-full bg-brand-accent/50 text-brand-light hover:bg-brand-red hover:text-white"
                        aria-label={`Delete protocol ${protocol.name}`}
                        title="Delete"
                    >
                        <Trash2Icon className="h-4 w-4" />
                    </button>
                </div>
                <h3 className="text-xl font-bold text-brand-text mb-2 pr-8">{protocol.name}</h3>
                <p className="text-xs text-brand-light mb-4 h-16 overflow-hidden">{protocol.description}</p>
                <div className="grid grid-cols-3 text-center text-sm">
                    <div><div className="font-bold text-lg text-brand-text">{protocol.protocol.roles.length}</div><div className="text-brand-light text-xs">Roles</div></div>
                    <div><div className="font-bold text-lg text-brand-text">{protocol.protocol.tasks.length}</div><div className="text-brand-light text-xs">Tasks</div></div>
                    <div><div className="font-bold text-lg text-brand-text">{protocol.protocol.tools.length}</div><div className="text-brand-light text-xs">Tools</div></div>
                </div>
                {experiments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-brand-accent/50">
                        <h4 className="text-xs font-semibold text-brand-light mb-2">Used by experiments:</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {experiments.map(exp => (
                                <button
                                    key={exp.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectExperiment(exp.id);
                                    }}
                                    className="text-xs bg-brand-primary text-brand-blue font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 hover:bg-brand-blue hover:text-brand-primary transition-colors cursor-pointer"
                                    title={`View experiment: ${exp.name}`}
                                >
                                    <GavelIcon className="h-3 w-3" />
                                    <span>{exp.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="bg-brand-primary/50 p-3 mt-auto">
                <div onClick={onSelect} className="w-full text-center font-semibold text-brand-blue group-hover:text-white transition-colors flex items-center justify-center cursor-pointer">
                    View Details <ArrowRightIcon className="h-4 w-4 ml-2" />
                </div>
            </div>
        </div>
    );
};

const ProtocolDetailView: React.FC<{ protocol: Protocol, onBack: () => void, experiments: Experiment[], onModify: () => void }> = ({ protocol, onBack, experiments, onModify }) => {
    const { roles, flow, tasks, tools, states } = protocol.protocol;
    const isModifiable = experiments.length === 0;

    const tasksByRole = useMemo(() => {
        const grouped = new Map<string, Task[]>();
        roles.forEach(role => grouped.set(role.id, []));
        tasks.forEach(task => {
            if (grouped.has(task.roleId)) {
                grouped.get(task.roleId)!.push(task);
            }
        });
        return grouped;
    }, [roles, tasks]);

    const getToolName = (toolId: string) => tools.find(t => t.id === toolId)?.name || 'Unknown Tool';
    const getStateName = (stateId: string) => states.find(s => s.id === stateId)?.name || 'Unknown State';

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <button onClick={onBack} className="flex items-center text-brand-light hover:text-brand-text transition-colors font-semibold">
                    <ChevronLeftIcon className="h-5 w-5 mr-1"/>
                    Back to All Protocols
                </button>
            </div>
            <div className="mb-8 flex justify-between items-start flex-col sm:flex-row gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-brand-text">{protocol.name}</h1>
                    <p className="mt-1 text-lg text-brand-light max-w-4xl">{protocol.description}</p>
                </div>
                <button
                    onClick={onModify}
                    disabled={!isModifiable}
                    title={isModifiable ? "Modify this protocol" : "Cannot modify a protocol that is in use by an experiment."}
                    className="flex items-center bg-orange-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:bg-brand-accent/50 disabled:cursor-not-allowed disabled:scale-100 flex-shrink-0"
                >
                    <EditIcon className="h-5 w-5 mr-2" />
                    Modify Protocol
                </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-brand-primary/30 p-6 rounded-lg border border-brand-accent/30">
                        <h3 className="text-xl font-semibold text-brand-text mb-4">Roles</h3>
                        {roles.map(role => (
                            <div key={role.id} className="bg-brand-secondary p-3 rounded-md mb-2">
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold text-brand-text">{role.name}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${role.type === 'systemic' ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'}`}>{role.type}</span>
                                </div>
                                <p className="text-xs text-brand-light">{role.description}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-brand-primary/30 p-6 rounded-lg border border-brand-accent/30">
                        <h3 className="text-xl font-semibold text-brand-text mb-4">High-Level Flow</h3>
                        <p className="text-brand-light whitespace-pre-wrap">{flow || 'No high-level flow description provided.'}</p>
                    </div>
                </div>
                <div className="lg:col-span-2 bg-brand-primary/30 p-6 rounded-lg border border-brand-accent/30">
                    <h3 className="text-xl font-semibold text-brand-text mb-4">Tasks</h3>
                    <div className="space-y-6">
                        {Array.from(tasksByRole.entries()).map(([roleId, roleTasks]) => {
                            const role = roles.find(r => r.id === roleId);
                            if (!role) return null;
                            return (
                                <div key={roleId}>
                                    <h4 className="font-bold text-lg text-brand-text mb-2">{role.name}'s Tasks</h4>
                                    {roleTasks.length > 0 ? (
                                        <div className="space-y-2">
                                            {roleTasks.map(task => (
                                                <div key={task.id} className="bg-brand-secondary p-3 rounded-md">
                                                    <p className="font-semibold text-brand-text mb-1">{task.description}</p>
                                                    <div className="flex items-center text-xs space-x-2 text-brand-light">
                                                        <span>Tool: <span className="font-semibold text-brand-blue">{getToolName(task.toolId)}</span></span>
                                                        <span>&bull;</span>
                                                        <span>Target: <span className="font-semibold text-brand-blue">{task.target.entity} in state "{getStateName(task.target.statusId)}"</span></span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-brand-light">No tasks defined for this role.</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};


const ProtocolsView: React.FC<{
  protocols: Protocol[];
  experiments: Experiment[];
  onDeleteProtocol: (id: string) => void;
  onDuplicateProtocol: (id: string) => void;
  navigateToDesigner: () => void;
  navigateToDesignerForEdit: (protocol: Protocol) => void;
  navigateToExperiment: (id: string) => void;
  onBack: () => void;
}> = ({ protocols, experiments, onDeleteProtocol, onDuplicateProtocol, navigateToDesigner, navigateToDesignerForEdit, navigateToExperiment, onBack }) => {
    const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);

    const associatedExperimentsForSelected = useMemo(() => {
        if (!selectedProtocol) return [];
        return experiments.filter(e => e.protocolId === selectedProtocol.id);
    }, [selectedProtocol, experiments]);

    const sortedProtocols = useMemo(() => {
        return [...protocols].sort((a, b) => {
            const getStatusValue = (status?: string) => {
                if (status === 'generating') return 0;
                if (status === 'error') return 1;
                return 2;
            }
            const statusA = getStatusValue(a.status);
            const statusB = getStatusValue(b.status);
            if (statusA !== statusB) return statusA - statusB;

            return b.id.localeCompare(a.id);
        });
    }, [protocols]);


    if (selectedProtocol) {
        return <ProtocolDetailView 
            protocol={selectedProtocol} 
            onBack={() => setSelectedProtocol(null)}
            experiments={associatedExperimentsForSelected}
            onModify={() => navigateToDesignerForEdit(selectedProtocol)}
        />;
    }

    return (
        <div className="animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <button onClick={onBack} className="flex items-center text-brand-light hover:text-brand-text transition-colors font-semibold mb-2">
                        <ChevronLeftIcon className="h-5 w-5 mr-1"/>
                        Back
                    </button>
                    <h1 className="text-4xl font-bold text-brand-text">Protocols</h1>
                    <p className="mt-1 text-lg text-brand-light">Manage the rule systems for your experiments.</p>
                </div>
                <button onClick={navigateToDesigner} className="flex items-center justify-center bg-brand-accent text-brand-blue font-bold py-3 px-5 text-base rounded-lg transition-colors shadow-md hover:shadow-lg hover:bg-brand-light hover:text-brand-primary">
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    Create New Protocol
                </button>
            </div>
            {protocols.length === 0 ? (
                <div className="text-center py-20 bg-brand-secondary rounded-lg border-2 border-dashed border-brand-accent">
                    <BookTextIcon className="mx-auto h-12 w-12 text-brand-accent" />
                    <h3 className="mt-4 text-xl font-semibold text-brand-text">No Protocols Created</h3>
                    <p className="mt-1 text-brand-light">Create a protocol to define the rules of governance for your experiments.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedProtocols.map(p => {
                        const associatedExperiments = experiments.filter(e => e.protocolId === p.id);
                        return <ProtocolCard 
                            key={p.id} 
                            protocol={p} 
                            experiments={associatedExperiments}
                            onSelect={() => setSelectedProtocol(p)} 
                            onDelete={() => onDeleteProtocol(p.id)} 
                            onDuplicate={() => onDuplicateProtocol(p.id)}
                            onSelectExperiment={navigateToExperiment}
                        />
                    })}
                </div>
            )}
        </div>
    );
};
// #endregion

// #region EXPERIMENT VIEW COMPONENTS
const ProposalCard: React.FC<{ proposal: Proposal; members: Member[]; protocol: Protocol | undefined }> = ({ proposal, members, protocol }) => {
    const author = members.find(m => m.id === proposal.authorId);
    const proposalState = protocol?.protocol.states.find(s => s.id === proposal.status);
    
    return (
        <details className="bg-brand-primary/50 rounded-lg p-4 group">
            <summary className="cursor-pointer list-none">
                <div className="flex justify-between items-start">
                    <div className="pr-4">
                        <h4 className="font-semibold text-brand-text group-hover:text-brand-blue">{proposal.title}</h4>
                        <p className="text-xs text-brand-light">by {author ? <MemberTooltipProvider member={author}>{author.name}</MemberTooltipProvider> : 'Unknown'} on Day {proposal.creationDay}</p>
                        {proposalState && <span className="text-xs mt-1 inline-block bg-brand-accent/40 text-brand-text px-2 py-0.5 rounded-full">{proposalState.name}</span>}
                    </div>
                    <div className="flex items-center space-x-3 text-xs flex-shrink-0">
                         <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                            <span className="flex items-center space-x-1 text-brand-green" title={`${proposal.upvotes.length} Upvotes`}><ThumbsUpIcon className="h-4 w-4" /><span>{proposal.upvotes.length}</span></span>
                            <span className="flex items-center space-x-1 text-brand-red" title={`${proposal.downvotes.length} Downvotes`}><ThumbsDownIcon className="h-4 w-4" /><span>{proposal.downvotes.length}</span></span>
                            <span className="flex items-center space-x-1 text-yellow-400" title={`${proposal.comments.filter(c => c.intent === 'Modification').length} Suggestions`}><EditIcon className="h-4 w-4" /><span>{proposal.comments.filter(c => c.intent === 'Modification').length}</span></span>
                            <span className="flex items-center space-x-1 text-brand-light" title={`${proposal.comments.length} Total Comments`}><MessageSquareIcon className="h-4 w-4" /><span>{proposal.comments.length}</span></span>
                        </div>
                         <span className="text-brand-light group-open:rotate-90 transform transition-transform duration-200">&#9656;</span>
                    </div>
                </div>
            </summary>
            <div className="mt-4 pt-3 border-t border-brand-accent/50 space-y-4">
                {proposal.issueStatement && <div><h5 className="font-semibold text-sm text-brand-light mb-1">Reasoning</h5><p className="text-sm text-brand-text">{proposal.issueStatement}</p></div>}
                {proposal.draftText && <div><h5 className="font-semibold text-sm text-brand-light mb-1">Proposal Text</h5><blockquote className="text-sm text-brand-text border-l-4 border-brand-accent pl-4 py-2 bg-brand-primary/30 rounded-r-md">{proposal.draftText}</blockquote></div>}
                {proposal.comments.length > 0 && <div><h5 className="font-semibold text-sm text-brand-light mb-2">Comments</h5>
                    <div className="space-y-3">{proposal.comments.map((c, i) => { const commenter = members.find(m => m.id === c.commenterId); return <div key={i} className="bg-brand-primary/50 p-3 rounded-md"><p className="font-bold text-xs text-brand-light">{commenter ? <MemberTooltipProvider member={commenter}>{commenter.name}</MemberTooltipProvider> : 'Unknown'}</p><p className="text-sm text-brand-text">{c.comment}</p></div>; })}</div>
                </div>}
            </div>
        </details>
    );
};

const ProposalColumn: React.FC<{ title: string; proposals: Proposal[]; members: Member[]; protocol: Protocol | undefined; icon: React.ReactNode; }> = ({ title, proposals, members, protocol, icon }) => (
    <div className="bg-brand-secondary/80 rounded-lg p-4 flex-1 min-w-[300px]">
        <h3 className="font-bold text-xl mb-4 text-brand-text flex items-center">{icon}<span className="ml-2">{title} ({proposals.length})</span></h3>
        <div className="space-y-3 h-96 overflow-y-auto pr-2">
            {proposals.length > 0 ? proposals.map(p => <ProposalCard key={p.id} proposal={p} members={members} protocol={protocol} />) : <p className="text-center text-brand-light text-sm pt-4">No proposals.</p>}
        </div>
    </div>
);

const DayProgressionDisplay: React.FC<{ experiment: Experiment }> = ({ experiment }) => {
    const progress = experiment.totalActionsToday > 0 ? (experiment.completedActionsToday / experiment.totalActionsToday) * 100 : 0;
    const isDayOver = experiment.completedActionsToday >= experiment.totalActionsToday && experiment.totalActionsToday > 0;
    return (
        <div>
            <div className="flex justify-between items-baseline mb-1"><span className="font-semibold text-brand-text">Day Progression</span><span className="text-xs font-mono text-brand-light">{experiment.completedActionsToday} / {experiment.totalActionsToday} Actions</span></div>
            <div className="w-full bg-brand-primary rounded-full h-2.5 mb-2"><div className={`h-2.5 rounded-full ${experiment.status === 'Running' ? 'bg-brand-blue' : 'bg-brand-accent'}`} style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div></div>
            <div className="flex justify-between items-center text-xs text-brand-light"><span><ClockIcon className="inline h-3 w-3 mr-1" />{isDayOver ? "Day Complete" : "In Progress"}</span><span>Day {experiment.currentDay} / {experiment.config.maxExperimentDays}</span></div>
        </div>
    );
};

const RoleDisplay: React.FC<{ roleId: string; protocol?: Protocol['protocol'] }> = ({ roleId, protocol }) => {
    const roleDef = protocol?.roles.find(r => r.id === roleId);
    return <span className="font-semibold bg-brand-light/20 text-brand-light px-2 py-0.5 rounded-full text-xs">{roleDef?.name || roleId}</span>
};

const ExperimentDetailView: React.FC<{
    experiment: Experiment;
    society: Society;
    protocol?: Protocol;
    onBack: () => void;
    setExperiments: React.Dispatch<React.SetStateAction<Experiment[]>>;
    navigateToSociety: (id: string) => void;
}> = ({ experiment, society, protocol, onBack, setExperiments, navigateToSociety }) => {
    const eventLogRef = useRef<HTMLDivElement>(null);
    useEffect(() => { eventLogRef.current?.scrollTo(0, eventLogRef.current.scrollHeight); }, [experiment.eventLog]);
    
    const handleControlClick = (status: 'Paused' | 'Running' | 'Completed') => {
        setExperiments(prev => prev.map(e => {
            if (e.id === experiment.id) {
                if (status === 'Running') return { ...e, status, nextDayTimestamp: Date.now() };
                return { ...e, status };
            }
            if (status === 'Running' && e.status === 'Running') return { ...e, status: 'Paused' };
            return e;
        }));
    };

    const getLogMessage = (log: EventLogEntry) => {
        const member = society.members.find(m => m.id === log.memberId);
        const actorName = member ? <MemberTooltipProvider member={member}>{member.name}</MemberTooltipProvider> : (protocol?.protocol.roles.find(r => r.id === log.memberId)?.name || 'System');
        return <p key={log.id}><span className="text-brand-accent/80">[Day {log.day}]</span> {actorName} {log.text}</p>;
    }

    const proposalsByState = useMemo(() => {
        const map = new Map<string, Proposal[]>();
        if (!protocol) return map;

        protocol.protocol.states.forEach(state => map.set(state.id, []));

        experiment.proposals.forEach(proposal => {
            if (map.has(proposal.status)) {
                map.get(proposal.status)!.push(proposal);
            }
        });
        
        return map;
    }, [experiment.proposals, protocol]);

    return (
        <div className="max-w-screen-2xl mx-auto animate-fade-in">
            <div className="mb-6"><button onClick={onBack} className="flex items-center text-brand-light hover:text-brand-text font-semibold"><ChevronLeftIcon className="h-5 w-5 mr-1"/>Back to All Experiments</button></div>
            <div className="space-y-6">
                 <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="bg-brand-secondary p-6 rounded-lg shadow-lg">
                        <h3 className="font-bold text-xl mb-1 text-brand-text">{experiment.name}</h3>
                        <div className="flex items-center gap-4 mb-4 text-sm">
                            <button onClick={() => navigateToSociety(society.id)} className="bg-brand-accent/70 text-brand-text hover:bg-brand-accent px-3 py-1 rounded-full font-semibold transition-colors shadow-sm">Society: {society.name}</button>
                            <span className="text-brand-light">Protocol: {protocol?.name || 'Unknown'}</span>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center"><span className="text-brand-light">Status:</span><StatusBadge status={experiment.status} /></div>
                            <div className="flex justify-between"><span className="text-brand-light">Members:</span><span className="font-bold text-brand-text">{experiment.memberIds.length}</span></div>
                            <div className="border-t border-brand-accent/50 my-3"></div>
                            <DayProgressionDisplay experiment={experiment} />
                        </div>
                        <div className="border-t border-brand-accent/50 mt-4 pt-4 flex items-center justify-end space-x-2">
                           {experiment.status === 'Running' && <ControlButton onClick={() => handleControlClick('Paused')} className="bg-yellow-500/80 hover:bg-yellow-500/100 text-white"><PauseIcon className="h-4 w-4" /><span>Pause</span></ControlButton>}
                           {experiment.status === 'Paused' && <ControlButton onClick={() => handleControlClick('Running')} className="bg-green-500/80 hover:bg-green-500/100 text-white"><PlayIcon className="h-4 w-4" /><span>Resume</span></ControlButton>}
                           {experiment.status !== 'Completed' && <ControlButton onClick={() => handleControlClick('Completed')} className="bg-red-500/80 hover:bg-red-500/100 text-white"><SquareIcon className="h-4 w-4" /><span>Stop</span></ControlButton>}
                        </div>
                    </div>
                    <div className="bg-brand-secondary p-6 rounded-lg shadow-lg"><h3 className="font-bold text-xl mb-4 text-brand-text">Participants & Roles</h3>
                        <ul className="space-y-3 max-h-48 overflow-y-auto pr-2 text-sm">{experiment.memberIds.map(id => {
                            const member = society.members.find(m => m.id === id);
                            const roleIds = experiment.roles[id] || [];
                            if (!member) return null;
                            return (
                                <li key={id} className="flex items-center justify-between">
                                    <span className="text-brand-text"><MemberTooltipProvider member={member}>{member.name}</MemberTooltipProvider></span>
                                    <div className="flex flex-wrap gap-1 justify-end">{roleIds.map(roleId => <RoleDisplay key={roleId} roleId={roleId} protocol={protocol?.protocol} />)}</div>
                                </li>
                            );
                        })}</ul>
                    </div>
                     <div className="bg-brand-secondary p-6 rounded-lg shadow-lg"><h3 className="font-bold text-xl mb-4 text-brand-text">Ratified Laws ({experiment.laws.length})</h3>
                        <ul className="space-y-3 max-h-48 overflow-y-auto pr-2">{experiment.laws.length > 0 ? experiment.laws.map(law => (<li key={law.id} className="flex items-start space-x-3 text-sm"><CheckCircleIcon className="h-5 w-5 text-brand-green mt-0.5"/><span className="text-brand-text">{law.text}</span></li>)) : <p className="text-brand-light">No laws ratified.</p>}</ul>
                    </div>
                </div>
                 <div className="bg-brand-secondary p-4 rounded-lg shadow-lg">
                    <h3 className="font-bold text-xl mb-2 text-brand-text">Live Event Log</h3>
                    <div ref={eventLogRef} className="h-48 bg-brand-primary/50 p-3 rounded text-xs font-mono text-brand-light overflow-y-scroll space-y-1">{experiment.eventLog.slice(-100).map(log => getLogMessage(log))}</div>
                </div>
                 <div className="flex gap-4 overflow-x-auto pb-4">
                    {protocol && Array.from(proposalsByState.entries()).map(([stateId, proposals]) => {
                        const state = protocol.protocol.states.find(s => s.id === stateId);
                        if (!state) return null;
                        return <ProposalColumn key={stateId} title={state.name} proposals={proposals} members={society.members} protocol={protocol} icon={<FileTextIcon className="h-5 w-5"/>}/>
                    })}
                </div>
            </div>
        </div>
    )
};

const StartExperimentModal: React.FC<{
    societies: Society[];
    protocols: Protocol[];
    onCancel: () => void;
    onStart: (
        name: string,
        coreStatements: string,
        societyId: string,
        protocolId: string,
        config: ExperimentConfig,
        roleAssignmentConfig: RoleAssignmentConfig
    ) => void;
}> = ({ societies, protocols, onCancel, onStart }) => {
    const [name, setName] = useState('');
    const [coreStatements, setCoreStatements] = useState('The purpose of this society is to ensure peace, justice, and liberty.\nAll laws must respect the fundamental rights and dignity of its members.');
    const [societyId, setSocietyId] = useState(societies[0]?.id || '');
    const [protocolId, setProtocolId] = useState('');
    const [config, setConfig] = useState<ExperimentConfig>({ model: 'gemini-2.5-flash', actionDelaySeconds: 2, maxExperimentDays: 14 });
    
    const [assignmentMode, setAssignmentMode] = useState<'manual' | 'automatic'>('automatic');
    const [manualAssignments, setManualAssignments] = useState<Record<string, string>>({});
    const [autoAssignments, setAutoAssignments] = useState<Record<string, number>>({});

    const availableProtocols = useMemo(() => protocols.filter(p => !p.status), [protocols]);

    const selectedSociety = useMemo(() => societies.find(s => s.id === societyId), [societyId, societies]);
    const selectedProtocol = useMemo(() => availableProtocols.find(p => p.id === protocolId), [protocolId, availableProtocols]);

    const memberTemplatesInSociety = useMemo(() => {
        if (!selectedSociety) return [];
        return Array.from(new Set(selectedSociety.members.map(m => m.profile.templateName).filter(Boolean))) as string[];
    }, [selectedSociety]);
    
    const memberRoles = useMemo(() => {
        return selectedProtocol?.protocol.roles.filter(r => r.type === 'member') || [];
    }, [selectedProtocol]);

    useEffect(() => {
        if (!protocolId && availableProtocols.length > 0) {
            setProtocolId(availableProtocols[0].id);
        }
    }, [availableProtocols, protocolId]);
    
    useEffect(() => {
        // This effect now correctly initializes the automatic assignments.
        setManualAssignments({});
        if (memberRoles.length > 0) {
            const initialValue = 100 / memberRoles.length;
            const newAssignments = memberRoles.reduce((acc, role) => {
                acc[role.id] = initialValue;
                return acc;
            }, {} as Record<string, number>);
            setAutoAssignments(newAssignments);
        } else {
            setAutoAssignments({});
        }
    }, [societyId, protocolId, memberRoles]); // Rerun when society or protocol changes

    const handleAutoAssignmentChange = useCallback((key: string, newValue: number) => {
        const clampedNewValue = Math.max(1, Math.min(newValue, 100 - (memberRoles.length - 1)));
        const oldValue = autoAssignments[key];
        const delta = clampedNewValue - oldValue;
        
        const otherKeys = memberRoles.map(r => r.id).filter(k => k !== key);
        const sumOfOtherWeights = otherKeys.reduce((sum, k) => sum + autoAssignments[k], 0);

        const newAssignments = { ...autoAssignments };
        newAssignments[key] = clampedNewValue;
        
        if (sumOfOtherWeights > 0) {
            otherKeys.forEach(k => {
                const proportion = autoAssignments[k] / sumOfOtherWeights;
                newAssignments[k] -= delta * proportion;
                newAssignments[k] = Math.max(1, newAssignments[k]); // Ensure no role drops below 1
            });
        }
        
        // Final normalization to guarantee sum is 100
        const currentSum = Object.values(newAssignments).reduce((a, b) => a + b, 0);
        const factor = 100 / currentSum;
        Object.keys(newAssignments).forEach(k => {
            newAssignments[k] *= factor;
        });

        setAutoAssignments(newAssignments);

    }, [autoAssignments, memberRoles, setAutoAssignments]);

    const handleStart = () => {
        if (!name || !societyId || !protocolId) return;
        const roleAssignmentConfig: RoleAssignmentConfig = assignmentMode === 'manual' 
            ? { mode: 'manual', assignments: manualAssignments }
            : { mode: 'automatic', assignments: autoAssignments };

        onStart(name, coreStatements, societyId, protocolId, config, roleAssignmentConfig);
        onCancel();
    };

    const isReady = name && societyId && protocolId;

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-3xl">
                <div className="p-6 border-b border-brand-accent/50"><h2 className="text-2xl font-bold text-brand-text">Launch New Experiment</h2></div>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <section>
                         <h3 className="text-lg font-semibold text-brand-text mb-2">1. Basic Configuration</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-brand-light mb-1">Experiment Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-blue" placeholder="e.g., 'The Phoenix Project'" /></div>
                             <div><label className="block text-sm font-medium text-brand-light mb-1">Core Statements (one per line)</label><textarea value={coreStatements} onChange={e => setCoreStatements(e.target.value)} rows={3} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-blue" /></div>
                        </div>
                    </section>
                     <section>
                        <h3 className="text-lg font-semibold text-brand-text mb-2">2. Select Society & Protocol</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-brand-light mb-1">Society</label><select value={societyId} onChange={e => setSocietyId(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-blue">{societies.map(s => <option key={s.id} value={s.id}>{s.name} ({s.members.length} members)</option>)}</select></div>
                            <div>
                                <label className="block text-sm font-medium text-brand-light mb-1">Protocol</label>
                                {availableProtocols.length > 0 ? (
                                    <select value={protocolId} onChange={e => setProtocolId(e.target.value)} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-blue">{availableProtocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                ) : (
                                    <div className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-light/70">No available protocols</div>
                                )}
                            </div>
                        </div>
                    </section>
                     {selectedProtocol && selectedSociety && (
                        <section>
                            <h3 className="text-lg font-semibold text-brand-text mb-2">3. Assign Roles</h3>
                            <div className="flex justify-center mb-4"><div className="p-1 bg-brand-primary rounded-lg flex items-center"><button onClick={() => setAssignmentMode('manual')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${assignmentMode === 'manual' ? 'bg-brand-blue text-brand-primary' : 'text-brand-light hover:bg-brand-accent/50'}`}>Manual</button><button onClick={() => setAssignmentMode('automatic')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${assignmentMode === 'automatic' ? 'bg-brand-blue text-brand-primary' : 'text-brand-light hover:bg-brand-accent/50'}`}>Automatic</button></div></div>
                            <div className="bg-brand-primary/50 p-4 rounded-lg">
                                {assignmentMode === 'manual' ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-brand-light mb-1">Map roles from the protocol to member templates in your society. Members without a matching template will not be assigned a specific role.</p>
                                        {memberRoles.map(role => (
                                            <div key={role.id} className="grid grid-cols-3 items-center gap-4"><label htmlFor={`role-${role.id}`} className="text-sm font-medium text-brand-light text-right">{role.name}</label><div className="col-span-2"><select id={`role-${role.id}`} value={manualAssignments[role.id] || ''} onChange={e => setManualAssignments(prev => ({ ...prev, [role.id]: e.target.value }))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-blue"><option value="">-- No specific assignment --</option>{memberTemplatesInSociety.map(templateName => (<option key={templateName} value={templateName}>{templateName}</option>))}</select></div></div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-brand-light mb-1">Set the percentage of the society to be assigned each role. The total will always be 100%.</p>
                                        {memberRoles.map(role => {
                                            const assignmentValue = autoAssignments[role.id] || 0;
                                            const isOnlyRole = memberRoles.length === 1;

                                            return (
                                                <div key={role.id} className="grid grid-cols-12 items-center gap-2">
                                                    <label className="text-sm font-medium text-brand-light col-span-4 truncate text-right">{role.name}</label>
                                                    <div className="col-span-7 flex items-center space-x-2">
                                                        <input 
                                                            type="range"
                                                            min="1" 
                                                            max={100 - (memberRoles.length - 1)} 
                                                            step="0.1"
                                                            value={assignmentValue} 
                                                            onChange={e => handleAutoAssignmentChange(role.id, parseFloat(e.target.value))} 
                                                            className="w-full h-2 bg-brand-primary rounded-lg appearance-none cursor-pointer"
                                                            disabled={isOnlyRole}
                                                        />
                                                    </div>
                                                    <div className="col-span-1 flex items-center justify-end space-x-1">
                                                        <span className="font-mono text-sm text-brand-text w-8 text-right">{assignmentValue.toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        <p className="text-xs text-brand-light mt-2 text-center">A member can have multiple roles. Every member will be assigned to at least one role.</p>
                                    </div>
                                )}
                                {selectedProtocol.protocol.roles.filter(r => r.type === 'systemic').length > 0 && <p className="text-xs text-brand-light mt-4 text-center">Systemic roles like '{selectedProtocol.protocol.roles.find(r=>r.type==='systemic')?.name}' are automated and do not need assignment.</p>}
                            </div>
                        </section>
                    )}
                     <section>
                         <h3 className="text-lg font-semibold text-brand-text mb-2">4. Simulation Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-brand-light mb-1">Max Experiment Days</label><input type="number" value={config.maxExperimentDays} onChange={e => setConfig(c => ({...c, maxExperimentDays: Number(e.target.value) || 14}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-blue" /></div>
                            <div><label className="block text-sm font-medium text-brand-light mb-1">Action Delay (seconds)</label><input type="number" value={config.actionDelaySeconds} onChange={e => setConfig(c => ({...c, actionDelaySeconds: Number(e.target.value) || 2}))} className="w-full bg-brand-primary border border-brand-accent rounded-lg p-2 text-brand-text focus:ring-2 focus:ring-brand-blue" /></div>
                        </div>
                    </section>
                </div>
                <div className="p-4 bg-brand-primary/50 flex justify-between items-center"><button type="button" onClick={onCancel} className="text-brand-light hover:text-white font-semibold">Cancel</button><button onClick={handleStart} disabled={!isReady} className="bg-brand-blue text-brand-primary font-bold py-2 px-6 rounded-lg disabled:bg-brand-accent/50 disabled:cursor-not-allowed">Launch</button></div>
            </div>
        </div>
    );
};


const ExperimentsView: React.FC<{
    experiments: Experiment[];
    societies: Society[];
    protocols: Protocol[];
    setExperiments: React.Dispatch<React.SetStateAction<Experiment[]>>;
    onStartExperiment: (name: string, coreStatements: string, societyId: string, protocolId: string, config: ExperimentConfig, roleAssignmentConfig: RoleAssignmentConfig) => void;
    navigateToSociety: (id: string) => void;
    onBack: () => void;
    navigateToProtocolsView: () => void;
    navigateToSocietiesPage: () => void;
}> = ({ experiments, societies, protocols, setExperiments, onStartExperiment, navigateToSociety, onBack, navigateToProtocolsView, navigateToSocietiesPage }) => {
    const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
    const [showStartModal, setShowStartModal] = useState(false);

    const selectedExperiment = useMemo(() => experiments.find(e => e.id === selectedExperimentId), [experiments, selectedExperimentId]);
    const societyForSelectedExp = useMemo(() => societies.find(s => s.id === selectedExperiment?.societyId), [societies, selectedExperiment]);
    const protocolForSelectedExp = useMemo(() => protocols.find(p => p.id === selectedExperiment?.protocolId), [protocols, selectedExperiment]);

    const handleDeleteExperiment = (expId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this experiment? This action cannot be undone.')) {
            if (selectedExperimentId === expId) setSelectedExperimentId(null);
            setExperiments(prev => prev.filter(e => e.id !== expId));
        }
    };

    const hasSocieties = societies.length > 0;
    const hasAvailableProtocols = protocols.filter(p => !p.status).length > 0;


    if (selectedExperiment && societyForSelectedExp) {
        return <ExperimentDetailView experiment={selectedExperiment} society={societyForSelectedExp} protocol={protocolForSelectedExp} onBack={() => setSelectedExperimentId(null)} setExperiments={setExperiments} navigateToSociety={navigateToSociety} />;
    }

    return (
        <div className="animate-fade-in">
            {showStartModal && <StartExperimentModal societies={societies} protocols={protocols} onCancel={() => setShowStartModal(false)} onStart={onStartExperiment} />}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <button onClick={onBack} className="flex items-center text-brand-light hover:text-brand-text transition-colors font-semibold mb-2"><ChevronLeftIcon className="h-5 w-5 mr-1"/>Back</button>
                <h1 className="text-4xl font-bold text-brand-text">Experiments</h1>
                <p className="mt-1 text-lg text-brand-light">Run simulations and observe the emergence of law.</p>
              </div>
              <button onClick={() => setShowStartModal(true)} disabled={!hasSocieties || !hasAvailableProtocols} className="flex items-center justify-center bg-brand-accent text-brand-blue font-bold py-3 px-5 text-base rounded-lg shadow-md hover:shadow-lg hover:bg-brand-light hover:text-brand-primary disabled:bg-brand-accent/50 disabled:text-brand-light/70 disabled:cursor-not-allowed">
                <PlusCircleIcon className="h-5 w-5 mr-2" />Start New Experiment
              </button>
            </div>
             {!hasSocieties || !hasAvailableProtocols ? (
                <div className="text-center py-10 bg-brand-secondary rounded-lg border-2 border-dashed border-brand-accent">
                    <h3 className="text-xl font-semibold text-brand-text">Prerequisites Missing</h3>
                    <p className="mt-1 text-brand-light">
                        To run an experiment, you need{' '}
                        {!hasSocieties && (
                            <>at least one <button onClick={navigateToSocietiesPage} className="font-bold text-brand-text underline hover:text-brand-blue transition-colors">Society</button></>
                        )}
                        {!hasSocieties && !hasAvailableProtocols && ' and '}
                        {!hasAvailableProtocols && (
                            <>at least one available <button onClick={navigateToProtocolsView} className="font-bold text-brand-text underline hover:text-brand-blue transition-colors">Protocol</button></>
                        )}.
                    </p>
                </div>
            ) : experiments.length === 0 ? (
                <div className="text-center py-20 bg-brand-secondary rounded-lg border-2 border-dashed border-brand-accent">
                    <GavelIcon className="mx-auto h-12 w-12 text-brand-accent" />
                    <h3 className="mt-4 text-xl font-semibold text-brand-text">No Experiments Created</h3>
                    <p className="mt-1 text-brand-light">Start your first constitutional simulation.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...experiments].sort((a,b) => b.id.localeCompare(a.id)).map(exp => {
                         const society = societies.find(s => s.id === exp.societyId);
                         return (
                        <div key={exp.id} className="bg-brand-secondary rounded-lg shadow-lg border border-brand-accent/30 flex flex-col group">
                            <div className="p-5 flex-grow relative">
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteExperiment(exp.id); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-brand-accent/50 text-brand-light hover:bg-brand-red hover:text-white opacity-0 group-hover:opacity-100" aria-label={`Delete experiment ${exp.name}`}><Trash2Icon className="h-4 w-4" /></button>
                                <div className="flex justify-between items-start"><h3 className="text-xl font-bold text-brand-text mb-1 pr-8">{exp.name}</h3><StatusBadge status={exp.status} /></div>
                                <p className="text-xs text-brand-light mb-4">Society: {society?.name || "Unknown"}</p>
                                <div className="flex justify-around text-center text-sm">
                                    <div><div className="font-bold text-2xl text-brand-text">{exp.currentDay}</div><div className="text-brand-light">Day</div></div>
                                    <div><div className="font-bold text-2xl text-brand-text">{exp.memberIds.length}</div><div className="text-brand-light">Members</div></div>
                                    <div><div className="font-bold text-2xl text-brand-text">{exp.laws.length}</div><div className="text-brand-light">Laws</div></div>
                                </div>
                            </div>
                            <div className="bg-brand-primary/50 p-3 mt-4"><button onClick={() => setSelectedExperimentId(exp.id)} className="w-full text-center font-semibold text-brand-blue hover:text-white transition-colors flex items-center justify-center">View Details <ArrowRightIcon className="h-4 w-4 ml-2" /></button></div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};
// #endregion

// #region MAIN PAGE COMPONENT
interface LawPageProps {
  experiments: Experiment[];
  setExperiments: React.Dispatch<React.SetStateAction<Experiment[]>>;
  societies: Society[];
  protocols: Protocol[];
  onDeleteProtocol: (id: string) => void;
  onDuplicateProtocol: (id: string) => void;
  onStartExperiment: (name: string, coreStatements: string, societyId: string, protocolId: string, config: ExperimentConfig, roleAssignmentConfig: RoleAssignmentConfig) => void;
  setPage: (page: Page) => void;
  navigateToDesigner: () => void;
  navigateToDesignerForEdit: (protocol: Protocol) => void;
  navigateToExperiment: (id: string) => void;
  initialExperimentId: string | null;
  clearInitialExperimentId: () => void;
  navigateToSociety: (societyId: string) => void;
  initialView?: 'landing' | 'protocols' | 'experiments';
  clearInitialView?: () => void;
}

const LawPage: React.FC<LawPageProps> = (props) => {
    const [view, setView] = useState<'landing' | 'protocols' | 'experiments'>('landing');

    useEffect(() => {
        if (props.initialExperimentId) {
            setView('experiments');
            // The detail view will pick up the initial ID.
        } else if (props.initialView && props.initialView !== 'landing') {
            setView(props.initialView);
            props.clearInitialView?.();
        }
    }, [props.initialExperimentId, props.initialView, props.clearInitialView]);

    const renderContent = () => {
        switch (view) {
            case 'protocols':
                return <ProtocolsView 
                    protocols={props.protocols} 
                    experiments={props.experiments}
                    onDeleteProtocol={props.onDeleteProtocol} 
                    onDuplicateProtocol={props.onDuplicateProtocol} 
                    navigateToDesigner={props.navigateToDesigner} 
                    navigateToDesignerForEdit={props.navigateToDesignerForEdit}
                    navigateToExperiment={props.navigateToExperiment}
                    onBack={() => setView('landing')} 
                />;
            case 'experiments':
                return <ExperimentsView 
                    experiments={props.experiments} 
                    societies={props.societies} 
                    protocols={props.protocols} 
                    setExperiments={props.setExperiments} 
                    onStartExperiment={props.onStartExperiment} 
                    navigateToSociety={props.navigateToSociety} 
                    onBack={() => setView('landing')}
                    navigateToProtocolsView={() => setView('protocols')}
                    navigateToSocietiesPage={() => props.setPage(Page.Society)}
                />;
            case 'landing':
            default:
                return (
                    <div className="max-w-4xl mx-auto animate-fade-in">
                        <div className="text-center mb-12">
                            <h1 className="text-4xl sm:text-5xl font-bold text-brand-text">Law & Governance</h1>
                            <p className="mt-2 text-lg text-brand-light">Design protocols, run experiments, and observe emergent law.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div onClick={() => setView('protocols')} className="bg-brand-secondary rounded-xl p-8 border border-transparent hover:border-brand-blue cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-2xl">
                                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-brand-blue/20 mx-auto mb-6"><BookTextIcon className="h-8 w-8 text-brand-blue" /></div>
                                <h2 className="text-3xl font-bold text-brand-text mb-3 text-center">Protocols</h2>
                                <p className="text-brand-light mb-6 text-center">Design the fundamental rules of governance: roles, actions, states, and the process flow for legislation.</p>
                                <span className="font-semibold text-brand-blue inline-flex items-center justify-center w-full">Manage Protocols <ArrowRightIcon className="ml-2 h-5 w-5" /></span>
                            </div>
                            <div onClick={() => setView('experiments')} className="bg-brand-secondary rounded-xl p-8 border border-transparent hover:border-brand-blue cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-2xl">
                                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-brand-blue/20 mx-auto mb-6"><GavelIcon className="h-8 w-8 text-brand-blue" /></div>
                                <h2 className="text-3xl font-bold text-brand-text mb-3 text-center">Experiments</h2>
                                <p className="text-brand-light mb-6 text-center">Combine a society with a protocol to launch a simulation. Observe as AI agents interact and create laws.</p>
                                <span className="font-semibold text-brand-blue inline-flex items-center justify-center w-full">Manage Experiments <ArrowRightIcon className="ml-2 h-5 w-5" /></span>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            {renderContent()}
        </div>
    );
};

export default LawPage;